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
  var productCreateStatus = 200;
  var supplierCreateStatus = 200;
  var supplierCounter = 0;

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
    productCreateStatus = 200;
    supplierCreateStatus = 200;
    supplierCounter = 0;
    connectivity.setResults(const [ConnectivityResult.none], emit: false);
    await tempDbDir.create(recursive: true);
    await DatabaseService().resetForTest();
    TenantModeService().initialize(
      mode: AppMode.hybrid,
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
    );
    SyncService().reset();
  });

  tearDown(() async {
    SyncService().reset();
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

  test('an operation stranded mid-flight by a crash is retried, not lost', (
  ) async {
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
      () async =>
          (await (await DatabaseService().database).query('sync_queue')).isEmpty,
      reason: 'queue to drain',
    );
  });

  test('a write is not sent before the entity it references exists remotely', (
  ) async {
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
  });

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
      () async =>
          (await (await DatabaseService().database).query('sync_queue')).isEmpty,
      reason: 'queue to drain',
    );
  });

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
}

DioException _error(RequestOptions options, int status, String message) {
  return DioException(
    requestOptions: options,
    response: Response(
      requestOptions: options,
      statusCode: status,
      data: {'statusMessage': message},
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
