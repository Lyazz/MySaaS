import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:admin_app/models/app_mode.dart';
import 'package:admin_app/models/purchase.dart';
import 'package:admin_app/repositories/contact_infos_repository.dart';
import 'package:admin_app/repositories/product_repository.dart';
import 'package:admin_app/repositories/purchase_repository.dart';
import 'package:admin_app/services/api_service.dart';
import 'package:admin_app/services/database_service.dart';
import 'package:admin_app/services/sync_service.dart';
import 'package:admin_app/services/tenant_mode_service.dart';
import 'package:connectivity_plus_platform_interface/connectivity_plus_platform_interface.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:sqflite_sqlcipher/sqflite.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  late Directory tempDir;
  late HttpServer server;
  late _FakeConnectivityPlatform connectivity;
  late ApiService api;
  late DatabaseOpener originalDatabaseOpener;
  final products = <String, Map<String, dynamic>>{};
  final purchases = <String, Map<String, dynamic>>{};
  final contactInfos = <String, Map<String, dynamic>>{};
  String? lastPurchaseAddItemPath;
  var purchaseCounter = 0;

  Future<void> writeJson(
    HttpRequest request,
    int statusCode,
    Object payload,
  ) async {
    request.response.statusCode = statusCode;
    request.response.headers.contentType = ContentType.json;
    request.response.write(jsonEncode(payload));
    await request.response.close();
  }

  Future<void> handleRequest(HttpRequest request) async {
    final path = request.uri.path;
    final body = request.method == 'GET'
        ? const <String, dynamic>{}
        : ((jsonDecode(await utf8.decoder.bind(request).join()) as Object?)
                  as Map?)
              ?.cast<String, dynamic>() ??
            const <String, dynamic>{};

    if (path == '/api/admin/products' && request.method == 'POST') {
      final product = <String, dynamic>{
        'id': body['id'],
        'title': body['title'],
        'slug': body['slug'],
        'price': body['price'],
        'stock': body['stock'],
        'lowStockThreshold': body['lowStockThreshold'] ?? 5,
        'isActive': body['isActive'] != false,
        'categoryId': body['categoryId'],
        'images': body['images'] ?? const [],
        'options': body['options'] ?? const [],
        'variants': body['variants'] ?? const [],
      };
      products[product['id'].toString()] = product;
      await writeJson(request, 200, product);
      return;
    }

    if (path.startsWith('/api/admin/products/') && request.method == 'PUT') {
      final id = path.split('/').last;
      final current = products[id] ?? {'id': id};
      final next = <String, dynamic>{...current, ...body};
      products[id] = next;
      await writeJson(request, 200, next);
      return;
    }

    if (path.startsWith('/api/admin/products/') && request.method == 'DELETE') {
      final id = path.split('/').last;
      products.remove(id);
      await writeJson(request, 200, {'success': true});
      return;
    }

    if (path == '/api/admin/contact-infos' && request.method == 'GET') {
      await writeJson(request, 200, {'items': contactInfos.values.toList()});
      return;
    }

    if (path.startsWith('/api/admin/contact-infos/') &&
        request.method == 'PATCH') {
      final id = path.split('/').last;
      final current = contactInfos[id] ?? {'id': id};
      final next = <String, dynamic>{...current, ...body};
      contactInfos[id] = next;
      await writeJson(request, 200, next);
      return;
    }

    if (path == '/api/admin/purchases' && request.method == 'POST') {
      purchaseCounter += 1;
      final remoteId = 'remote-purchase-$purchaseCounter';
      final purchase = <String, dynamic>{
        'id': remoteId,
        'supplierId': body['supplierId'],
        'supplierName': 'Supplier',
        'totalAmount': 0,
        'status': 'PENDING',
        'createdAt': DateTime.now().toIso8601String(),
        'items': const [],
      };
      purchases[remoteId] = purchase;
      await writeJson(request, 200, purchase);
      return;
    }

    if (path.contains('/api/admin/purchases/') &&
        path.endsWith('/items') &&
        request.method == 'POST') {
      lastPurchaseAddItemPath = path;
      await writeJson(request, 200, {'success': true});
      return;
    }

    if (path == '/api/admin/purchases' && request.method == 'GET') {
      await writeJson(request, 200, purchases.values.toList());
      return;
    }

    if (path == '/api/admin/sync/pull') {
      await writeJson(request, 200, {
        'changes': const <String, dynamic>{},
        'serverTime': DateTime.now().toIso8601String(),
      });
      return;
    }

    if (path == '/api/admin/users' ||
        path == '/api/admin/suppliers' ||
        path == '/api/admin/settings/printers' ||
        path == '/api/admin/settings/receipt_layouts' ||
        path == '/api/admin/cash/cashboxes' ||
        path == '/api/admin/delivery/providers' ||
        path == '/api/admin/staff-roles') {
      await writeJson(request, 200, const []);
      return;
    }

    if (path == '/api/admin/cash/cash-sessions' ||
        path == '/api/admin/cash/cash-transactions') {
      await writeJson(request, 200, const {'items': []});
      return;
    }

    if (path == '/api/admin/store-settings') {
      await writeJson(request, 200, const {'name': 'Tenant', 'slug': 'tenant'});
      return;
    }

    await writeJson(request, 404, {'error': 'Unhandled ${request.method} $path'});
  }

  setUpAll(() async {
    sqfliteFfiInit();
    final factory = databaseFactoryFfi;
    tempDir = await Directory.systemTemp.createTemp('admin-app-sync-test');
    DatabaseService.databasesPathProvider = () async => tempDir.path;
    originalDatabaseOpener = DatabaseService.databaseOpener;
    DatabaseService.databaseOpener = (
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
    connectivity = _FakeConnectivityPlatform();
    ConnectivityPlatform.instance = connectivity;
    server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    unawaited(server.listen(handleRequest).asFuture<void>());
    api = ApiService(
      baseUrl: 'http://${server.address.address}:${server.port}/api',
    );
  });

  tearDown(() async {
    products.clear();
    purchases.clear();
    contactInfos.clear();
    lastPurchaseAddItemPath = null;
    purchaseCounter = 0;
    connectivity.setResults(const [ConnectivityResult.none]);
    SyncService().reset();
    final tenantId = 'tenant-${DateTime.now().microsecondsSinceEpoch}';
    TenantModeService().initialize(
      mode: AppMode.hybrid,
      tenantId: tenantId,
      workspaceId: 'workspace',
    );
    await DatabaseService().clearDatabase();
  });

  tearDownAll(() async {
    DatabaseService.databaseOpener = originalDatabaseOpener;
    await server.close(force: true);
    await tempDir.delete(recursive: true);
  });

  Future<void> configureWorkspace({
    required String tenantId,
    required List<ConnectivityResult> connectivityResults,
  }) async {
    TenantModeService().initialize(
      mode: AppMode.hybrid,
      tenantId: tenantId,
      workspaceId: 'workspace',
    );
    await DatabaseService().clearDatabase();
    connectivity.setResults(connectivityResults);
    SyncService().initialize(api, mode: AppMode.hybrid);
  }

  Future<int> queueCount() async {
    final db = await DatabaseService().database;
    return Sqflite.firstIntValue(
          await db.rawQuery('SELECT COUNT(*) FROM sync_queue'),
        ) ??
        0;
  }

  Future<void> waitForQueueToDrain() async {
    final deadline = DateTime.now().add(const Duration(seconds: 5));
    while (DateTime.now().isBefore(deadline)) {
      if (await queueCount() == 0) return;
      await Future<void>.delayed(const Duration(milliseconds: 100));
    }
    fail('Timed out waiting for sync queue to drain');
  }

  testWidgets('offline CRUD persists product changes into the durable queue', (
    tester,
  ) async {
    await configureWorkspace(
      tenantId: 'tenant-offline-crud',
      connectivityResults: const [ConnectivityResult.none],
    );
    final repo = ProductRepository(api);

    final product = await repo.createProduct({
      'title': 'Offline product',
      'slug': 'offline-product',
      'price': 2500,
      'stock': 4,
      'isActive': true,
      'images': const [],
    });
    await repo.updateProduct(product.id, {'title': 'Offline product updated'});
    await repo.deleteProduct(product.id);

    expect(await queueCount(), 3);
    final db = await DatabaseService().database;
    final rows = await db.query('products', where: 'id = ?', whereArgs: [product.id]);
    expect(rows, isEmpty);
  });

  testWidgets('hybrid sync flushes pending product creates after connectivity returns', (
    tester,
  ) async {
    await configureWorkspace(
      tenantId: 'tenant-hybrid-sync',
      connectivityResults: const [ConnectivityResult.none],
    );
    final repo = ProductRepository(api);

    final product = await repo.createProduct({
      'id': 'product-sync-1',
      'title': 'Hybrid product',
      'slug': 'hybrid-product',
      'price': 1800,
      'stock': 8,
      'isActive': true,
      'images': const [],
    });

    connectivity.setResults(const [ConnectivityResult.wifi]);
    await waitForQueueToDrain();

    expect(products[product.id]?['title'], 'Hybrid product');
    final db = await DatabaseService().database;
    final rows = await db.query(
      'products',
      columns: ['syncStatus'],
      where: 'id = ?',
      whereArgs: [product.id],
    );
    expect(rows.single['syncStatus'], SyncStatus.synced.name);
  });

  testWidgets('restart resumes pending sync queue safely', (tester) async {
    await configureWorkspace(
      tenantId: 'tenant-restart',
      connectivityResults: const [ConnectivityResult.none],
    );
    final repo = ProductRepository(api);

    await repo.createProduct({
      'id': 'restart-product',
      'title': 'Restart product',
      'slug': 'restart-product',
      'price': 950,
      'stock': 2,
      'isActive': true,
      'images': const [],
    });
    expect(await queueCount(), 1);

    SyncService().reset();
    connectivity.setResults(const [ConnectivityResult.wifi]);
    SyncService().initialize(api, mode: AppMode.hybrid);

    await waitForQueueToDrain();
    expect(products.containsKey('restart-product'), isTrue);
  });

  testWidgets('queued purchase follow-up operations resolve aliased remote IDs', (
    tester,
  ) async {
    await configureWorkspace(
      tenantId: 'tenant-purchase-alias',
      connectivityResults: const [ConnectivityResult.none],
    );
    final repo = PurchaseRepository(api);

    final purchase = await repo.createDraftPurchase('supplier-1', 'Supplier');
    await repo.addPurchaseItem(
      purchase.id,
      PurchaseItem(
        id: 'item-1',
        productId: 'variant-1',
        productName: 'Variant 1',
        quantityOrdered: 3,
        quantityReceived: 0,
        unitCost: 250,
      ),
    );

    connectivity.setResults(const [ConnectivityResult.wifi]);
    await waitForQueueToDrain();

    expect(lastPurchaseAddItemPath, '/api/admin/purchases/remote-purchase-1/items');
  });

  testWidgets('conflict preflight marks local contact info as conflicted', (
    tester,
  ) async {
    await configureWorkspace(
      tenantId: 'tenant-conflict',
      connectivityResults: const [ConnectivityResult.none],
    );
    final db = await DatabaseService().database;
    await db.insert('contact_infos', {
      'id': 'contact-1',
      'tenantId': 'tenant-conflict',
      'kind': 'phone',
      'label': 'Store',
      'value': '+2135550000',
      'position': 0,
      'isActive': 1,
      'syncStatus': SyncStatus.synced.name,
    });
    contactInfos['contact-1'] = {
      'id': 'contact-1',
      'kind': 'phone',
      'label': 'Store',
      'value': '+2136669999',
      'position': 0,
      'isActive': true,
    };

    final repo = ContactInfosRepository(api);
    await repo.update('contact-1', {'value': '+2135551111'});

    connectivity.setResults(const [ConnectivityResult.wifi]);
    final deadline = DateTime.now().add(const Duration(seconds: 5));
    while (DateTime.now().isBefore(deadline)) {
      final queue = await db.query('sync_queue', columns: ['status'], limit: 1);
      if (queue.isNotEmpty && queue.single['status'] == SyncStatus.conflicted.name) {
        break;
      }
      await Future<void>.delayed(const Duration(milliseconds: 100));
    }

    final queue = await db.query('sync_queue', columns: ['status'], limit: 1);
    final local = await db.query(
      'contact_infos',
      columns: ['syncStatus'],
      where: 'id = ?',
      whereArgs: const ['contact-1'],
    );
    expect(queue.single['status'], SyncStatus.conflicted.name);
    expect(local.single['syncStatus'], SyncStatus.conflicted.name);
  });
}

class _FakeConnectivityPlatform extends ConnectivityPlatform {
  _FakeConnectivityPlatform();

  final _controller = StreamController<List<ConnectivityResult>>.broadcast();
  List<ConnectivityResult> _results = const [ConnectivityResult.none];

  void setResults(List<ConnectivityResult> results) {
    _results = results;
    _controller.add(results);
  }

  @override
  Future<List<ConnectivityResult>> checkConnectivity() async => _results;

  @override
  Stream<List<ConnectivityResult>> get onConnectivityChanged => _controller.stream;
}
