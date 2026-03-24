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

  Future<Database> get database async {
    if (_db != null) return _db!;
    _db = await _initDb();
    return _db!;
  }

  Future<String> _getEncryptionKey() async {
    String? key = await _secureStorage.read(key: _keyDbEncryption);
    if (key == null) {
      // Generate a new 256-bit key (32 bytes)
      final uuid = const Uuid();
      key = uuid.v4() + uuid.v4(); // Simple way to get a long random string
      await _secureStorage.write(key: _keyDbEncryption, value: key);
    }
    return key;
  }

  Future<Database> _initDb() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'mysaas_offline_encrypted.db');

    final encryptionKey = await _getEncryptionKey();

    return await openDatabase(
      path,
      password: encryptionKey,
      version: 2,
      onCreate: _createDb,
      onUpgrade: _upgradeDb,
    );
  }

  Future<void> _createDb(Database db, int version) async {
    // 1. Sync Queue Table
    await db.execute('''
      CREATE TABLE sync_queue(
        id TEXT PRIMARY KEY,
        entityType TEXT NOT NULL,
        action TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL
      )
    ''');

    // 2. Categories Table
    await db.execute('''
      CREATE TABLE categories(
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT NOT NULL,
        imageUrl TEXT,
        productCount INTEGER DEFAULT 0,
        createdAt TEXT
      )
    ''');

    // 3. Products Table
    await db.execute('''
      CREATE TABLE products(
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT NOT NULL,
        miniDescription TEXT,
        description TEXT,
        price REAL NOT NULL,
        stock INTEGER NOT NULL,
        lowStockThreshold INTEGER DEFAULT 5,
        isActive INTEGER NOT NULL, -- 0 or 1
        categoryId TEXT,
        mainImageUrl TEXT,
        syncStatus TEXT DEFAULT 'synced',
        optionsJson TEXT,
        variantsJson TEXT,
        FOREIGN KEY (categoryId) REFERENCES categories (id) ON DELETE SET NULL
      )
    ''');

    // 4. Customers Table
    await db.execute('''
      CREATE TABLE customers(
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        totalSpent REAL DEFAULT 0.0,
        ordersCount INTEGER DEFAULT 0,
        syncStatus TEXT DEFAULT 'synced'
      )
    ''');

    // 5. Sales Table
    await db.execute('''
      CREATE TABLE sales(
        id TEXT PRIMARY KEY,
        customerId TEXT,
        total REAL NOT NULL,
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        payloadJson TEXT NOT NULL, -- The full API payload for sync
        syncStatus TEXT DEFAULT 'synced'
      )
    ''');

    // 6. Users Table
    await db.execute('''
      CREATE TABLE users(
        id TEXT PRIMARY KEY,
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

    // 7. Suppliers Table
    await db.execute('''
      CREATE TABLE suppliers(
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        notes TEXT,
        syncStatus TEXT DEFAULT 'synced'
      )
    ''');

    // 8. Purchases Table
    await db.execute('''
      CREATE TABLE purchases(
        id TEXT PRIMARY KEY,
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

    // 9. Store Settings Table (Singleton cache conceptually)
    await db.execute('''
      CREATE TABLE store_settings(
        id TEXT PRIMARY KEY,
        name TEXT,
        slug TEXT,
        currencyCode TEXT,
        currencyCountry TEXT,
        isCompleted INTEGER DEFAULT 1
      )
    ''');

    // 10. Printer Profiles Table
    await db.execute('''
      CREATE TABLE printer_profiles(
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        transport INTEGER NOT NULL,
        connectionParams TEXT,
        capabilityParams TEXT,
        syncStatus TEXT DEFAULT 'synced'
      )
    ''');

    // 11. Receipt Layouts Table
    await db.execute('''
      CREATE TABLE receipt_layouts(
        id TEXT PRIMARY KEY,
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

    // 12. Cash Sessions & Transactions
    await db.execute('''
      CREATE TABLE cash_sessions(
        id TEXT PRIMARY KEY,
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

    // 13. Customer Payments
    await db.execute('''
      CREATE TABLE customer_payments(
        id TEXT PRIMARY KEY,
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

    // 14. Orders & Delivery
    await db.execute('''
      CREATE TABLE orders(
        id TEXT PRIMARY KEY,
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
        name TEXT NOT NULL,
        baseRate REAL NOT NULL,
        isActive INTEGER DEFAULT 1,
        syncStatus TEXT DEFAULT 'synced'
      )
    ''');

    // 15. Staff Roles
    await db.execute('''
      CREATE TABLE staff_roles(
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        permissionsJson TEXT,
        syncStatus TEXT DEFAULT 'synced'
      )
    ''');

    // 16. Billing
    await db.execute('''
      CREATE TABLE billing_invoices(
        id TEXT PRIMARY KEY,
        amount REAL NOT NULL,
        status TEXT NOT NULL,
        dueDate TEXT,
        pdfUrl TEXT,
        cachedPdfFilePath TEXT
      )
    ''');

    // 17. Dashboard Stats Cache
    await db.execute('''
      CREATE TABLE dashboard_stats(
        id TEXT PRIMARY KEY,
        statsJson TEXT,
        lastUpdated TEXT
      )
    ''');

    // Add indexes for performance
    await db.execute(
      'CREATE INDEX idx_products_category ON products(categoryId)',
    );
    await db.execute(
      'CREATE INDEX idx_sync_queue_status ON sync_queue(status)',
    );
    await db.execute(
      'CREATE INDEX idx_customer_payments_customer ON customer_payments(customerId)',
    );
  }

  Future<void> _upgradeDb(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < 2) {
      await db.execute('ALTER TABLE customer_payments ADD COLUMN customerId TEXT');
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_customer_payments_customer ON customer_payments(customerId)',
      );
    }
  }

  Future<void> clearDatabase() async {
    if (_db != null) {
      await _db!.close();
      _db = null;
    }
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'mysaas_offline_encrypted.db');
    await deleteDatabase(path);
    // Also clear the encryption key so a new one is generated next time
    await _secureStorage.delete(key: _keyDbEncryption);
  }
}
