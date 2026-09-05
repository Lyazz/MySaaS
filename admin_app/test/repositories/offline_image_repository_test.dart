import 'dart:convert';
import 'dart:io';

import 'package:admin_app/models/app_mode.dart';
import 'package:admin_app/repositories/category_repository.dart';
import 'package:admin_app/repositories/product_repository.dart';
import 'package:admin_app/services/api_service.dart';
import 'package:admin_app/services/database_service.dart';
import 'package:admin_app/services/sync_service.dart';
import 'package:admin_app/services/tenant_mode_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory tempDbDir;
  late DatabaseOpener originalDatabaseOpener;

  setUpAll(() async {
    sqfliteFfiInit();
    tempDbDir = await Directory.systemTemp.createTemp('offline-image-repo');
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
  });

  setUp(() async {
    await tempDbDir.create(recursive: true);
    await DatabaseService().resetForTest();
    await _clearDirectory(tempDbDir);
    TenantModeService().initialize(
      mode: AppMode.offlineOnly,
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
    );
    await SyncService().reset();
    SyncService().initialize(
      ApiService(baseUrl: 'http://localhost:3000/api'),
      mode: AppMode.offlineOnly,
    );
  });

  tearDown(() async {
    await SyncService().reset();
    await DatabaseService().resetForTest();
  });

  tearDownAll(() async {
    DatabaseService.databaseOpener = originalDatabaseOpener;
    DatabaseService.resetTestOverrides();
    await tempDbDir.delete(recursive: true);
  });

  test(
    'product repository stores local image paths immediately offline',
    () async {
      final repository = ProductRepository(
        ApiService(baseUrl: 'http://localhost:3000/api'),
      );

      final product = await repository.createProduct({
        'title': 'Offline Mug',
        'slug': 'offline-mug',
        'price': 10,
        'stock': 4,
        'isActive': true,
        'images': ['images/product.png'],
      });

      expect(product.mainImageUrl, 'images/product.png');

      final db = await DatabaseService().database;
      final productRows = await db.query(
        'products',
        where: 'id = ? AND tenantId = ?',
        whereArgs: [product.id, 'tenant-1'],
        limit: 1,
      );
      expect(productRows.single['mainImageUrl'], 'images/product.png');
      expect(productRows.single['syncStatus'], 'pending');

      final queueRows = await db.query(
        'sync_queue',
        where: 'tenantId = ?',
        whereArgs: ['tenant-1'],
        limit: 1,
      );
      final payload =
          jsonDecode(queueRows.single['payload']! as String)
              as Map<String, dynamic>;
      expect(payload['images'], ['images/product.png']);
    },
  );

  test(
    'category repository stores local image paths immediately offline',
    () async {
      final repository = CategoryRepository(
        ApiService(baseUrl: 'http://localhost:3000/api'),
      );

      final category = await repository.createCategory(
        title: 'Kitchen',
        slug: 'kitchen',
        imageUrl: 'images/category.png',
      );

      expect(category.imageUrl, 'images/category.png');

      final db = await DatabaseService().database;
      final categoryRows = await db.query(
        'categories',
        where: 'id = ? AND tenantId = ?',
        whereArgs: [category.id, 'tenant-1'],
        limit: 1,
      );
      expect(categoryRows.single['imageUrl'], 'images/category.png');
      expect(categoryRows.single['syncStatus'], 'pending');

      final queueRows = await db.query(
        'sync_queue',
        where: 'tenantId = ?',
        whereArgs: ['tenant-1'],
        limit: 1,
      );
      final payload =
          jsonDecode(queueRows.single['payload']! as String)
              as Map<String, dynamic>;
      expect(payload['imageUrl'], 'images/category.png');
    },
  );
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
