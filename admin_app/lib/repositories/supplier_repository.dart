import 'package:uuid/uuid.dart';
import 'package:sqflite_sqlcipher/sqflite.dart';

import '../models/supplier.dart';
import 'license_guard.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';
import '../services/tenant_mode_service.dart';

class SupplierRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  SupplierRepository(this._apiService);

  String get _tid => TenantModeService().activeTenantId;

  Future<List<Supplier>> getSuppliers({bool forceRefresh = false}) async {
    final db = await _dbService.database;
    final localData = await db.query(
      'suppliers',
      where: 'tenantId = ?',
      whereArgs: [_tid],
    );

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
          await txn.delete(
            'suppliers',
            where: "tenantId = ? AND syncStatus = 'synced'",
            whereArgs: [_tid],
          );
          for (var s in remoteSuppliers) {
            await txn.insert('suppliers', {
              'id': s.id,
              'tenantId': _tid,
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
      } catch (_) {}
    }
    return localSuppliers;
  }

  Future<Supplier> createSupplier(Supplier supplier) async {
    LicenseWritePolicy.ensureAllowed(const WriteIntent('supplier', 'create'));
    final db = await _dbService.database;

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
      'tenantId': _tid,
      'name': newSupplier.name,
      'phone': newSupplier.phone,
      'email': newSupplier.email,
      'address': newSupplier.address,
      'notes': newSupplier.notes,
      'syncStatus': SyncStatus.pending.name,
    });

    await _syncService.enqueueOperation(
      entityType: 'supplier',
      action: 'create',
      payload: newSupplier.toJson(),
    );

    return newSupplier;
  }

  Future<void> updateSupplier(Supplier supplier) async {
    LicenseWritePolicy.ensureAllowed(const WriteIntent('supplier', 'update'));
    final db = await _dbService.database;

    await db.update(
      'suppliers',
      {
        'name': supplier.name,
        'phone': supplier.phone,
        'email': supplier.email,
        'address': supplier.address,
        'notes': supplier.notes,
        'syncStatus': SyncStatus.pending.name,
      },
      where: 'id = ? AND tenantId = ?',
      whereArgs: [supplier.id, _tid],
    );

    await _syncService.enqueueOperation(
      entityType: 'supplier',
      action: 'update',
      payload: supplier.toJson(),
    );
  }

  Future<void> deleteSupplier(String id) async {
    LicenseWritePolicy.ensureAllowed(const WriteIntent('supplier', 'delete'));
    final db = await _dbService.database;
    await db.update(
      'suppliers',
      {'syncStatus': SyncStatus.pending.name},
      where: 'id = ? AND tenantId = ?',
      whereArgs: [id, _tid],
    );

    await _syncService.enqueueOperation(
      entityType: 'supplier',
      action: 'delete',
      payload: {'id': id},
    );
  }
}
