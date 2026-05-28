import 'package:uuid/uuid.dart';
import 'package:sqflite_sqlcipher/sqflite.dart';

import '../models/customer.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';
import '../services/tenant_mode_service.dart';

class CustomerRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  CustomerRepository(this._apiService);

  String get _tid => TenantModeService().activeTenantId;

  Customer _fromRow(Map<String, Object?> e) => Customer.fromJson({
    'id': e['id'],
    'name': e['name'],
    'phone': e['phone'],
    'email': e['email'],
    'address': e['address'],
    'totalSpent': e['totalSpent'],
    'ordersCount': e['ordersCount'],
  });

  Future<List<Customer>> getCustomers({bool forceRefresh = false}) async {
    final db = await _dbService.database;
    final localData = await db.query(
      'customers',
      where: 'tenantId = ?',
      whereArgs: [_tid],
    );
    final localCustomers = localData.map(_fromRow).toList();

    if (forceRefresh || await _syncService.isOnline) {
      try {
        final response = await _apiService.client.get('/admin/customers');
        final remoteCustomers = (response.data as List<dynamic>)
            .map((e) => Customer.fromJson(e))
            .toList();
        await db.transaction((txn) async {
          await txn.delete(
            'customers',
            where: "tenantId = ? AND syncStatus = 'synced'",
            whereArgs: [_tid],
          );
          for (var c in remoteCustomers) {
            await txn.insert('customers', {
              'id': c.id,
              'tenantId': _tid,
              'name': c.name,
              'phone': c.phone,
              'email': c.email,
              'address': c.address,
              'totalSpent': c.totalSpent,
              'ordersCount': c.ordersCount,
              'syncStatus': 'synced',
            }, conflictAlgorithm: ConflictAlgorithm.replace);
          }
        });
        return remoteCustomers;
      } catch (_) {}
    }
    return localCustomers;
  }

  Future<Customer> createCustomer(Map<String, dynamic> customerData) async {
    final online = await _syncService.isOnline;
    final db = await _dbService.database;
    final id = const Uuid().v4();
    customerData['id'] = id;
    final localCustomer = Customer.fromJson(customerData);
    await db.insert('customers', {
      'id': localCustomer.id,
      'tenantId': _tid,
      'name': localCustomer.name,
      'phone': localCustomer.phone,
      'email': localCustomer.email,
      'address': localCustomer.address,
      'totalSpent': 0.0,
      'ordersCount': 0,
      'syncStatus': online ? 'synced' : 'pending',
    });
    await _syncService.enqueueOperation(
      entityType: 'customer',
      action: 'create',
      payload: customerData,
    );
    return localCustomer;
  }

  Future<Customer?> getCustomerById(
    String id, {
    bool forceRefresh = false,
  }) async {
    final trimmed = id.trim();
    if (trimmed.isEmpty) return null;
    final db = await _dbService.database;
    final localData = await db.query(
      'customers',
      where: 'id = ? AND tenantId = ?',
      whereArgs: [trimmed, _tid],
      limit: 1,
    );
    Customer? local = localData.isNotEmpty ? _fromRow(localData.first) : null;

    if (forceRefresh || await _syncService.isOnline) {
      try {
        final res = await _apiService.client.get('/admin/customers/$trimmed');
        final data = res.data;
        if (data is Map && data['summary'] is Map) {
          final summary = Customer.fromJson(
            (data['summary'] as Map).cast<String, dynamic>(),
          );
          await db.insert('customers', {
            'id': summary.id,
            'tenantId': _tid,
            'name': summary.name,
            'phone': summary.phone,
            'email': summary.email,
            'address': summary.address,
            'totalSpent': summary.totalSpent,
            'ordersCount': summary.ordersCount,
            'syncStatus': 'synced',
          }, conflictAlgorithm: ConflictAlgorithm.replace);
          return summary;
        }
      } catch (_) {}
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
    if (update.containsKey('address'))
      dataToUpdate['address'] = update['address'];
    await db.update(
      'customers',
      dataToUpdate,
      where: 'id = ? AND tenantId = ?',
      whereArgs: [trimmed, _tid],
    );
    final syncPayload = Map<String, dynamic>.from(update)..['id'] = trimmed;
    await _syncService.enqueueOperation(
      entityType: 'customer',
      action: 'update',
      payload: syncPayload,
    );
    final res = await db.query(
      'customers',
      where: 'id = ? AND tenantId = ?',
      whereArgs: [trimmed, _tid],
      limit: 1,
    );
    if (res.isEmpty) throw Exception('Customer not found after update');
    return _fromRow(res.first);
  }
}
