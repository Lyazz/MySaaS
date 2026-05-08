import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:sqflite_sqlcipher/sqflite.dart';
import 'package:path/path.dart';
import 'package:uuid/uuid.dart';

class DatabaseService {
  static final DatabaseService _instance = DatabaseService._internal();
  factory DatabaseService() => _instance;
  DatabaseService._internal();

  Database? _db;
  final _secureStorage = const FlutterSecureStorage();
  static const _keyDbEncryption = 'db_encryption_key';
  static const _databaseName = 'mysaas_offline_encryptedd.db';

  Future<Database> get database async {
    if (_db != null) return _db!;
    _db = await _initDb();
    return _db!;
  }

  Future<String> _getEncryptionKey() async {
    String? key = await _secureStorage.read(key: _keyDbEncryption);
    if (key == null) {
      final uuid = const Uuid();
      key = uuid.v4() + uuid.v4();
      await _secureStorage.write(key: _keyDbEncryption, value: key);
    }
    return key;
  }

  Future<Database> _initDb() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, _databaseName);
    final encryptionKey = await _getEncryptionKey();
    return await openDatabase(
      path,
      password: encryptionKey,
      version: 5,
      onCreate: _createDb,
      onUpgrade: _upgradeDb,
    );
  }

  Future<void> _createDb(Database db, int version) async {
    await db.execute('''
      CREATE TABLE sync_queue(
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL DEFAULT '',
        entityType TEXT NOT NULL,
        action TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL,
        retryCount INTEGER NOT NULL DEFAULT 0,
        idempotencyKey TEXT,
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
        currencyCode TEXT,
        currencyCountry TEXT,
        isCompleted INTEGER DEFAULT 1
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
      CREATE TABLE delivery_providers(
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL,
        baseRate REAL NOT NULL,
        isActive INTEGER DEFAULT 1,
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
  }

  /// Deletes all rows scoped to [tenantId] without dropping the database.
  /// Call on logout or reprovisioning.
  Future<void> clearTenantData(String tenantId) async {
    final db = await database;
    const tables = [
      'sync_queue',
      'sync_metadata',
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
      await db.delete(table, where: 'tenantId = ?', whereArgs: [tenantId]);
    }
  }

  Future<void> clearDatabase() async {
    if (_db != null) {
      await _db!.close();
      _db = null;
    }
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, _databaseName);
    await deleteDatabase(path);
    await _secureStorage.delete(key: _keyDbEncryption);
  }
}
