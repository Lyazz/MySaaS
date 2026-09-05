import 'dart:async';
import 'dart:io';

import 'package:admin_app/models/app_mode.dart';
import 'package:admin_app/services/api_service.dart';
import 'package:admin_app/services/database_service.dart';
import 'package:admin_app/services/sync_service.dart';
import 'package:admin_app/services/tenant_mode_service.dart';
import 'package:connectivity_plus_platform_interface/connectivity_plus_platform_interface.dart';
import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

/// Covers the queue's durability guarantees: a write that has been accepted
/// locally must survive a crash, must not be sent before the entity it depends
/// on exists remotely, and must never end up in a state the user cannot escape.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const pathProviderChannel = MethodChannel('plugins.flutter.io/path_provider');
  late Directory tempDbDir;
  late Directory appDocsDir;
  late ApiService api;
  late _FakeConnectivityPlatform connectivity;
  late ConnectivityPlatform originalConnectivityPlatform;
  late DatabaseOpener originalDatabaseOpener;

  final productBodies = <Map<String, dynamic>>[];
  final supplierBodies = <Map<String, dynamic>>[];
  final purchaseBodies = <Map<String, dynamic>>[];
  final orderPatchBodies = <Map<String, dynamic>>[];
  final customerRequests = <String>[];
  final saleBodies = <Map<String, dynamic>>[];
  final cashboxBodies = <Map<String, dynamic>>[];

  /// Cashboxes the fake server considers to have an open session, mirroring
  /// `CashService.requireOpenSession`.
  final openSessionCashboxes = <String>{};
  var productCreateStatus = 200;
  var productCreateUnreachable = false;
  var supplierCreateStatus = 200;
  var supplierCounter = 0;
  var sessionOpenStatus = 200;

  /// Number of times `/admin/products` answers a 409 before succeeding.
  var productRetryConflicts = 0;

  /// Whether that 409 carries the server's RETRY_CONFLICT code.
  var productConflictIsRetryable = true;
  var cashboxCounter = 0;
  Map<String, dynamic> storeSettingsResponse = const {};

  setUpAll(() async {
    sqfliteFfiInit();
    SyncService.disableSupplementalRefreshForTests = true;
    tempDbDir = await Directory.systemTemp.createTemp('sync-recovery-db');
    appDocsDir = await Directory.systemTemp.createTemp('sync-recovery-docs');

    final factory = databaseFactoryFfi;
    originalDatabaseOpener = DatabaseService.databaseOpener;
    DatabaseService.databasesPathProvider = () async => tempDbDir.path;
    DatabaseService.databaseOpener =
        (
          String path, {
          int? version,
          OnDatabaseConfigureFn? onConfigure,
          OnDatabaseCreateFn? onCreate,
          OnDatabaseVersionChangeFn? onUpgrade,
          OnDatabaseVersionChangeFn? onDowngrade,
          OnDatabaseOpenFn? onOpen,
          String? password,
          bool readOnly = false,
          bool singleInstance = true,
        }) {
          return factory.openDatabase(
            path,
            options: OpenDatabaseOptions(
              version: version,
              onConfigure: onConfigure,
              onCreate: onCreate,
              onUpgrade: onUpgrade,
              onDowngrade: onDowngrade,
              onOpen: onOpen,
              readOnly: readOnly,
              singleInstance: singleInstance,
            ),
          );
        };

    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(pathProviderChannel, (call) async {
          return appDocsDir.path;
        });

    originalConnectivityPlatform = ConnectivityPlatform.instance;
    connectivity = _FakeConnectivityPlatform();
    ConnectivityPlatform.instance = connectivity;

    api = ApiService(baseUrl: 'http://localhost:3000/api');
    api.client.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final path = options.path;

          if (path == '/admin/products' && options.method == 'POST') {
            if (productCreateUnreachable) {
              // No response at all — what a captive portal, a dead route or a
              // stopped server actually looks like to Dio.
              handler.reject(
                DioException(
                  requestOptions: options,
                  type: DioExceptionType.connectionError,
                  error: 'Connection refused',
                ),
              );
              return;
            }
            if (productRetryConflicts > 0) {
              productRetryConflicts -= 1;
              handler.reject(
                _error(
                  options,
                  409,
                  productConflictIsRetryable
                      ? 'Inventory conflict, please retry'
                      : 'A product with this slug already exists',
                  code: productConflictIsRetryable ? 'RETRY_CONFLICT' : null,
                ),
              );
              return;
            }
            if (productCreateStatus != 200) {
              handler.reject(
                _error(options, productCreateStatus, 'product rejected'),
              );
              return;
            }
            final body = Map<String, dynamic>.from(options.data as Map);
            productBodies.add(body);
            handler.resolve(
              Response(requestOptions: options, statusCode: 200, data: body),
            );
            return;
          }

          if (path == '/admin/suppliers' && options.method == 'POST') {
            if (supplierCreateStatus != 200) {
              handler.reject(
                _error(options, supplierCreateStatus, 'supplier unavailable'),
              );
              return;
            }
            final body = Map<String, dynamic>.from(options.data as Map);
            supplierBodies.add(body);
            supplierCounter += 1;
            handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 200,
                data: {...body, 'id': 'remote-supplier-$supplierCounter'},
              ),
            );
            return;
          }

          if (path == '/admin/purchases' && options.method == 'POST') {
            final body = Map<String, dynamic>.from(options.data as Map);
            // The server only knows remote ids; a local one is a 422.
            if (body['supplierId'].toString().startsWith('local-')) {
              handler.reject(_error(options, 422, 'unknown supplier'));
              return;
            }
            purchaseBodies.add(body);
            handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 200,
                data: {'id': 'remote-purchase-1'},
              ),
            );
            return;
          }

          if (path == '/admin/cash/cashboxes' && options.method == 'POST') {
            final body = Map<String, dynamic>.from(options.data as Map);
            cashboxBodies.add(body);
            cashboxCounter += 1;
            handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 200,
                data: {...body, 'id': 'remote-cashbox-$cashboxCounter'},
              ),
            );
            return;
          }

          if (path.startsWith('/admin/cash/cashboxes/') &&
              path.endsWith('/sessions/open') &&
              options.method == 'POST') {
            if (sessionOpenStatus != 200) {
              handler.reject(
                _error(options, sessionOpenStatus, 'session open failed'),
              );
              return;
            }
            final cashboxId = path.split('/')[4];
            openSessionCashboxes.add(cashboxId);
            handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 200,
                data: {
                  'session': {'id': 'remote-session-1', 'cashboxId': cashboxId},
                },
              ),
            );
            return;
          }

          if (path == '/admin/pos/sales' && options.method == 'POST') {
            final body = Map<String, dynamic>.from(options.data as Map);
            // Mirrors the backend: the sale's SALE_PAYMENT movement goes
            // through the cash ledger, which rejects it — rolling the sale back
            // with it — unless the till has an open session.
            final cashboxId = body['cashboxId']?.toString() ?? '';
            if (!openSessionCashboxes.contains(cashboxId)) {
              handler.reject(
                _error(options, 409, 'Cashbox has no open session'),
              );
              return;
            }
            saleBodies.add(body);
            handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 200,
                data: {'id': 'remote-sale-1'},
              ),
            );
            return;
          }

          if (path.startsWith('/admin/orders/') && options.method == 'PATCH') {
            final body = Map<String, dynamic>.from(options.data as Map);
            orderPatchBodies.add(body);
            handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 200,
                data: {'id': path.split('/').last, ...body},
              ),
            );
            return;
          }

          if (path.startsWith('/admin/customers/')) {
            customerRequests.add('${options.method} $path');
            // Mirrors the backend router, which exposes only patch('/:id').
            if (options.method != 'PATCH') {
              handler.reject(_error(options, 404, 'Not found'));
              return;
            }
            handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 200,
                data: {'id': path.split('/').last, 'name': 'Renamed'},
              ),
            );
            return;
          }

          if (path == '/admin/store-settings' && options.method == 'GET') {
            handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 200,
                data: storeSettingsResponse,
              ),
            );
            return;
          }

          if (path == '/admin/sync/pull') {
            handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 200,
                data: {'changes': <String, dynamic>{}},
              ),
            );
            return;
          }

          handler.resolve(
            Response(requestOptions: options, statusCode: 200, data: const {}),
          );
        },
      ),
    );
  });

  setUp(() async {
    productBodies.clear();
    supplierBodies.clear();
    purchaseBodies.clear();
    orderPatchBodies.clear();
    customerRequests.clear();
    saleBodies.clear();
    cashboxBodies.clear();
    openSessionCashboxes.clear();
    productCreateStatus = 200;
    productCreateUnreachable = false;
    supplierCreateStatus = 200;
    supplierCounter = 0;
    sessionOpenStatus = 200;
    productRetryConflicts = 0;
    productConflictIsRetryable = true;
    cashboxCounter = 0;
    storeSettingsResponse = const {};
    connectivity.setResults(const [ConnectivityResult.none], emit: false);
    // A fresh database per test. These all share one temp directory, so without
    // this a test that ends with a terminal row -- `conflicted` is skipped by
    // `retryFailedOperations` on purpose -- leaves it at the head of the FIFO
    // queue and every later test waits forever for a drain that cannot happen.
    await DatabaseService().resetForTest();
    if (await tempDbDir.exists()) {
      await tempDbDir.delete(recursive: true);
    }
    await tempDbDir.create(recursive: true);
    TenantModeService().initialize(
      mode: AppMode.hybrid,
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
    );
    await SyncService().reset();
  });

  tearDown(() async {
    await SyncService().reset();
    await DatabaseService().resetForTest();
  });

  tearDownAll(() async {
    ConnectivityPlatform.instance = originalConnectivityPlatform;
    DatabaseService.databaseOpener = originalDatabaseOpener;
    DatabaseService.resetTestOverrides();
    SyncService.resetTestOverrides();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(pathProviderChannel, null);
    await tempDbDir.delete(recursive: true);
    await appDocsDir.delete(recursive: true);
  });

  test(
    'an operation stranded mid-flight by a crash is retried, not lost',
    () async {
      await SyncService().enqueueOperation(
        entityType: 'product',
        action: 'create',
        payload: {'id': 'product-1', 'title': 'Mug', 'price': 9.5},
      );

      // Simulate the process dying between marking the row `syncing` and getting
      // a response. Before the reclaim step this row was never selected again.
      final db = await DatabaseService().database;
      await db.update('sync_queue', {'status': 'syncing'});
      expect(
        (await db.query('sync_queue', where: "status = 'syncing'")),
        hasLength(1),
      );

      connectivity.setResults(const [ConnectivityResult.wifi], emit: false);
      SyncService().initialize(api, mode: AppMode.hybrid);

      await _waitFor(
        () async => productBodies.length == 1,
        reason: 'stranded product operation to be reclaimed and sent',
      );
      await _waitFor(
        () async => (await (await DatabaseService().database).query(
          'sync_queue',
        )).isEmpty,
        reason: 'queue to drain',
      );
    },
  );

  test(
    'a write is not sent before the entity it references exists remotely',
    () async {
      supplierCreateStatus = 503; // transient outage, retryable

      await SyncService().enqueueOperation(
        entityType: 'supplier',
        action: 'create',
        payload: {'id': 'local-supplier-1', 'name': 'Acme'},
      );
      await SyncService().enqueueOperation(
        entityType: 'purchase',
        action: 'createDraft',
        payload: {'supplierId': 'local-supplier-1', 'offlineId': 'local-po-1'},
      );

      connectivity.setResults(const [ConnectivityResult.wifi], emit: false);
      SyncService().initialize(api, mode: AppMode.hybrid);

      final db = await DatabaseService().database;
      await _waitFor(() async {
        final rows = await db.query(
          'sync_queue',
          where: 'entityType = ?',
          whereArgs: ['supplier'],
        );
        return rows.isNotEmpty && rows.first['status'] == 'failed';
      }, reason: 'supplier create to fail against the outage');

      // The purchase must have been held back rather than sent with a local id
      // and burned as `rejected`.
      expect(purchaseBodies, isEmpty);
      final held = await db.query(
        'sync_queue',
        where: 'entityType = ?',
        whereArgs: ['purchase'],
      );
      expect(held, hasLength(1));
      // Deferral must not consume the retry budget or reach a terminal state.
      expect(held.first['status'], isNot('rejected'));
      expect(held.first['retryCount'], 0);

      // Once the supplier lands, the purchase goes out with the remote id.
      supplierCreateStatus = 200;
      await SyncService().retryFailedOperations();

      await _waitFor(
        () async => purchaseBodies.length == 1,
        reason: 'purchase to sync after its supplier',
      );
      expect(purchaseBodies.single['supplierId'], 'remote-supplier-1');
    },
  );

  test('a lost race is retried rather than parked for review', () async {
    // The server answers 409 with RETRY_CONFLICT: it lost an optimistic
    // concurrency race, and the identical payload is expected to succeed.
    productRetryConflicts = 1;
    productConflictIsRetryable = true;

    await SyncService().enqueueOperation(
      entityType: 'product',
      action: 'create',
      payload: {'id': 'product-1', 'title': 'Mug', 'price': 9.5},
    );

    connectivity.setResults(const [ConnectivityResult.wifi], emit: false);
    SyncService().initialize(api, mode: AppMode.hybrid);

    await _waitFor(
      () async => productBodies.length == 1,
      reason: 'product to be resent after the lost race',
    );
    await _waitFor(
      () async => (await (await DatabaseService().database).query(
        'sync_queue',
      )).isEmpty,
      reason: 'queue to drain',
    );
    // Never asked a human about a write the queue could finish on its own.
    expect(await SyncService().listIssues(), isEmpty);
  });

  test('a real conflict is still parked for review', () async {
    // Same status, no RETRY_CONFLICT and no "please retry": resending this
    // cannot help, so it has to reach the user rather than loop.
    productRetryConflicts = 1;
    productConflictIsRetryable = false;

    await SyncService().enqueueOperation(
      entityType: 'product',
      action: 'create',
      payload: {'id': 'product-1', 'title': 'Mug', 'price': 9.5},
    );

    connectivity.setResults(const [ConnectivityResult.wifi], emit: false);
    SyncService().initialize(api, mode: AppMode.hybrid);

    final db = await DatabaseService().database;
    await _waitFor(() async {
      final rows = await db.query(
        'sync_queue',
        where: 'entityType = ?',
        whereArgs: ['product'],
      );
      return rows.isNotEmpty && rows.first['status'] == 'conflicted';
    }, reason: 'product create to be parked as conflicted');

    expect(productBodies, isEmpty);
    final issues = await SyncService().listIssues();
    expect(issues.map((issue) => issue.entityType), contains('product'));
  });

  test('a POS sale waits for its till to be opened server-side', () async {
    // 500, not 503: an unreachable server stops the whole pass, which would
    // hide the sale behind the outage instead of exercising the deferral. A
    // plain failure leaves the open with a `nextRetryAt` in the future while
    // the sale queued behind it stays eligible — the window where FIFO alone
    // does not protect the sale.
    sessionOpenStatus = 500;

    await SyncService().enqueueOperation(
      entityType: 'cashSession',
      action: 'open',
      payload: {
        'offlineId': 'local-session-1',
        'cashboxId': 'till-1',
        'openingFloat': 0,
      },
    );
    await SyncService().enqueueOperation(
      entityType: 'sale',
      action: 'create',
      payload: {
        'offlineId': 'local-sale-1',
        'cashboxId': 'till-1',
        'items': [
          {'productId': 'remote-product-1', 'quantity': 1, 'price': 100},
        ],
      },
    );

    connectivity.setResults(const [ConnectivityResult.wifi], emit: false);
    SyncService().initialize(api, mode: AppMode.hybrid);

    final db = await DatabaseService().database;
    await _waitFor(() async {
      final rows = await db.query(
        'sync_queue',
        where: 'entityType = ?',
        whereArgs: ['cashSession'],
      );
      return rows.isNotEmpty && rows.first['status'] == 'failed';
    }, reason: 'session open to fail');

    // The sale must have been held back rather than sent into the 409 that
    // `_classifySyncFailure` files as `conflicted` — terminal, and needing a
    // human, for a queue that was always going to fix itself.
    expect(saleBodies, isEmpty);
    final held = await db.query(
      'sync_queue',
      where: 'entityType = ?',
      whereArgs: ['sale'],
    );
    expect(held, hasLength(1));
    expect(held.first['status'], isNot('conflicted'));
    expect(held.first['retryCount'], 0);
    // The failed session open is a real issue and belongs in the recovery
    // list; the sale it is holding back does not.
    final issues = await SyncService().listIssues();
    expect(issues.map((issue) => issue.entityType), isNot(contains('sale')));

    // Once the till is open the sale goes out on its own.
    sessionOpenStatus = 200;
    await SyncService().retryFailedOperations();

    await _waitFor(
      () async => saleBodies.length == 1,
      reason: 'sale to sync after its session opens',
    );
    expect(saleBodies.single['cashboxId'], 'till-1');
  });

  test(
    'a POS sale names its till by the remote id, not the local one',
    () async {
      // A till created on this device while offline carries a local id until its
      // `cashbox:create` syncs. Sending that id would draw a 404 the classifier
      // files as `rejected`: terminal, and it drops the sale silently.
      supplierCreateStatus = 200;
      openSessionCashboxes.add('remote-cashbox-1');

      await SyncService().enqueueOperation(
        entityType: 'cashbox',
        action: 'create',
        payload: {
          'offlineId': 'local-till-1',
          'name': 'Till 1',
          'isActive': true,
        },
      );
      await SyncService().enqueueOperation(
        entityType: 'sale',
        action: 'create',
        payload: {
          'offlineId': 'local-sale-2',
          'cashboxId': 'local-till-1',
          'items': [
            {'productId': 'remote-product-1', 'quantity': 1, 'price': 100},
          ],
        },
      );

      connectivity.setResults(const [ConnectivityResult.wifi], emit: false);
      SyncService().initialize(api, mode: AppMode.hybrid);

      await _waitFor(
        () async => saleBodies.length == 1,
        reason: 'sale to sync after its cashbox',
      );
      expect(cashboxBodies, hasLength(1));
      expect(saleBodies.single['cashboxId'], 'remote-cashbox-1');
    },
  );

  test('two queued edits of the same entity do not block each other', () async {
    // Both carry the same order id. Only a *creating* operation may hold a
    // dependent one back, otherwise these two would defer to each other and
    // neither would ever be sent.
    await SyncService().enqueueOperation(
      entityType: 'order',
      action: 'updateStatus',
      payload: {'id': 'remote-order-1', 'status': 'CONFIRMED'},
    );
    await SyncService().enqueueOperation(
      entityType: 'order',
      action: 'updateCallStatus',
      payload: {'id': 'remote-order-1', 'callStatus': 'ANSWERED'},
    );

    connectivity.setResults(const [ConnectivityResult.wifi], emit: false);
    SyncService().initialize(api, mode: AppMode.hybrid);

    await _waitFor(
      () async => orderPatchBodies.length == 2,
      reason: 'both order edits to sync',
    );
    await _waitFor(
      () async => (await (await DatabaseService().database).query(
        'sync_queue',
      )).isEmpty,
      reason: 'queue to drain',
    );
  });

  test(
    'a refresh does not overwrite an unsynced local store settings edit',
    () async {
      // The supplemental refresh is what we are exercising here.
      SyncService.disableSupplementalRefreshForTests = false;
      addTearDown(() => SyncService.disableSupplementalRefreshForTests = true);
      storeSettingsResponse = {'name': 'Server Name', 'slug': 'server-slug'};

      // `patchStoreSettings` writes the row as `pending` before queueing its
      // patch, so this is the state between a local edit and a successful sync.
      final db = await DatabaseService().database;
      await db.insert('store_settings', {
        'id': 'singleton_tenant-1',
        'tenantId': 'tenant-1',
        'name': 'Local Edit',
        'slug': 'local-slug',
        'syncStatus': 'pending',
      });

      connectivity.setResults(const [ConnectivityResult.wifi], emit: false);
      SyncService().initialize(api, mode: AppMode.hybrid);

      await _waitFor(() async {
        final rows = await db.query('store_settings');
        return rows.isNotEmpty && rows.first['syncStatus'] != 'pending';
      }, reason: 'the refresh pass to reach store settings');

      final row = (await db.query('store_settings')).single;
      expect(row['name'], 'Local Edit', reason: 'local edit must survive');
      expect(row['syncStatus'], 'conflicted');
    },
  );

  test(
    'a customer edit is sent as PATCH, the only verb the API exposes',
    () async {
      await SyncService().enqueueOperation(
        entityType: 'customer',
        action: 'update',
        payload: {'id': 'customer-1', 'name': 'Renamed'},
      );

      connectivity.setResults(const [ConnectivityResult.wifi], emit: false);
      SyncService().initialize(api, mode: AppMode.hybrid);

      // Assert on the request itself rather than on the queue draining: the verb
      // is what is under test.
      await _waitFor(
        () async => customerRequests.isNotEmpty,
        reason: 'the customer edit to reach the API',
      );

      // A PUT here 404s, and 404 is terminal, so the edit was silently dropped.
      expect(customerRequests, ['PATCH /admin/customers/customer-1']);
    },
  );

  test('a rejected operation can be recovered by an explicit retry', () async {
    productCreateStatus = 422;

    await SyncService().enqueueOperation(
      entityType: 'product',
      action: 'create',
      payload: {'id': 'product-1', 'title': 'Mug', 'price': 9.5},
    );

    connectivity.setResults(const [ConnectivityResult.wifi], emit: false);
    SyncService().initialize(api, mode: AppMode.hybrid);

    final db = await DatabaseService().database;
    await _waitFor(() async {
      final rows = await db.query('sync_queue');
      return rows.isNotEmpty && rows.first['status'] == 'rejected';
    }, reason: 'product create to be rejected');

    expect(await SyncService().listIssues(), hasLength(1));

    // The user corrects whatever the server objected to and retries; before the
    // fix `rejected` rows were skipped and stayed queued forever.
    productCreateStatus = 200;
    await SyncService().retryFailedOperations();

    await _waitFor(
      () async => productBodies.length == 1,
      reason: 'rejected operation to sync after retry',
    );
    expect(await SyncService().listIssues(), isEmpty);
  });

  test(
    'an expired session parks the queue instead of spending its retries',
    () async {
      productCreateStatus = 401;

      // Two writes made during the outage. Coming back online after the access
      // token expired answers 401 for both.
      await SyncService().enqueueOperation(
        entityType: 'product',
        action: 'create',
        payload: {'id': 'product-1', 'title': 'Mug', 'price': 9.5},
      );
      await SyncService().enqueueOperation(
        entityType: 'product',
        action: 'create',
        payload: {'id': 'product-2', 'title': 'Cup', 'price': 4.0},
      );

      connectivity.setResults(const [ConnectivityResult.wifi], emit: false);
      SyncService().initialize(api, mode: AppMode.hybrid);

      await _waitFor(
        () async => SyncService().isPausedForSessionExpiry,
        reason: 'the loop to pause on the expired session',
      );

      final db = await DatabaseService().database;
      final rows = await db.query(
        'sync_queue',
        orderBy: 'createdAt ASC, id ASC',
      );

      // Both writes are still queued, neither has spent a retry, and neither is
      // in a state the user would have to clear by hand. Counting a dead session
      // as five failed attempts used to strand the whole outbox.
      expect(rows, hasLength(2));
      for (final row in rows) {
        expect(row['status'], SyncStatus.pending.name);
        expect(row['retryCount'], 0);
        expect(row['nextRetryAt'], isNull);
      }
      expect(await SyncService().listIssues(), isEmpty);

      // Signing back in hands the service a fresh session, which clears the
      // pause and drains the queue that survived it.
      productCreateStatus = 200;
      SyncService().initialize(api, mode: AppMode.hybrid);
      expect(SyncService().isPausedForSessionExpiry, isFalse);

      await _waitFor(
        () async => productBodies.length == 2,
        reason: 'the queue to drain after re-authentication',
      );
    },
  );

  test('a server outage does not spend the retry budget', () async {
    // A restart or a rate limit answers 503. That says nothing about whether
    // the write is any good, so it must not count against the row.
    productCreateStatus = 503;

    await SyncService().enqueueOperation(
      entityType: 'product',
      action: 'create',
      payload: {'id': 'product-1', 'title': 'Mug', 'price': 9.5},
    );

    connectivity.setResults(const [ConnectivityResult.wifi], emit: false);
    SyncService().initialize(api, mode: AppMode.hybrid);

    final db = await DatabaseService().database;
    await _waitFor(() async {
      final rows = await db.query('sync_queue');
      return rows.isNotEmpty && rows.first['status'] == 'failed';
    }, reason: 'the product create to fail against the outage');

    final row = (await db.query('sync_queue')).first;
    expect(row['retryCount'], 0);
    // Still scheduled, so the row stays eligible however long the outage runs.
    expect(row['nextRetryAt'], isNotNull);

    productCreateStatus = 200;
    await _waitFor(
      () async => productBodies.length == 1,
      reason: 'the write to go through once the server is back',
    );
  });

  test(
    'a network that is up but unreachable does not blame the write',
    () async {
      // connectivity_plus reports the interface, not reachability: a captive
      // portal reads as "connected" and every request dies with no response.
      productCreateUnreachable = true;

      await SyncService().enqueueOperation(
        entityType: 'product',
        action: 'create',
        payload: {'id': 'product-1', 'title': 'Mug', 'price': 9.5},
      );

      connectivity.setResults(const [ConnectivityResult.wifi], emit: false);
      SyncService().initialize(api, mode: AppMode.hybrid);

      final db = await DatabaseService().database;
      await _waitFor(() async {
        final rows = await db.query('sync_queue');
        return rows.isNotEmpty && rows.first['nextRetryAt'] != null;
      }, reason: 'the unreachable attempt to be rescheduled');

      final row = (await db.query('sync_queue')).first;
      expect(row['retryCount'], 0);

      productCreateUnreachable = false;
      await _waitFor(
        () async => productBodies.length == 1,
        reason: 'the write to go through once the server is reachable',
      );
    },
  );

  test('reconnecting revives a queue that had spent its retries', () async {
    await SyncService().enqueueOperation(
      entityType: 'product',
      action: 'create',
      payload: {'id': 'product-1', 'title': 'Mug', 'price': 9.5},
    );

    // Start offline so the listener is wired without a pass running.
    connectivity.setResults(const [ConnectivityResult.none], emit: false);
    SyncService().initialize(api, mode: AppMode.hybrid);

    // The state a row reaches after five failures: out of budget, no next
    // attempt scheduled, and skipped by every pass. It used to sit here until
    // the user found the retry button in the sync banner.
    final db = await DatabaseService().database;
    await db.update('sync_queue', {
      'status': 'failed',
      'retryCount': 5,
      'nextRetryAt': null,
      'lastError': 'Connection refused',
    });

    // The device joins a network again. That is new evidence, not more of the
    // old, so the row gets another chance without the user asking for one.
    connectivity.setResults(const [ConnectivityResult.wifi], emit: true);

    await _waitFor(
      () async => productBodies.length == 1,
      reason: 'the stranded write to sync once connectivity returns',
    );
    expect(await SyncService().listIssues(), isEmpty);
  });
}

DioException _error(
  RequestOptions options,
  int status,
  String message, {
  String? code,
}) {
  return DioException(
    requestOptions: options,
    response: Response(
      requestOptions: options,
      statusCode: status,
      data: {'statusMessage': message, if (code != null) 'code': code},
    ),
    type: DioExceptionType.badResponse,
  );
}

Future<void> _waitFor(
  Future<bool> Function() condition, {
  required String reason,
}) async {
  final deadline = DateTime.now().add(const Duration(seconds: 10));
  while (DateTime.now().isBefore(deadline)) {
    if (await condition()) {
      return;
    }
    await Future<void>.delayed(const Duration(milliseconds: 50));
  }
  fail('Timed out waiting for $reason');
}

class _FakeConnectivityPlatform extends ConnectivityPlatform {
  final _controller = StreamController<List<ConnectivityResult>>.broadcast();
  List<ConnectivityResult> _results = const [ConnectivityResult.none];

  void setResults(List<ConnectivityResult> results, {bool emit = true}) {
    _results = results;
    if (emit) {
      _controller.add(results);
    }
  }

  @override
  Future<List<ConnectivityResult>> checkConnectivity() async => _results;

  @override
  Stream<List<ConnectivityResult>> get onConnectivityChanged =>
      _controller.stream;
}
