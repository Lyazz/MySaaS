import 'package:uuid/uuid.dart';
import 'package:sqflite_sqlcipher/sqflite.dart';

import '../models/customer.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';

class CustomerRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  CustomerRepository(this._apiService);

  /// Get customers: Returns local SQLite data immediately, then fetches from API if online
  Future<List<Customer>> getCustomers({bool forceRefresh = false}) async {
    final db = await _dbService.database;

    // 1. Fetch local data first
    final localData = await db.query('customers');
    final localCustomers = localData.map((e) {
      // Map flat SQLite structure back to JSON for the model parser
      return Customer.fromJson({
        'id': e['id'],
        'name': e['name'],
        'phone': e['phone'],
        'email': e['email'],
        'address': e['address'],
        'totalSpent': e['totalSpent'],
        'ordersCount': e['ordersCount'],
      });
    }).toList();

    // 2. If we are online, fetch from remote to update local cache
    if (forceRefresh || await _syncService.isOnline) {
      try {
        final response = await _apiService.client.get('/admin/customers');
        final List<dynamic> remoteData = response.data;

        final remoteCustomers = remoteData
            .map((e) => Customer.fromJson(e))
            .toList();

        // Transaction to update SQLite cache
        await db.transaction((txn) async {
          // Simplistic cache update: delete all synced and re-insert
          // In a real production app, you might do an UPSERT to preserve local pending edits
          await txn.delete('customers', where: "syncStatus = 'synced'");

          for (var c in remoteCustomers) {
            await txn.insert(
              'customers',
              {
                'id': c.id,
                'name': c.name,
                'phone': c.phone,
                'email': c.email,
                'address': c.address,
                'totalSpent': c.totalSpent,
                'ordersCount': c.ordersCount,
                'syncStatus': 'synced',
              },
              conflictAlgorithm: ConflictAlgorithm.replace,
            ); // Using generic sqflite name requires import if not aliased, assuming replace is safe
          }
        });

        return remoteCustomers;
      } catch (e) {
        print('Background customer fetch failed: \$e');
        // Fallback to local data
      }
    }

    return localCustomers;
  }

  /// Create a customer
  Future<Customer> createCustomer(Map<String, dynamic> customerData) async {
    final online = await _syncService.isOnline;
    final db = await _dbService.database;

    // Generate a temporary offline ID
    final id = const Uuid().v4();
    customerData['id'] = id;

    // Create a local model representation
    final localCustomer = Customer.fromJson(customerData);

    // Write to SQLite
    await db.insert('customers', {
      'id': localCustomer.id,
      'name': localCustomer.name,
      'phone': localCustomer.phone,
      'email': localCustomer.email,
      'address': localCustomer.address,
      'totalSpent': 0.0,
      'ordersCount': 0,
      'syncStatus': online ? 'synced' : 'pending', // Simplified status tracking
    });

    // Write to Sync Queue
    await _syncService.enqueueOperation(
      entityType: 'customer',
      action: 'create',
      payload: customerData,
    );

    return localCustomer;
  }

  Future<Customer?> getCustomerById(String id, {bool forceRefresh = false}) async {
    final trimmed = id.trim();
    if (trimmed.isEmpty) return null;

    final db = await _dbService.database;
    final localData = await db.query(
      'customers',
      where: 'id = ?',
      whereArgs: [trimmed],
      limit: 1,
    );

    Customer? local;
    if (localData.isNotEmpty) {
      final e = localData.first;
      local = Customer.fromJson({
        'id': e['id'],
        'name': e['name'],
        'phone': e['phone'],
        'email': e['email'],
        'address': e['address'],
        'totalSpent': e['totalSpent'],
        'ordersCount': e['ordersCount'],
      });
    }

    if (forceRefresh || await _syncService.isOnline) {
      try {
        final res = await _apiService.client.get('/admin/customers/$trimmed');
        final data = res.data;
        if (data is Map && data['summary'] is Map) {
          final summary =
              Customer.fromJson((data['summary'] as Map).cast<String, dynamic>());
          await db.insert(
            'customers',
            {
              'id': summary.id,
              'name': summary.name,
              'phone': summary.phone,
              'email': summary.email,
              'address': summary.address,
              'totalSpent': summary.totalSpent,
              'ordersCount': summary.ordersCount,
              'syncStatus': 'synced',
            },
            conflictAlgorithm: ConflictAlgorithm.replace,
          );
          return summary;
        }
      } catch (e) {
        print('Background single customer fetch failed: $e');
      }
    }

    return local;
  }

  Future<Customer> updateCustomer(
    String id,
    Map<String, dynamic> update,
  ) async {
    final trimmed = id.trim();
    if (trimmed.isEmpty) throw ArgumentError('Customer ID is required');

    final db = await _dbService.database;
    final online = await _syncService.isOnline;

    final dataToUpdate = <String, Object?>{
      'syncStatus': online ? 'synced' : 'pending',
    };
    if (update.containsKey('name')) dataToUpdate['name'] = update['name'];
    if (update.containsKey('phone')) dataToUpdate['phone'] = update['phone'];
    if (update.containsKey('email')) dataToUpdate['email'] = update['email'];
    if (update.containsKey('address')) dataToUpdate['address'] = update['address'];

    await db.update(
      'customers',
      dataToUpdate,
      where: 'id = ?',
      whereArgs: [trimmed],
    );

    final syncPayload = Map<String, dynamic>.from(update);
    syncPayload['id'] = trimmed;

    await _syncService.enqueueOperation(
      entityType: 'customer',
      action: 'update',
      payload: syncPayload,
    );

    final res = await db.query(
      'customers',
      where: 'id = ?',
      whereArgs: [trimmed],
      limit: 1,
    );
    if (res.isEmpty) {
      throw Exception('Customer not found after update');
    }
    final e = res.first;
    return Customer.fromJson({
      'id': e['id'],
      'name': e['name'],
      'phone': e['phone'],
      'email': e['email'],
      'address': e['address'],
      'totalSpent': e['totalSpent'],
      'ordersCount': e['ordersCount'],
    });
  }
}
