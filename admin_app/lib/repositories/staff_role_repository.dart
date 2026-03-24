import 'dart:convert';
import 'package:uuid/uuid.dart';
import 'package:sqflite_sqlcipher/sqflite.dart';

import '../models/staff_role.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';

class StaffRoleRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  StaffRoleRepository(this._apiService);

  Future<List<StaffRole>> getRoles({bool forceRefresh = false}) async {
    final db = await _dbService.database;
    final localData = await db.query('staff_roles');

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
          await txn.delete('staff_roles', where: "syncStatus = 'synced'");
          for (var r in remoteRoles) {
            await txn.insert('staff_roles', {
              'id': r.id,
              'name': r.name,
              'permissionsJson': jsonEncode(r.permissions),
              'syncStatus': 'synced',
            }, conflictAlgorithm: ConflictAlgorithm.replace);
          }
        });
        return remoteRoles;
      } catch (e) {
        print('Background staff roles fetch failed: \$e');
      }
    }
    return localRoles;
  }

  Future<StaffRole> createRole({
    required String name,
    required List<StaffRolePermissionGroup> permissions,
  }) async {
    final db = await _dbService.database;
    final online = await _syncService.isOnline;
    final id = const Uuid().v4();

    await db.insert('staff_roles', {
      'id': id,
      'name': name.trim(),
      'permissionsJson': jsonEncode(
        permissions.map((p) => p.toJson()).toList(),
      ),
      'syncStatus': online ? 'synced' : 'pending',
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
    final online = await _syncService.isOnline;

    await db.update(
      'staff_roles',
      {
        'name': name.trim(),
        'permissionsJson': jsonEncode(
          permissions.map((p) => p.toJson()).toList(),
        ),
        'syncStatus': online ? 'synced' : 'pending',
      },
      where: 'id = ?',
      whereArgs: [id],
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

    await db.delete('staff_roles', where: 'id = ?', whereArgs: [id]);

    await _syncService.enqueueOperation(
      entityType: 'staffRole',
      action: 'delete',
      payload: {'id': id},
    );
  }
}
