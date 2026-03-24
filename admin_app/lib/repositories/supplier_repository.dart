import 'package:uuid/uuid.dart';
import 'package:sqflite_sqlcipher/sqflite.dart';

import '../models/supplier.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';

class SupplierRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  SupplierRepository(this._apiService);

  Future<List<Supplier>> getSuppliers({bool forceRefresh = false}) async {
    final db = await _dbService.database;
    final localData = await db.query('suppliers');

    final localSuppliers = localData
        .map(
          (e) => Supplier.fromJson({
            'id': e['id'],
            'name': e['name'],
            'phone': e['phone'],
            'email': e['email'],
            'address': e['address'],
            'notes': e['notes'],
          }),
        )
        .toList();

    if (forceRefresh || await _syncService.isOnline) {
      try {
        final response = await _apiService.client.get('/admin/suppliers');
        final List<dynamic> remoteData = response.data;
        final remoteSuppliers = remoteData
            .map((e) => Supplier.fromJson(e))
            .toList();

        await db.transaction((txn) async {
          await txn.delete('suppliers', where: "syncStatus = 'synced'");
          for (var s in remoteSuppliers) {
            await txn.insert('suppliers', {
              'id': s.id,
              'name': s.name,
              'phone': s.phone,
              'email': s.email,
              'address': s.address,
              'notes': s.notes,
              'syncStatus': 'synced',
            }, conflictAlgorithm: ConflictAlgorithm.replace);
          }
        });
        return remoteSuppliers;
      } catch (e) {
        print('Background supplier fetch failed: \$e');
      }
    }
    return localSuppliers;
  }

  Future<Supplier> createSupplier(Supplier supplier) async {
    final db = await _dbService.database;
    final online = await _syncService.isOnline;

    final id = const Uuid().v4();
    final newSupplier = Supplier(
      id: id,
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      notes: supplier.notes,
    );

    await db.insert('suppliers', {
      'id': newSupplier.id,
      'name': newSupplier.name,
      'phone': newSupplier.phone,
      'email': newSupplier.email,
      'address': newSupplier.address,
      'notes': newSupplier.notes,
      'syncStatus': online ? 'synced' : 'pending',
    });

    await _syncService.enqueueOperation(
      entityType: 'supplier',
      action: 'create',
      payload: newSupplier.toJson(),
    );

    return newSupplier;
  }

  Future<void> updateSupplier(Supplier supplier) async {
    final db = await _dbService.database;
    final online = await _syncService.isOnline;

    await db.update(
      'suppliers',
      {
        'name': supplier.name,
        'phone': supplier.phone,
        'email': supplier.email,
        'address': supplier.address,
        'notes': supplier.notes,
        'syncStatus': online ? 'synced' : 'pending',
      },
      where: 'id = ?',
      whereArgs: [supplier.id],
    );

    await _syncService.enqueueOperation(
      entityType: 'supplier',
      action: 'update',
      payload: supplier.toJson(),
    );
  }

  Future<void> deleteSupplier(String id) async {
    final db = await _dbService.database;
    await db.delete('suppliers', where: 'id = ?', whereArgs: [id]);

    await _syncService.enqueueOperation(
      entityType: 'supplier',
      action: 'delete',
      payload: {'id': id},
    );
  }
}
