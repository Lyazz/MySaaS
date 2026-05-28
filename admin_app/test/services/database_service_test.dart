import 'dart:async';
import 'dart:io';

import 'package:admin_app/models/app_mode.dart';
import 'package:admin_app/services/database_service.dart';
import 'package:admin_app/services/tenant_mode_service.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as p;
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const secureStorage = FlutterSecureStorage();

  setUp(() async {
    FlutterSecureStorage.setMockInitialValues({});
    await DatabaseService().resetForTest();
    DatabaseService.resetTestOverrides();
  });

  tearDown(() async {
    await DatabaseService().resetForTest();
    DatabaseService.resetTestOverrides();
  });

  test(
    'migrates legacy sync_queue rows to include durable retry metadata',
    () async {
      sqfliteFfiInit();
      final factory = databaseFactoryFfi;
      final originalPathProvider = DatabaseService.databasesPathProvider;
      final originalOpener = DatabaseService.databaseOpener;
      final tempDir = await Directory.systemTemp.createTemp(
        'database-service-migration-test',
      );

      DatabaseService.databasesPathProvider = () async => tempDir.path;
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
          }) async {
            final file = File(path);
            if (!file.existsSync()) {
              Directory(p.dirname(path)).createSync(recursive: true);
              final legacy = await factory.openDatabase(
                path,
                options: OpenDatabaseOptions(
                  version: 7,
                  onCreate: (db, version) async {
                    await db.execute('''
                CREATE TABLE sync_queue(
                  id TEXT PRIMARY KEY,
                  tenantId TEXT NOT NULL DEFAULT '',
                  workspaceId TEXT NOT NULL DEFAULT '',
                  entityType TEXT NOT NULL,
                  action TEXT NOT NULL,
                  payload TEXT NOT NULL,
                  status TEXT NOT NULL,
                  retryCount INTEGER NOT NULL DEFAULT 0,
                  idempotencyKey TEXT,
                  createdAt TEXT NOT NULL
                )
              ''');
                  },
                ),
              );
              await legacy.close();
            }

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

      addTearDown(() async {
        DatabaseService.databasesPathProvider = originalPathProvider;
        DatabaseService.databaseOpener = originalOpener;
        await tempDir.delete(recursive: true);
      });

      TenantModeService().initialize(
        mode: AppMode.hybrid,
        tenantId: 'tenant-migration',
        workspaceId: 'workspace',
      );

      final db = await DatabaseService().database;
      final columns = await db.rawQuery("PRAGMA table_info('sync_queue')");
      final names = columns
          .map((column) => column['name']?.toString() ?? '')
          .toList();

      expect(names, containsAll(['lastError', 'lastAttemptAt', 'nextRetryAt']));
    },
  );

  test(
    'deduplicates concurrent opens and disables plugin single-instance reuse',
    () async {
      final tempDir = await Directory.systemTemp.createTemp(
        'database-service-open-once',
      );
      addTearDown(() => tempDir.delete(recursive: true));

      TenantModeService().initialize(
        mode: AppMode.online,
        tenantId: 'tenant-1',
        workspaceId: 'workspace-1',
      );

      final completer = Completer<Database>();
      final openStarted = Completer<void>();
      final fakeDb = _FakeDatabase();
      var openCalls = 0;

      DatabaseService.databasesPathProvider = () async => tempDir.path;
      DatabaseService.databaseOpener =
          (
            String openedPath, {
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
            expect(openedPath, isNotEmpty);
            expect(singleInstance, false);
            openCalls += 1;
            if (!openStarted.isCompleted) {
              openStarted.complete();
            }
            return completer.future;
          };

      final first = DatabaseService().database;
      final second = DatabaseService().database;

      await openStarted.future;
      expect(openCalls, 1);

      completer.complete(fakeDb);

      expect(await first, same(fakeDb));
      expect(await second, same(fakeDb));
    },
  );

  test('reuses legacy key for an existing namespaced database', () async {
    final tempDir = await Directory.systemTemp.createTemp(
      'database-service-legacy-key',
    );
    addTearDown(() => tempDir.delete(recursive: true));

    TenantModeService().initialize(
      mode: AppMode.online,
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
    );

    final namespaceKey = TenantModeService().activeNamespaceKey;
    final databasePath = p.join(
      tempDir.path,
      'tenant_workspace_dbs',
      namespaceKey,
      'mysaas_offline_encryptedd.db',
    );

    await Directory(p.dirname(databasePath)).create(recursive: true);
    await File(databasePath).writeAsString('not-a-real-db');
    await secureStorage.write(key: 'db_encryption_key', value: 'legacy-secret');

    String? capturedPassword;
    DatabaseService.databasesPathProvider = () async => tempDir.path;
    DatabaseService.databaseOpener =
        (
          String openedPath, {
          int? version,
          OnDatabaseConfigureFn? onConfigure,
          OnDatabaseCreateFn? onCreate,
          OnDatabaseVersionChangeFn? onUpgrade,
          OnDatabaseVersionChangeFn? onDowngrade,
          OnDatabaseOpenFn? onOpen,
          String? password,
          bool readOnly = false,
          bool singleInstance = true,
        }) async {
          expect(openedPath, databasePath);
          expect(singleInstance, false);
          capturedPassword = password;
          return _FakeDatabase();
        };

    await DatabaseService().database;

    expect(capturedPassword, 'legacy-secret');
    expect(
      await secureStorage.read(key: 'db_encryption_key::$namespaceKey'),
      'legacy-secret',
    );
  });

  test(
    'quarantines invalid workspace databases and retries with a fresh key',
    () async {
      final tempDir = await Directory.systemTemp.createTemp(
        'database-service-recovery',
      );
      addTearDown(() => tempDir.delete(recursive: true));

      TenantModeService().initialize(
        mode: AppMode.online,
        tenantId: 'tenant-1',
        workspaceId: 'workspace-1',
      );

      final namespaceKey = TenantModeService().activeNamespaceKey;
      final databasePath = p.join(
        tempDir.path,
        'tenant_workspace_dbs',
        namespaceKey,
        'mysaas_offline_encryptedd.db',
      );
      final dbFile = File(databasePath);
      final walFile = File('$databasePath-wal');
      final shmFile = File('$databasePath-shm');

      await Directory(p.dirname(databasePath)).create(recursive: true);
      await dbFile.writeAsString('corrupted');
      await walFile.writeAsString('wal');
      await shmFile.writeAsString('shm');

      final recoveryTime = DateTime.utc(2026, 1, 2, 3, 4, 5);
      DatabaseService.nowProvider = () => recoveryTime;
      DatabaseService.databasesPathProvider = () async => tempDir.path;

      var openCalls = 0;
      String? firstPassword;
      String? secondPassword;

      DatabaseService.databaseOpener =
          (
            String openedPath, {
            int? version,
            OnDatabaseConfigureFn? onConfigure,
            OnDatabaseCreateFn? onCreate,
            OnDatabaseVersionChangeFn? onUpgrade,
            OnDatabaseVersionChangeFn? onDowngrade,
            OnDatabaseOpenFn? onOpen,
            String? password,
            bool readOnly = false,
            bool singleInstance = true,
          }) async {
            expect(openedPath, databasePath);
            expect(singleInstance, false);
            openCalls += 1;
            if (openCalls == 1) {
              firstPassword = password;
              throw _FakeDatabaseException(
                'open_failed Error Domain=FMDatabase Code=26 "file is not a database"',
              );
            }

            secondPassword = password;
            return _FakeDatabase();
          };

      await DatabaseService().database;

      expect(openCalls, 2);
      expect(firstPassword, isNotNull);
      expect(secondPassword, isNotNull);
      expect(secondPassword, isNot(equals(firstPassword)));
      expect(dbFile.existsSync(), false);
      expect(walFile.existsSync(), false);
      expect(shmFile.existsSync(), false);
      expect(
        File(
          '$databasePath.corrupt.${recoveryTime.millisecondsSinceEpoch}',
        ).existsSync(),
        true,
      );
    },
  );

  test(
    'treats BEGIN EXCLUSIVE out-of-memory from sqlcipher open as recoverable',
    () async {
      final tempDir = await Directory.systemTemp.createTemp(
        'database-service-code7-recovery',
      );
      addTearDown(() => tempDir.delete(recursive: true));

      TenantModeService().initialize(
        mode: AppMode.online,
        tenantId: 'tenant-1',
        workspaceId: 'workspace-1',
      );

      final namespaceKey = TenantModeService().activeNamespaceKey;
      final databasePath = p.join(
        tempDir.path,
        'tenant_workspace_dbs',
        namespaceKey,
        'mysaas_offline_encryptedd.db',
      );
      await Directory(p.dirname(databasePath)).create(recursive: true);
      await File(databasePath).writeAsString('corrupted');

      DatabaseService.databasesPathProvider = () async => tempDir.path;

      var openCalls = 0;
      DatabaseService.databaseOpener =
          (
            String openedPath, {
            int? version,
            OnDatabaseConfigureFn? onConfigure,
            OnDatabaseCreateFn? onCreate,
            OnDatabaseVersionChangeFn? onUpgrade,
            OnDatabaseVersionChangeFn? onDowngrade,
            OnDatabaseOpenFn? onOpen,
            String? password,
            bool readOnly = false,
            bool singleInstance = true,
          }) async {
            expect(openedPath, databasePath);
            expect(singleInstance, false);
            openCalls += 1;
            if (openCalls == 1) {
              throw _FakeDatabaseException(
                'Error Domain=FMDatabase Code=7 "out of memory" sql \'BEGIN EXCLUSIVE\'',
                resultCode: 7,
              );
            }
            return _FakeDatabase();
          };

      await DatabaseService().database;

      expect(openCalls, 2);
      expect(File(databasePath).existsSync(), false);
    },
  );
}

class _FakeDatabase implements Database {
  bool closed = false;

  @override
  Future<void> close() async {
    closed = true;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _FakeDatabaseException extends DatabaseException {
  _FakeDatabaseException(super.message, {this.resultCode = 26});

  final int resultCode;

  @override
  int? getResultCode() => resultCode;

  @override
  Object? get result => null;
}
