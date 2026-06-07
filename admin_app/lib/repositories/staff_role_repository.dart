import 'dart:convert';
import 'package:uuid/uuid.dart';
import 'package:sqflite_sqlcipher/sqflite.dart';

import '../models/staff_role.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';
import '../services/tenant_mode_service.dart';

class StaffRoleRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  StaffRoleRepository(this._apiService);

  String get _tid => TenantModeService().activeTenantId;

  Future<List<StaffRole>> getRoles({bool forceRefresh = false}) async {
    final db = await _dbService.database;
    final localData = await db.query(
      'staff_roles',
      where: 'tenantId = ?',
      whereArgs: [_tid],
    );

    final localRoles = localData.map((e) {
      final permissionsJson = e['permissionsJson'] != null
          ? jsonDecode(e['permissionsJson'].toString())
          : {};
      return StaffRole.fromJson({
        'id': e['id'],
        'name': e['name'],
        'permissions': permissionsJson,
      });
    }).toList();

    if (forceRefresh || await _syncService.isOnline) {
      try {
        final res = await _apiService.client.get('/admin/staff-roles');
        final List<dynamic> data = res.data;
        final remoteRoles = data.map((e) => StaffRole.fromJson(e)).toList();

        await db.transaction((txn) async {
          await txn.delete(
            'staff_roles',
            where: "tenantId = ? AND syncStatus = 'synced'",
            whereArgs: [_tid],
          );
          for (var r in remoteRoles) {
            await txn.insert('staff_roles', {
              'id': r.id,
              'tenantId': _tid,
              'name': r.name,
              'permissionsJson': jsonEncode(r.permissions),
              'syncStatus': 'synced',
            }, conflictAlgorithm: ConflictAlgorithm.replace);
          }
        });
        return remoteRoles;
      } catch (_) {}
    }
    return localRoles;
  }

  Future<StaffRole> createRole({
    required String name,
    required List<StaffRolePermissionGroup> permissions,
  }) async {
    final db = await _dbService.database;
    final id = const Uuid().v4();

    await db.insert('staff_roles', {
      'id': id,
      'tenantId': _tid,
      'name': name.trim(),
      'permissionsJson': jsonEncode(
        permissions.map((p) => p.toJson()).toList(),
      ),
      'syncStatus': SyncStatus.pending.name,
    });

    await _syncService.enqueueOperation(
      entityType: 'staffRole',
      action: 'create',
      payload: {
        'offlineId': id,
        'name': name.trim(),
        'permissions': permissions.map((p) => p.toJson()).toList(),
      },
    );

    return StaffRole.fromJson({
      'id': id,
      'name': name.trim(),
      'permissions': permissions.map((p) => p.toJson()).toList(),
    });
  }

  Future<StaffRole> updateRole(
    String id, {
    required String name,
    required List<StaffRolePermissionGroup> permissions,
  }) async {
    final db = await _dbService.database;

    await db.update(
      'staff_roles',
      {
        'name': name.trim(),
        'permissionsJson': jsonEncode(
          permissions.map((p) => p.toJson()).toList(),
        ),
        'syncStatus': SyncStatus.pending.name,
      },
      where: 'id = ? AND tenantId = ?',
      whereArgs: [id, _tid],
    );

    await _syncService.enqueueOperation(
      entityType: 'staffRole',
      action: 'update',
      payload: {
        'id': id,
        'name': name.trim(),
        'permissions': permissions.map((p) => p.toJson()).toList(),
      },
    );

    return StaffRole.fromJson({
      'id': id,
      'name': name.trim(),
      'permissions': permissions.map((p) => p.toJson()).toList(),
    });
  }

  Future<void> deleteRole(String id) async {
    final db = await _dbService.database;

    await db.update(
      'staff_roles',
      {'syncStatus': SyncStatus.pending.name},
      where: 'id = ? AND tenantId = ?',
      whereArgs: [id, _tid],
    );

    await _syncService.enqueueOperation(
      entityType: 'staffRole',
      action: 'delete',
      payload: {'id': id},
    );
  }
}
