import 'package:sqflite_sqlcipher/sqflite.dart';
import 'package:uuid/uuid.dart';

import '../models/contact_info.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_conflict_policy.dart';
import '../services/sync_service.dart';
import '../services/tenant_mode_service.dart';

class ContactInfosRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  ContactInfosRepository(this._apiService);

  String get _tid => TenantModeService().activeTenantId;

  Future<List<ContactInfo>> list({bool forceRefresh = false}) async {
    final db = await _dbService.database;
    final localItems = await _readLocal(db);

    if (forceRefresh || await _syncService.isOnline) {
      try {
        final res = await _apiService.client.get('/admin/contact-infos');
        final data = res.data;
        final items = data is Map && data['items'] is List
            ? (data['items'] as List)
                  .whereType<Map>()
                  .map(
                    (item) =>
                        ContactInfo.fromJson(Map<String, dynamic>.from(item)),
                  )
                  .toList()
            : <ContactInfo>[];
        await db.transaction((txn) async {
          await txn.delete(
            'contact_infos',
            where: "tenantId = ? AND syncStatus = 'synced'",
            whereArgs: [_tid],
          );
          for (final item in items) {
            await _upsertLocal(txn, item, syncStatus: SyncStatus.synced.name);
          }
        });
        return items;
      } catch (_) {}
    }

    return localItems;
  }

  Future<ContactInfo> create(Map<String, dynamic> payload) async {
    final db = await _dbService.database;
    final offlineId = const Uuid().v4();
    final item = ContactInfo.fromJson({
      'id': offlineId,
      ...payload,
      'href': payload['href'],
    });

    await _upsertLocal(db, item, syncStatus: SyncStatus.pending.name);
    await _syncService.enqueueOperation(
      entityType: 'contactInfo',
      action: 'create',
      payload: {'offlineId': offlineId, ...payload},
    );

    return item;
  }

  Future<ContactInfo> update(String id, Map<String, dynamic> payload) async {
    final trimmed = id.trim();
    if (trimmed.isEmpty) throw ArgumentError('Contact info ID is required');
    final db = await _dbService.database;
    final current = await _findById(db, trimmed);
    if (current == null) throw Exception('Contact info not found');

    final updated = ContactInfo.fromJson({
      ...current.toJson(),
      ...payload,
      'id': trimmed,
    });

    await _upsertLocal(db, updated, syncStatus: SyncStatus.pending.name);
    await _syncService.enqueueOperation(
      entityType: 'contactInfo',
      action: 'update',
      payload: {
        'id': trimmed,
        ...payload,
        'baseFingerprint': SyncConflictPolicies.fingerprintContactInfo(current),
      },
    );

    return updated;
  }

  Future<void> delete(String id) async {
    final trimmed = id.trim();
    if (trimmed.isEmpty) throw ArgumentError('Contact info ID is required');
    final db = await _dbService.database;
    final current = await _findById(db, trimmed);
    if (current == null) return;

    await db.update(
      'contact_infos',
      {'syncStatus': SyncStatus.pending.name},
      where: 'id = ? AND tenantId = ?',
      whereArgs: [trimmed, _tid],
    );
    await _syncService.enqueueOperation(
      entityType: 'contactInfo',
      action: 'delete',
      payload: {
        'id': trimmed,
        'baseFingerprint': SyncConflictPolicies.fingerprintContactInfo(current),
      },
    );
  }

  Future<List<ContactInfo>> _readLocal(Database db) async {
    final rows = await db.query(
      'contact_infos',
      where: 'tenantId = ?',
      whereArgs: [_tid],
      orderBy: 'position ASC, createdAt ASC',
    );
    return rows.map(_rowToContactInfo).toList();
  }

  Future<ContactInfo?> _findById(Database db, String id) async {
    final rows = await db.query(
      'contact_infos',
      where: 'id = ? AND tenantId = ?',
      whereArgs: [id, _tid],
      limit: 1,
    );
    return rows.isEmpty ? null : _rowToContactInfo(rows.first);
  }

  ContactInfo _rowToContactInfo(Map<String, Object?> row) {
    return ContactInfo.fromJson({
      'id': row['id'],
      'kind': row['kind'],
      'label': row['label'],
      'value': row['value'],
      'position': row['position'],
      'isActive': row['isActive'] == 1,
      'href': row['href'],
    });
  }

  Future<void> _upsertLocal(
    DatabaseExecutor db,
    ContactInfo item, {
    required String syncStatus,
  }) async {
    await db.insert('contact_infos', {
      'id': item.id,
      'tenantId': _tid,
      'kind': item.kind,
      'label': item.label,
      'value': item.value,
      'position': item.position,
      'isActive': item.isActive ? 1 : 0,
      'href': item.href,
      'syncStatus': syncStatus,
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }
}
