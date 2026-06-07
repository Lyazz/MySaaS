import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:path/path.dart';
import 'package:sqflite_sqlcipher/sqflite.dart';
import 'package:uuid/uuid.dart';

import 'tenant_mode_service.dart';

typedef DatabaseOpener =
    Future<Database> Function(
      String path, {
      int? version,
      OnDatabaseConfigureFn? onConfigure,
      OnDatabaseCreateFn? onCreate,
      OnDatabaseVersionChangeFn? onUpgrade,
      OnDatabaseVersionChangeFn? onDowngrade,
      OnDatabaseOpenFn? onOpen,
      String? password,
      bool readOnly,
      bool singleInstance,
    });

class DatabaseService {
  static final DatabaseService _instance = DatabaseService._internal();
  factory DatabaseService() => _instance;
  DatabaseService._internal();

  Database? _db;
  String? _openNamespaceKey;
  Future<Database>? _openingDatabase;
  String? _openingNamespaceKey;
  final _secureStorage = const FlutterSecureStorage();
  static const _keyDbEncryption = 'db_encryption_key';
  static const _databaseName = 'mysaas_offline_encryptedd.db';
  static const _workspaceDbDirectory = 'tenant_workspace_dbs';

  @visibleForTesting
  static Future<String> Function() databasesPathProvider = getDatabasesPath;

  @visibleForTesting
  static DatabaseOpener databaseOpener = _defaultDatabaseOpener;

  @visibleForTesting
  static DateTime Function() nowProvider = DateTime.now;

  Future<Database> get database async {
    final namespaceKey = TenantModeService().activeNamespaceKey;
    if (_db != null && _openNamespaceKey == namespaceKey) return _db!;
    if (_openingDatabase != null && _openingNamespaceKey == namespaceKey) {
      return _openingDatabase!;
    }
    if (_openingDatabase != null && _openingNamespaceKey != namespaceKey) {
      try {
        await _openingDatabase;
      } catch (_) {}
    }
    if (_db != null && _openNamespaceKey != namespaceKey) {
      await _db!.close();
      _db = null;
      _openNamespaceKey = null;
    }
    final openingDatabase = _initDb(namespaceKey);
    _openingDatabase = openingDatabase;
    _openingNamespaceKey = namespaceKey;
    try {
      final db = await openingDatabase;
      if (identical(_openingDatabase, openingDatabase)) {
        _db = db;
        _openNamespaceKey = namespaceKey;
      }
      return db;
    } finally {
      if (identical(_openingDatabase, openingDatabase)) {
        _openingDatabase = null;
        _openingNamespaceKey = null;
      }
    }
  }

  String _encryptionKeyForNamespace(String namespaceKey) =>
      '$_keyDbEncryption::$namespaceKey';

  static Future<Database> _defaultDatabaseOpener(
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
    return openDatabase(
      path,
      version: version,
      onConfigure: onConfigure,
      onCreate: onCreate,
      onUpgrade: onUpgrade,
      onDowngrade: onDowngrade,
      onOpen: onOpen,
      password: password,
      readOnly: readOnly,
      singleInstance: singleInstance,
    );
  }

  Future<String> _createAndPersistEncryptionKey(String secureStorageKey) async {
    final uuid = const Uuid();
    final key = uuid.v4() + uuid.v4();
    await _secureStorage.write(key: secureStorageKey, value: key);
    return key;
  }

  Future<String> _getEncryptionKey(
    String namespaceKey, {
    required bool allowLegacyFallback,
  }) async {
    final secureStorageKey = _encryptionKeyForNamespace(namespaceKey);
    String? key = await _secureStorage.read(key: secureStorageKey);
    if (key != null && key.trim().isNotEmpty) {
      return key;
    }
    if (allowLegacyFallback) {
      final legacyKey = await _secureStorage.read(key: _keyDbEncryption);
      if (legacyKey != null && legacyKey.trim().isNotEmpty) {
        await _secureStorage.write(key: secureStorageKey, value: legacyKey);
        return legacyKey;
      }
    }
    return _createAndPersistEncryptionKey(secureStorageKey);
  }

  Future<String> _resolveDatabasePath(String namespaceKey) async {
    final dbPath = await databasesPathProvider();
    final directory = Directory(
      join(dbPath, _workspaceDbDirectory, namespaceKey),
    );
    if (!await directory.exists()) {
      await directory.create(recursive: true);
    }
    return join(directory.path, _databaseName);
  }

  Future<void> _migrateLegacyDatabaseIfNeeded(
    String namespaceKey,
    String namespacedPath,
  ) async {
    final legacyPath = join(await databasesPathProvider(), _databaseName);
    final legacyFile = File(legacyPath);
    final namespacedFile = File(namespacedPath);
    if (await namespacedFile.exists() || !await legacyFile.exists()) return;

    await legacyFile.copy(namespacedPath);

    final namespacedKey = _encryptionKeyForNamespace(namespaceKey);
    final legacyKey = await _secureStorage.read(key: _keyDbEncryption);
    final existingNamespacedKey = await _secureStorage.read(key: namespacedKey);
    if (legacyKey != null && existingNamespacedKey == null) {
      await _secureStorage.write(key: namespacedKey, value: legacyKey);
    }
  }

  Future<Database> _initDb(String namespaceKey) async {
    final path = await _resolveDatabasePath(namespaceKey);
    await _migrateLegacyDatabaseIfNeeded(namespaceKey, path);
    final encryptionKey = await _getEncryptionKey(
      namespaceKey,
      allowLegacyFallback: await File(path).exists(),
    );
    try {
      return await _openDatabase(path, encryptionKey);
    } catch (error) {
      if (!await _isRecoverableOpenError(error, path)) {
        rethrow;
      }

      debugPrint(
        'DatabaseService: recreating invalid workspace database at $path',
      );
      await _recoverWorkspaceDatabase(namespaceKey, path);
      final replacementKey = await _getEncryptionKey(
        namespaceKey,
        allowLegacyFallback: false,
      );
      return _openDatabase(path, replacementKey);
    }
  }

  Future<Database> _openDatabase(String path, String encryptionKey) {
    return databaseOpener(
      path,
      password: encryptionKey,
      version: 10,
      onCreate: _createDb,
      onUpgrade: _upgradeDb,
      onOpen: (db) => _backfillWorkspaceScope(db),
      singleInstance: false,
    );
  }

  Future<bool> _isRecoverableOpenError(Object error, String path) async {
    final fileExists = await File(path).exists();
    if (!fileExists) return false;

    final message = error.toString().toLowerCase();
    if (error is DatabaseException) {
      final resultCode = error.getResultCode();
      if (error.isOpenFailedError() ||
          resultCode == 26 ||
          (resultCode == 7 &&
              (message.contains('begin exclusive') ||
                  message.contains('out of memory')))) {
        return true;
      }
    }

    return message.contains('open_failed') ||
        message.contains('file is not a database') ||
        message.contains('sqlite_notadb') ||
        (message.contains('out of memory') &&
            message.contains('begin exclusive'));
  }

  Future<void> _recoverWorkspaceDatabase(
    String namespaceKey,
    String path,
  ) async {
    final originalFile = File(path);
    if (await originalFile.exists()) {
      final quarantinePath =
          '$path.corrupt.${nowProvider().millisecondsSinceEpoch}';
      try {
        await originalFile.rename(quarantinePath);
      } catch (_) {
        await originalFile.delete();
      }
    }

    for (final suffix in const ['-wal', '-shm', '-journal']) {
      final sidecarFile = File('$path$suffix');
      if (await sidecarFile.exists()) {
        await sidecarFile.delete();
      }
    }

    await _secureStorage.delete(key: _encryptionKeyForNamespace(namespaceKey));
  }

  Future<void> _backfillWorkspaceScope(Database db) async {
    final workspaceId = TenantModeService().activeWorkspaceId ?? '';
    await db.execute(
      "UPDATE sync_queue SET workspaceId = ? WHERE IFNULL(workspaceId, '') = ''",
      [workspaceId],
    );
  }

  Future<void> _createDb(Database db, int version) async {
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
        lastError TEXT,
        lastAttemptAt TEXT,
        nextRetryAt TEXT,
        createdAt TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE sync_metadata(
        tenantId TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        updatedAt TEXT NOT NULL,
        PRIMARY KEY (tenantId, key)
      )
    ''');

    await db.execute('''
      CREATE TABLE entity_aliases(
        tenantId TEXT NOT NULL,
        entityType TEXT NOT NULL,
        localId TEXT NOT NULL,
        remoteId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        PRIMARY KEY (tenantId, entityType, localId)
      )
    ''');

    await db.execute('''
      CREATE TABLE categories(
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL,
        slug TEXT NOT NULL,
        imageUrl TEXT,
        productCount INTEGER DEFAULT 0,
        createdAt TEXT,
        syncStatus TEXT DEFAULT 'synced'
      )
    ''');

    await db.execute('''
      CREATE TABLE products(
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL,
        slug TEXT NOT NULL,
        miniDescription TEXT,
        description TEXT,
        price REAL NOT NULL,
        stock INTEGER NOT NULL,
        lowStockThreshold INTEGER DEFAULT 5,
        isActive INTEGER NOT NULL,
        categoryId TEXT,
        mainImageUrl TEXT,
        syncStatus TEXT DEFAULT 'synced',
        optionsJson TEXT,
        variantsJson TEXT,
        FOREIGN KEY (categoryId) REFERENCES categories (id) ON DELETE SET NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE customers(
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        totalSpent REAL DEFAULT 0.0,
        ordersCount INTEGER DEFAULT 0,
        syncStatus TEXT DEFAULT 'synced'
      )
    ''');

    await db.execute('''
      CREATE TABLE sales(
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL DEFAULT '',
        customerId TEXT,
        total REAL NOT NULL,
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        payloadJson TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
      )
    ''');

    await db.execute('''
      CREATE TABLE users(
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL,
        role TEXT NOT NULL,
        isActive INTEGER NOT NULL,
        cashboxId TEXT,
        staffRoleId TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        syncStatus TEXT DEFAULT 'synced'
      )
    ''');

    await db.execute('''
      CREATE TABLE suppliers(
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        notes TEXT,
        syncStatus TEXT DEFAULT 'synced'
      )
    ''');

    await db.execute('''
      CREATE TABLE purchases(
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL DEFAULT '',
        supplierId TEXT,
        supplierName TEXT,
        supplierEmail TEXT,
        supplierPhone TEXT,
        totalAmount REAL NOT NULL,
        status TEXT NOT NULL,
        createdAt TEXT,
        notes TEXT,
        itemsJson TEXT,
        syncStatus TEXT DEFAULT 'synced'
      )
    ''');

    await db.execute('''
      CREATE TABLE store_settings(
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL DEFAULT '',
        name TEXT,
        slug TEXT,
        logoUrl TEXT,
        faviconUrl TEXT,
        primaryColor TEXT DEFAULT '#4F46E5',
        useBrandColor INTEGER DEFAULT 0,
        templateKey TEXT DEFAULT 'modern',
        announcementText TEXT DEFAULT '',
        announcementScrolling INTEGER DEFAULT 0,
        language TEXT DEFAULT 'fr',
        cartEnabled INTEGER DEFAULT 1,
        codEnabled INTEGER DEFAULT 1,
        orderIdPrefix TEXT DEFAULT 'ORD',
        minimumOrderAmountDzd INTEGER DEFAULT 0,
        hideOptionalAddress INTEGER DEFAULT 0,
        currencyCode TEXT,
        currencyCountry TEXT,
        isCompleted INTEGER DEFAULT 1,
        legalPagesJson TEXT,
        syncStatus TEXT DEFAULT 'synced'
      )
    ''');

    await db.execute('''
      CREATE TABLE contact_infos(
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL DEFAULT '',
        kind TEXT NOT NULL,
        label TEXT,
        value TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        isActive INTEGER NOT NULL DEFAULT 1,
        href TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        syncStatus TEXT DEFAULT 'synced'
      )
    ''');

    await db.execute('''
      CREATE TABLE printer_profiles(
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL,
        transport INTEGER NOT NULL,
        connectionParams TEXT,
        capabilityParams TEXT,
        syncStatus TEXT DEFAULT 'synced'
      )
    ''');

    await db.execute('''
      CREATE TABLE receipt_layouts(
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL,
        showLogo INTEGER DEFAULT 1,
        cachedLogoUrl TEXT,
        showStoreName INTEGER DEFAULT 1,
        storeNameOverride TEXT,
        showStoreAddress INTEGER DEFAULT 0,
        storeAddressOverride TEXT,
        showStorePhone INTEGER DEFAULT 0,
        storePhoneOverride TEXT,
        showStoreEmail INTEGER DEFAULT 0,
        storeEmailOverride TEXT,
        showHeader INTEGER DEFAULT 1,
        headerText TEXT,
        showDate INTEGER DEFAULT 1,
        showOrderNumber INTEGER DEFAULT 1,
        showCustomerInfo INTEGER DEFAULT 1,
        showFooter INTEGER DEFAULT 1,
        footerText TEXT,
        showTaxBreakdown INTEGER DEFAULT 1,
        syncStatus TEXT DEFAULT 'synced'
      )
    ''');

    await db.execute('''
      CREATE TABLE cash_sessions(
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL DEFAULT '',
        cashboxId TEXT NOT NULL,
        status TEXT NOT NULL,
        openingFloat REAL NOT NULL,
        openedAt TEXT,
        closedAt TEXT,
        closingCount REAL,
        expectedClosing REAL,
        difference REAL,
        note TEXT,
        openedByUserId TEXT,
        closedByUserId TEXT,
        syncStatus TEXT DEFAULT 'synced'
      )
    ''');

    await db.execute('''
      CREATE TABLE cash_transactions(
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL DEFAULT '',
        cashboxId TEXT NOT NULL,
        sessionId TEXT NOT NULL,
        direction TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT,
        method TEXT,
        customerId TEXT,
        supplierId TEXT,
        saleId TEXT,
        orderId TEXT,
        purchaseOrderId TEXT,
        expenseCategory TEXT,
        transferGroupId TEXT,
        reference TEXT,
        note TEXT,
        createdByUserId TEXT,
        createdAt TEXT,
        syncStatus TEXT DEFAULT 'synced'
      )
    ''');

    await db.execute('''
      CREATE TABLE customer_payments(
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL DEFAULT '',
        customerId TEXT,
        amount REAL NOT NULL,
        currency TEXT,
        method TEXT,
        reference TEXT,
        note TEXT,
        saleId TEXT,
        createdAt TEXT,
        syncStatus TEXT DEFAULT 'synced'
      )
    ''');

    await db.execute('''
      CREATE TABLE orders(
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL,
        total REAL NOT NULL,
        createdAt TEXT,
        customerName TEXT,
        customerPhone TEXT,
        shippingAddress TEXT,
        itemsJson TEXT,
        syncStatus TEXT DEFAULT 'synced'
      )
    ''');

    await db.execute('''
      CREATE TABLE cashboxes(
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL,
        isActive INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT,
        updatedAt TEXT,
        openSessionId TEXT,
        openSessionOpenedAt TEXT,
        openSessionOpeningFloat REAL,
        syncStatus TEXT DEFAULT 'synced'
      )
    ''');

    await db.execute('''
      CREATE TABLE delivery_providers(
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL,
        description TEXT,
        offered INTEGER DEFAULT 0,
        isEnabled INTEGER DEFAULT 0,
        updatedAt TEXT,
        syncStatus TEXT DEFAULT 'synced'
      )
    ''');

    await db.execute('''
      CREATE TABLE staff_roles(
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL,
        permissionsJson TEXT,
        syncStatus TEXT DEFAULT 'synced'
      )
    ''');

    await db.execute('''
      CREATE TABLE billing_invoices(
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL DEFAULT '',
        amount REAL NOT NULL,
        status TEXT NOT NULL,
        dueDate TEXT,
        pdfUrl TEXT,
        cachedPdfFilePath TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE dashboard_stats(
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL DEFAULT '',
        statsJson TEXT,
        lastUpdated TEXT
      )
    ''');

    await _createIndexes(db);
  }

  Future<void> _createIndexes(Database db) async {
    await db.execute(
      'CREATE INDEX idx_products_category ON products(categoryId)',
    );
    await db.execute('CREATE INDEX idx_products_tenant ON products(tenantId)');
    await db.execute(
      'CREATE INDEX idx_sync_queue_status ON sync_queue(status)',
    );
    await db.execute(
      'CREATE INDEX idx_sync_queue_tenant ON sync_queue(tenantId)',
    );
    await db.execute(
      'CREATE INDEX idx_sync_queue_tenant_workspace ON sync_queue(tenantId, workspaceId)',
    );
    await db.execute('CREATE INDEX idx_orders_tenant ON orders(tenantId)');
    await db.execute(
      'CREATE INDEX idx_customers_tenant ON customers(tenantId)',
    );
    await db.execute('CREATE INDEX idx_sales_tenant ON sales(tenantId)');
    await db.execute(
      'CREATE INDEX idx_customer_payments_customer ON customer_payments(customerId)',
    );
    await db.execute(
      'CREATE INDEX idx_customer_payments_tenant ON customer_payments(tenantId)',
    );
    await db.execute(
      'CREATE INDEX idx_cash_sessions_tenant ON cash_sessions(tenantId)',
    );
    await db.execute(
      'CREATE INDEX idx_cash_transactions_tenant ON cash_transactions(tenantId)',
    );
    await db.execute(
      'CREATE INDEX idx_entity_aliases_tenant ON entity_aliases(tenantId)',
    );
    await db.execute(
      'CREATE INDEX idx_contact_infos_tenant ON contact_infos(tenantId)',
    );
    await db.execute(
      'CREATE INDEX idx_cashboxes_tenant ON cashboxes(tenantId)',
    );
  }

  Future<void> _upgradeDb(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < 2) {
      await db.execute(
        'ALTER TABLE customer_payments ADD COLUMN customerId TEXT',
      );
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_customer_payments_customer ON customer_payments(customerId)',
      );
    }
    if (oldVersion < 3) {
      // Add tenantId to every table
      const tables = [
        'sync_queue',
        'categories',
        'products',
        'customers',
        'sales',
        'users',
        'suppliers',
        'purchases',
        'store_settings',
        'printer_profiles',
        'receipt_layouts',
        'cash_sessions',
        'cash_transactions',
        'customer_payments',
        'orders',
        'delivery_providers',
        'staff_roles',
        'billing_invoices',
        'dashboard_stats',
      ];
      for (final table in tables) {
        await db.execute(
          "ALTER TABLE $table ADD COLUMN tenantId TEXT NOT NULL DEFAULT ''",
        );
      }
      // Add retryCount and idempotencyKey to sync_queue
      await db.execute(
        'ALTER TABLE sync_queue ADD COLUMN retryCount INTEGER NOT NULL DEFAULT 0',
      );
      await db.execute('ALTER TABLE sync_queue ADD COLUMN idempotencyKey TEXT');
      // Add tenant indexes
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenantId)',
      );
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_sync_queue_tenant ON sync_queue(tenantId)',
      );
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenantId)',
      );
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenantId)',
      );
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_sales_tenant ON sales(tenantId)',
      );
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_customer_payments_tenant ON customer_payments(tenantId)',
      );
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_cash_sessions_tenant ON cash_sessions(tenantId)',
      );
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_cash_transactions_tenant ON cash_transactions(tenantId)',
      );
    }
    if (oldVersion < 4) {
      await db.execute('''
        CREATE TABLE IF NOT EXISTS sync_metadata(
          tenantId TEXT NOT NULL,
          key TEXT NOT NULL,
          value TEXT,
          updatedAt TEXT NOT NULL,
          PRIMARY KEY (tenantId, key)
        )
      ''');
    }
    if (oldVersion < 5) {
      await db.execute(
        "ALTER TABLE categories ADD COLUMN syncStatus TEXT DEFAULT 'synced'",
      );
    }
    if (oldVersion < 6) {
      await db.execute(
        "ALTER TABLE sync_queue ADD COLUMN workspaceId TEXT NOT NULL DEFAULT ''",
      );
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_sync_queue_tenant_workspace ON sync_queue(tenantId, workspaceId)',
      );
    }
    if (oldVersion < 7) {
      await db.execute('''
        CREATE TABLE IF NOT EXISTS entity_aliases(
          tenantId TEXT NOT NULL,
          entityType TEXT NOT NULL,
          localId TEXT NOT NULL,
          remoteId TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          PRIMARY KEY (tenantId, entityType, localId)
        )
      ''');
      await _safeAddColumn(db, 'store_settings', 'logoUrl TEXT');
      await _safeAddColumn(db, 'store_settings', 'faviconUrl TEXT');
      await _safeAddColumn(
        db,
        'store_settings',
        "primaryColor TEXT DEFAULT '#4F46E5'",
      );
      await _safeAddColumn(
        db,
        'store_settings',
        'useBrandColor INTEGER DEFAULT 0',
      );
      await _safeAddColumn(
        db,
        'store_settings',
        "templateKey TEXT DEFAULT 'modern'",
      );
      await _safeAddColumn(
        db,
        'store_settings',
        "announcementText TEXT DEFAULT ''",
      );
      await _safeAddColumn(
        db,
        'store_settings',
        'announcementScrolling INTEGER DEFAULT 0',
      );
      await _safeAddColumn(db, 'store_settings', "language TEXT DEFAULT 'fr'");
      await _safeAddColumn(
        db,
        'store_settings',
        'cartEnabled INTEGER DEFAULT 1',
      );
      await _safeAddColumn(
        db,
        'store_settings',
        'codEnabled INTEGER DEFAULT 1',
      );
      await _safeAddColumn(
        db,
        'store_settings',
        "orderIdPrefix TEXT DEFAULT 'ORD'",
      );
      await _safeAddColumn(
        db,
        'store_settings',
        'minimumOrderAmountDzd INTEGER DEFAULT 0',
      );
      await _safeAddColumn(
        db,
        'store_settings',
        'hideOptionalAddress INTEGER DEFAULT 0',
      );
      await _safeAddColumn(db, 'store_settings', 'legalPagesJson TEXT');
      await _safeAddColumn(
        db,
        'store_settings',
        "syncStatus TEXT DEFAULT 'synced'",
      );

      await db.execute('''
        CREATE TABLE IF NOT EXISTS contact_infos(
          id TEXT PRIMARY KEY,
          tenantId TEXT NOT NULL DEFAULT '',
          kind TEXT NOT NULL,
          label TEXT,
          value TEXT NOT NULL,
          position INTEGER NOT NULL DEFAULT 0,
          isActive INTEGER NOT NULL DEFAULT 1,
          href TEXT,
          createdAt TEXT,
          updatedAt TEXT,
          syncStatus TEXT DEFAULT 'synced'
        )
      ''');

      await db.execute('''
        CREATE TABLE IF NOT EXISTS cashboxes(
          id TEXT PRIMARY KEY,
          tenantId TEXT NOT NULL DEFAULT '',
          name TEXT NOT NULL,
          isActive INTEGER NOT NULL DEFAULT 1,
          createdAt TEXT,
          updatedAt TEXT,
          openSessionId TEXT,
          openSessionOpenedAt TEXT,
          openSessionOpeningFloat REAL,
          syncStatus TEXT DEFAULT 'synced'
        )
      ''');

      await _safeAddColumn(db, 'delivery_providers', 'description TEXT');
      await _safeAddColumn(
        db,
        'delivery_providers',
        'offered INTEGER DEFAULT 0',
      );
      await _safeAddColumn(
        db,
        'delivery_providers',
        'isEnabled INTEGER DEFAULT 0',
      );
      await _safeAddColumn(db, 'delivery_providers', 'updatedAt TEXT');

      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_entity_aliases_tenant ON entity_aliases(tenantId)',
      );
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_contact_infos_tenant ON contact_infos(tenantId)',
      );
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_cashboxes_tenant ON cashboxes(tenantId)',
      );
    }
    if (oldVersion < 8) {
      await _safeAddColumn(db, 'sync_queue', 'lastError TEXT');
      await _safeAddColumn(db, 'sync_queue', 'lastAttemptAt TEXT');
      await _safeAddColumn(db, 'sync_queue', 'nextRetryAt TEXT');
    }
    if (oldVersion < 9) {
      await _safeAddColumn(db, 'receipt_layouts', 'cachedLogoUrl TEXT');
      await _safeAddColumn(
        db,
        'receipt_layouts',
        'showStoreName INTEGER DEFAULT 1',
      );
      await _safeAddColumn(db, 'receipt_layouts', 'storeNameOverride TEXT');
      await _safeAddColumn(
        db,
        'receipt_layouts',
        'showStoreAddress INTEGER DEFAULT 0',
      );
      await _safeAddColumn(db, 'receipt_layouts', 'storeAddressOverride TEXT');
      await _safeAddColumn(
        db,
        'receipt_layouts',
        'showStorePhone INTEGER DEFAULT 0',
      );
      await _safeAddColumn(db, 'receipt_layouts', 'storePhoneOverride TEXT');
      await _safeAddColumn(
        db,
        'receipt_layouts',
        'showStoreEmail INTEGER DEFAULT 0',
      );
      await _safeAddColumn(db, 'receipt_layouts', 'storeEmailOverride TEXT');
    }
    if (oldVersion < 10) {
      await db.execute(
        "UPDATE sync_queue SET status = 'pending' WHERE status = 'syncing'",
      );
    }
  }

  Future<void> _safeAddColumn(
    Database db,
    String table,
    String definition,
  ) async {
    try {
      await db.execute('ALTER TABLE $table ADD COLUMN $definition');
    } catch (_) {}
  }

  /// Deletes all rows scoped to [tenantId] without dropping the database.
  /// Call on logout or reprovisioning.
  Future<void> clearTenantData(String tenantId) async {
    final db = await database;
    const tables = [
      'sync_queue',
      'sync_metadata',
      'entity_aliases',
      'categories',
      'products',
      'customers',
      'sales',
      'users',
      'suppliers',
      'purchases',
      'store_settings',
      'contact_infos',
      'printer_profiles',
      'receipt_layouts',
      'cashboxes',
      'cash_sessions',
      'cash_transactions',
      'customer_payments',
      'orders',
      'delivery_providers',
      'staff_roles',
      'billing_invoices',
      'dashboard_stats',
    ];
    for (final table in tables) {
      await db.delete(table, where: 'tenantId = ?', whereArgs: [tenantId]);
    }
  }

  Future<void> clearWorkspaceDatabase(String namespaceKey) async {
    if (_openingDatabase != null && _openingNamespaceKey == namespaceKey) {
      try {
        final openingDb = await _openingDatabase;
        if (openingDb != null) {
          await openingDb.close();
        }
      } catch (_) {}
      _openingDatabase = null;
      _openingNamespaceKey = null;
    }
    if (_db != null && _openNamespaceKey == namespaceKey) {
      await _db!.close();
      _db = null;
      _openNamespaceKey = null;
    }
    final path = await _resolveDatabasePath(namespaceKey);
    await deleteDatabase(path);
    await _secureStorage.delete(key: _encryptionKeyForNamespace(namespaceKey));
  }

  Future<void> clearDatabase() async {
    await clearWorkspaceDatabase(TenantModeService().activeNamespaceKey);
  }

  @visibleForTesting
  Future<void> resetForTest() async {
    if (_db != null) {
      await _db!.close();
    }
    _db = null;
    _openNamespaceKey = null;
    _openingDatabase = null;
    _openingNamespaceKey = null;
  }

  @visibleForTesting
  static void resetTestOverrides() {
    databasesPathProvider = getDatabasesPath;
    databaseOpener = _defaultDatabaseOpener;
    nowProvider = DateTime.now;
  }
}
