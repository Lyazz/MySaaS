import 'dart:io';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';
import 'package:sqflite_sqlcipher/sqflite.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart' hide openDatabase, getDatabasesPath;

class LocalDbService {
  static final LocalDbService instance = LocalDbService._init();
  static Database? _database;
  
  LocalDbService._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('swekly_offline.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    // If desktop (macOS, Windows, Linux), we need to use sqflite_common_ffi
    if (Platform.isWindows || Platform.isLinux || Platform.isMacOS) {
      sqfliteFfiInit();
      databaseFactory = databaseFactoryFfi;
    }

    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    // TODO: In production, securely store and retrieve this key from flutter_secure_storage
    const encryptionKey = 'offline_tenant_secure_key_123!';

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
      password: encryptionKey,
    );
  }

  Future _createDB(Database db, int version) async {
    const idType = 'TEXT PRIMARY KEY';
    const textType = 'TEXT';
    const intType = 'INTEGER';
    const realType = 'REAL';
    const boolType = 'INTEGER'; // SQLite doesn't have a separate boolean storage class

    // Categories Table
    await db.execute('''
      CREATE TABLE categories (
        id $idType,
        title $textType NOT NULL,
        slug $textType,
        imageUrl $textType,
        createdAt $textType,
        updatedAt $textType
      )
    ''');

    // Products Table
    await db.execute('''
      CREATE TABLE products (
        id $idType,
        categoryId $textType,
        title $textType NOT NULL,
        slug $textType,
        price $realType NOT NULL,
        stock $intType NOT NULL DEFAULT 0,
        isActive $boolType NOT NULL DEFAULT 1,
        createdAt $textType,
        updatedAt $textType,
        FOREIGN KEY (categoryId) REFERENCES categories (id) ON DELETE SET NULL
      )
    ''');

    // Customers Table
    await db.execute('''
      CREATE TABLE customers (
        id $idType,
        name $textType NOT NULL,
        phone $textType,
        email $textType,
        createdAt $textType,
        updatedAt $textType
      )
    ''');

    // Sales Table (POS transactions)
    await db.execute('''
      CREATE TABLE sales (
        id $idType,
        customerId $textType,
        totalAmount $realType NOT NULL,
        status $textType NOT NULL DEFAULT 'COMPLETED',
        source $textType NOT NULL DEFAULT 'POS',
        isSynced $boolType NOT NULL DEFAULT 0,
        createdAt $textType,
        updatedAt $textType,
        FOREIGN KEY (customerId) REFERENCES customers (id) ON DELETE SET NULL
      )
    ''');

    // Sale Items Table
    await db.execute('''
      CREATE TABLE sale_items (
        id $idType,
        saleId $textType NOT NULL,
        productId $textType NOT NULL,
        quantity $intType NOT NULL,
        price $realType NOT NULL,
        FOREIGN KEY (saleId) REFERENCES sales (id) ON DELETE CASCADE,
        FOREIGN KEY (productId) REFERENCES products (id) ON DELETE CASCADE
      )
    ''');
  }

  Future<void> close() async {
    final db = await instance.database;
    db.close();
    _database = null;
  }
}
