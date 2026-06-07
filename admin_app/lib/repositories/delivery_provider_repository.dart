import 'package:sqflite_sqlcipher/sqflite.dart';

import '../models/delivery_provider.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_conflict_policy.dart';
import '../services/sync_service.dart';
import '../services/tenant_mode_service.dart';

class DeliveryProviderRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  DeliveryProviderRepository(this._apiService);

  String get _tid => TenantModeService().activeTenantId;

  Future<List<DeliveryProvider>> getProviders({
    bool forceRefresh = false,
  }) async {
    final db = await _dbService.database;
    final localProviders = await _readLocal(db);

    if (forceRefresh || await _syncService.isOnline) {
      try {
        final res = await _apiService.client.get('/admin/delivery/providers');
        final data = res.data is List ? res.data as List : const [];
        final remoteProviders = data
            .whereType<Map>()
            .map((row) => _fromAdminResponse(row.cast<String, dynamic>()))
            .toList();

        await db.transaction((txn) async {
          await txn.delete(
            'delivery_providers',
            where: "tenantId = ? AND syncStatus = 'synced'",
            whereArgs: [_tid],
          );
          for (final provider in remoteProviders) {
            await _upsertLocal(
              txn,
              provider,
              syncStatus: SyncStatus.synced.name,
            );
          }
        });
        return remoteProviders;
      } catch (_) {}
    }

    return localProviders;
  }

  Future<DeliveryProvider> setProviderEnabled(String id, bool enabled) async {
    final trimmed = id.trim().toUpperCase();
    if (trimmed.isEmpty) throw ArgumentError('Provider ID is required');
    final db = await _dbService.database;
    final current = await _findById(db, trimmed);
    if (current == null) throw Exception('Delivery provider not found');

    final updated = current.copyWith(offered: enabled, isEnabled: enabled);
    await _upsertLocal(db, updated, syncStatus: SyncStatus.pending.name);
    await _syncService.enqueueOperation(
      entityType: 'deliveryProvider',
      action: 'update',
      payload: {
        'id': trimmed,
        'offered': enabled,
        'isActive': enabled,
        'baseFingerprint': SyncConflictPolicies.fingerprintDeliveryProvider(
          current,
        ),
      },
    );
    return updated;
  }

  DeliveryProvider _fromAdminResponse(Map<String, dynamic> data) {
    final supports = data['supports'];
    final supportTags = <String>[
      if (supports is Map && supports['quote'] == true) 'rates',
      if (supports is Map && supports['createShipment'] == true) 'shipments',
      if (supports is Map && supports['track'] == true) 'tracking',
      if (supports is Map && supports['webhooks'] == true) 'webhooks',
    ];
    final account = data['account'];
    return DeliveryProvider(
      id: data['provider']?.toString() ?? '',
      name: data['name']?.toString() ?? '',
      description: supportTags.isEmpty ? null : supportTags.join(' • '),
      offered: data['offered'] == true,
      isEnabled:
          data['offered'] == true &&
          account is Map &&
          account['isActive'] == true,
    );
  }

  Future<List<DeliveryProvider>> _readLocal(Database db) async {
    final rows = await db.query(
      'delivery_providers',
      where: 'tenantId = ?',
      whereArgs: [_tid],
      orderBy: 'name ASC',
    );
    return rows
        .map(
          (row) => DeliveryProvider.fromMap({
            'id': row['id'],
            'name': row['name'],
            'description': row['description'],
            'offered': row['offered'],
            'isEnabled': row['isEnabled'],
          }),
        )
        .toList();
  }

  Future<DeliveryProvider?> _findById(Database db, String id) async {
    final rows = await db.query(
      'delivery_providers',
      where: 'id = ? AND tenantId = ?',
      whereArgs: [id, _tid],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    return DeliveryProvider.fromMap({
      'id': rows.first['id'],
      'name': rows.first['name'],
      'description': rows.first['description'],
      'offered': rows.first['offered'],
      'isEnabled': rows.first['isEnabled'],
    });
  }

  Future<void> _upsertLocal(
    DatabaseExecutor db,
    DeliveryProvider provider, {
    required String syncStatus,
  }) async {
    final columns = await _tableInfo(db, 'delivery_providers');
    final values = _withRequiredColumnDefaults(columns, {
      'id': provider.id,
      'tenantId': _tid,
      'name': provider.name,
      'description': provider.description,
      'offered': provider.offered ? 1 : 0,
      'isEnabled': provider.isEnabled ? 1 : 0,
      'syncStatus': syncStatus,
    });
    await db.insert(
      'delivery_providers',
      values,
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<Map<String, Object?>>> _tableInfo(
    DatabaseExecutor db,
    String table,
  ) {
    return db.rawQuery('PRAGMA table_info($table)');
  }

  Map<String, Object?> _withRequiredColumnDefaults(
    List<Map<String, Object?>> columns,
    Map<String, Object?> values,
  ) {
    final result = Map<String, Object?>.from(values);
    for (final column in columns) {
      final name = column['name']?.toString();
      if (name == null || name.isEmpty || result.containsKey(name)) continue;
      final isRequired = column['notnull'] == 1;
      final hasDefault = column['dflt_value'] != null;
      final isPrimaryKey = column['pk'] == 1;
      if (!isRequired || hasDefault || isPrimaryKey) continue;

      final type = (column['type']?.toString() ?? '').toUpperCase();
      if (type.contains('INT')) {
        result[name] = 0;
      } else if (type.contains('REAL') ||
          type.contains('NUM') ||
          type.contains('DEC') ||
          type.contains('DOUBLE') ||
          type.contains('FLOAT')) {
        result[name] = 0.0;
      } else {
        result[name] = '';
      }
    }
    return result;
  }
}
