import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:admin_app/models/app_mode.dart';
import 'package:admin_app/services/api_service.dart';
import 'package:admin_app/services/database_service.dart';
import 'package:admin_app/services/sync_service.dart';
import 'package:admin_app/services/tenant_mode_service.dart';
import 'package:admin_app/services/workspace_file_service.dart';
import 'package:connectivity_plus_platform_interface/connectivity_plus_platform_interface.dart';
import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as p;
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const pathProviderChannel = MethodChannel('plugins.flutter.io/path_provider');
  late Directory tempDbDir;
  late Directory appDocsDir;
  late ApiService api;
  late _FakeConnectivityPlatform connectivity;
  late ConnectivityPlatform originalConnectivityPlatform;
  late DatabaseOpener originalDatabaseOpener;

  final uploadResponses = <String>[];
  final productBodies = <Map<String, dynamic>>[];
  final categoryBodies = <Map<String, dynamic>>[];
  var failUploads = false;

  setUpAll(() async {
    sqfliteFfiInit();
    tempDbDir = await Directory.systemTemp.createTemp('sync-image-db');
    appDocsDir = await Directory.systemTemp.createTemp('sync-image-docs');

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
          if (call.method == 'getApplicationDocumentsDirectory') {
            return appDocsDir.path;
          }
          if (call.method == 'getTemporaryDirectory') {
            return appDocsDir.path;
          }
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

          if (path == '/upload' && options.method == 'POST') {
            if (failUploads) {
              handler.reject(
                DioException(
                  requestOptions: options,
                  response: Response(
                    requestOptions: options,
                    statusCode: 500,
                    data: {'error': 'upload failed'},
                  ),
                  type: DioExceptionType.badResponse,
                ),
              );
              return;
            }

            final url =
                'https://cdn.example.com/upload-${uploadResponses.length + 1}.png';
            uploadResponses.add(url);
            handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 200,
                data: {'url': url},
              ),
            );
            return;
          }

          if (path == '/admin/products' && options.method == 'POST') {
            final body = Map<String, dynamic>.from(options.data as Map);
            final images =
                (body['images'] as List?)?.cast<String>() ?? const [];
            if (images.any((value) => value.startsWith('images/'))) {
              handler.reject(
                DioException(
                  requestOptions: options,
                  response: Response(
                    requestOptions: options,
                    statusCode: 422,
                    data: {'error': 'local images not allowed'},
                  ),
                  type: DioExceptionType.badResponse,
                ),
              );
              return;
            }

            productBodies.add(body);
            handler.resolve(
              Response(requestOptions: options, statusCode: 200, data: body),
            );
            return;
          }

          if (path == '/admin/categories' && options.method == 'POST') {
            final body = Map<String, dynamic>.from(options.data as Map);
            final imageUrl = body['imageUrl']?.toString() ?? '';
            if (imageUrl.startsWith('images/') ||
                imageUrl.startsWith('app_images/')) {
              handler.reject(
                DioException(
                  requestOptions: options,
                  response: Response(
                    requestOptions: options,
                    statusCode: 422,
                    data: {'error': 'local images not allowed'},
                  ),
                  type: DioExceptionType.badResponse,
                ),
              );
              return;
            }

            categoryBodies.add(body);
            handler.resolve(
              Response(requestOptions: options, statusCode: 200, data: body),
            );
            return;
          }

          if (path == '/admin/sync/pull') {
            handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 200,
                data: {
                  'changes': const <String, dynamic>{},
                  'serverTime': DateTime.now().toIso8601String(),
                },
              ),
            );
            return;
          }

          if (path == '/admin/users' ||
              path == '/admin/suppliers' ||
              path == '/admin/purchases' ||
              path == '/admin/settings/printers' ||
              path == '/admin/settings/receipt_layouts' ||
              path == '/admin/cash/cashboxes' ||
              path == '/admin/delivery/providers' ||
              path == '/admin/staff-roles') {
            handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 200,
                data: const [],
              ),
            );
            return;
          }

          if (path == '/admin/cash/cash-sessions' ||
              path == '/admin/cash/cash-transactions') {
            handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 200,
                data: const {'items': []},
              ),
            );
            return;
          }

          if (path == '/admin/store-settings') {
            handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 200,
                data: const {'name': 'Tenant', 'slug': 'tenant'},
              ),
            );
            return;
          }

          if (path == '/admin/contact-infos') {
            handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 200,
                data: const {'items': []},
              ),
            );
            return;
          }

          handler.next(options);
        },
      ),
    );
  });

  setUp(() async {
    uploadResponses.clear();
    productBodies.clear();
    categoryBodies.clear();
    failUploads = false;
    connectivity.setResults(const [ConnectivityResult.none], emit: false);
    await tempDbDir.create(recursive: true);
    await DatabaseService().resetForTest();
    await _clearDirectory(tempDbDir);
    await _clearDirectory(appDocsDir);
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
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(pathProviderChannel, null);
    await tempDbDir.delete(recursive: true);
    await appDocsDir.delete(recursive: true);
  });

  test('sync uploads and rewrites images/ payload references', () async {
    final workspaceDir = Directory(
      p.join(
        appDocsDir.path,
        WorkspaceFileService.workspaceRootDirName,
        TenantModeService().activeNamespaceKey,
        WorkspaceFileService.imagesDirName,
      ),
    )..createSync(recursive: true);
    final file = File(p.join(workspaceDir.path, 'product.png'));
    await file.writeAsBytes(_pngBytes);

    await SyncService().enqueueOperation(
      entityType: 'product',
      action: 'create',
      payload: {
        'id': 'product-1',
        'title': 'Mug',
        'slug': 'mug',
        'price': 9.5,
        'stock': 3,
        'isActive': true,
        'images': ['images/product.png'],
      },
    );

    connectivity.setResults(const [ConnectivityResult.wifi], emit: false);
    SyncService().initialize(api, mode: AppMode.hybrid);

    await _waitFor(() async {
      final queueRows = await (await DatabaseService().database).query(
        'sync_queue',
      );
      return productBodies.length == 1 && queueRows.isEmpty;
    }, reason: 'completed product sync');

    expect(productBodies.single['images'], [uploadResponses.single]);

    final db = await DatabaseService().database;
    final queueRows = await db.query('sync_queue');
    expect(queueRows, isEmpty);
    expect(file.existsSync(), isFalse);
  });

  test('sync still rewrites legacy app_images/ references', () async {
    final legacyDir = Directory(
      p.join(appDocsDir.path, WorkspaceFileService.legacyImagesDirName),
    )..createSync(recursive: true);
    await File(p.join(legacyDir.path, 'category.png')).writeAsBytes(_pngBytes);

    await SyncService().enqueueOperation(
      entityType: 'category',
      action: 'create',
      payload: {
        'id': 'category-1',
        'title': 'Kitchen',
        'slug': 'kitchen',
        'imageUrl': 'app_images/category.png',
      },
    );

    connectivity.setResults(const [ConnectivityResult.wifi], emit: false);
    SyncService().initialize(api, mode: AppMode.hybrid);

    await _waitFor(() async {
      final queueRows = await (await DatabaseService().database).query(
        'sync_queue',
      );
      return categoryBodies.length == 1 && queueRows.isEmpty;
    }, reason: 'completed category sync');

    expect(
      categoryBodies.any((body) => body['imageUrl'] == uploadResponses.last),
      isTrue,
    );
  });

  test('sync keeps local image refs in payload when upload fails', () async {
    failUploads = true;

    final workspaceDir = Directory(
      p.join(
        appDocsDir.path,
        WorkspaceFileService.workspaceRootDirName,
        TenantModeService().activeNamespaceKey,
        WorkspaceFileService.imagesDirName,
      ),
    )..createSync(recursive: true);
    final file = File(p.join(workspaceDir.path, 'failed.png'));
    await file.writeAsBytes(_pngBytes);

    await SyncService().enqueueOperation(
      entityType: 'product',
      action: 'create',
      payload: {
        'id': 'product-2',
        'title': 'Offline mug',
        'slug': 'offline-mug',
        'price': 12,
        'stock': 1,
        'isActive': true,
        'images': ['images/failed.png'],
      },
    );

    connectivity.setResults(const [ConnectivityResult.wifi], emit: false);
    SyncService().initialize(api, mode: AppMode.hybrid);

    await _waitFor(() async {
      final rows = await (await DatabaseService().database).query('sync_queue');
      return rows.isNotEmpty &&
          rows.single['status'] == SyncStatus.failed.name &&
          rows.single['retryCount'] == 1;
    }, reason: 'failed sync state');

    final rows = await (await DatabaseService().database).query('sync_queue');
    final payload = jsonDecode(rows.single['payload']! as String) as Map;
    expect(payload['images'], ['images/failed.png']);
    expect(file.existsSync(), isTrue);
  });
}

Future<void> _waitFor(
  Future<bool> Function() condition, {
  required String reason,
}) async {
  final deadline = DateTime.now().add(const Duration(seconds: 5));
  while (DateTime.now().isBefore(deadline)) {
    if (await condition()) {
      return;
    }
    await Future<void>.delayed(const Duration(milliseconds: 50));
  }
  fail('Timed out waiting for $reason');
}

Future<void> _clearDirectory(Directory directory) async {
  if (!directory.existsSync()) {
    await directory.create(recursive: true);
    return;
  }

  for (final entity in directory.listSync()) {
    await entity.delete(recursive: true);
  }
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

final _pngBytes = base64Decode(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0uoAAAAASUVORK5CYII=',
);
