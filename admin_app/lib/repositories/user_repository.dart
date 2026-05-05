import 'package:uuid/uuid.dart';
import 'package:sqflite_sqlcipher/sqflite.dart';

import '../models/admin_user.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';
import '../services/tenant_mode_service.dart';

class UserRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  UserRepository(this._apiService);

  String get _tid => TenantModeService().activeTenantId;

  Future<List<AdminUser>> getUsers({
    bool forceRefresh = false,
    bool includeInactive = false,
  }) async {
    final db = await _dbService.database;
    final localData = await db.query(
      'users',
      where: 'tenantId = ?',
      whereArgs: [_tid],
    );

    var localUsers = localData
        .map(
          (e) => AdminUser.fromJson({
            'id': e['id'],
            'email': e['email'],
            'role': e['role'],
            'isActive': e['isActive'] == 1,
            'cashboxId': e['cashboxId'],
            'staffRoleId': e['staffRoleId'],
            'createdAt': e['createdAt'],
            'updatedAt': e['updatedAt'],
          }),
        )
        .toList();

    if (!includeInactive) {
      localUsers = localUsers.where((u) => u.isActive).toList();
    }

    if (forceRefresh || await _syncService.isOnline) {
      try {
        final response = await _apiService.client.get(
          '/admin/users',
          queryParameters: {'includeInactive': includeInactive.toString()},
        );
        final data = response.data;
        final rows = (data is List) ? data : const [];
        final remoteUsers = rows
            .whereType<Map>()
            .map((e) => AdminUser.fromJson(e.cast<String, dynamic>()))
            .toList();

        await db.transaction((txn) async {
          await txn.delete(
            'users',
            where: "tenantId = ? AND syncStatus = 'synced'",
            whereArgs: [_tid],
          );
          for (var u in remoteUsers) {
            await txn.insert('users', {
              'id': u.id,
              'tenantId': _tid,
              'email': u.email,
              'role': u.role,
              'isActive': u.isActive ? 1 : 0,
              'cashboxId': u.cashboxId,
              'staffRoleId': u.staffRoleId,
              'createdAt': u.createdAt?.toIso8601String(),
              'updatedAt': u.updatedAt?.toIso8601String(),
              'syncStatus': 'synced',
            }, conflictAlgorithm: ConflictAlgorithm.replace);
          }
        });
        return remoteUsers;
      } catch (_) {}
    }
    return localUsers;
  }

  Future<AdminUser> createUser(Map<String, dynamic> payload) async {
    final db = await _dbService.database;
    final online = await _syncService.isOnline;

    final id = const Uuid().v4();
    payload['id'] = id;
    payload['isActive'] = true;
    payload['createdAt'] = DateTime.now().toIso8601String();

    final newUser = AdminUser.fromJson(payload);

    await db.insert('users', {
      'id': newUser.id,
      'tenantId': _tid,
      'email': newUser.email,
      'role': newUser.role,
      'isActive': newUser.isActive ? 1 : 0,
      'cashboxId': newUser.cashboxId,
      'staffRoleId': newUser.staffRoleId,
      'createdAt': newUser.createdAt?.toIso8601String(),
      'syncStatus': online ? 'synced' : 'pending',
    });

    await _syncService.enqueueOperation(
      entityType: 'user',
      action: 'create',
      payload: payload,
    );

    return newUser;
  }

  Future<AdminUser> updateUser(String id, Map<String, dynamic> payload) async {
    final db = await _dbService.database;
    final online = await _syncService.isOnline;

    final dataToUpdate = <String, dynamic>{
      'syncStatus': online ? 'synced' : 'pending',
    };
    if (payload.containsKey('email')) dataToUpdate['email'] = payload['email'];
    if (payload.containsKey('role')) dataToUpdate['role'] = payload['role'];
    if (payload.containsKey('isActive')) {
      dataToUpdate['isActive'] = payload['isActive'] == true ? 1 : 0;
    }
    if (payload.containsKey('staffRoleId')) {
      dataToUpdate['staffRoleId'] = payload['staffRoleId'];
    }

    await db.update(
      'users',
      dataToUpdate,
      where: 'id = ? AND tenantId = ?',
      whereArgs: [id, _tid],
    );

    final syncPayload = Map<String, dynamic>.from(payload);
    syncPayload['id'] = id;

    await _syncService.enqueueOperation(
      entityType: 'user',
      action: 'update',
      payload: syncPayload,
    );

    final res = await db.query(
      'users',
      where: 'id = ? AND tenantId = ?',
      whereArgs: [id, _tid],
    );
    if (res.isNotEmpty) {
      final e = res.first;
      return AdminUser.fromJson({
        'id': e['id'],
        'email': e['email'],
        'role': e['role'],
        'isActive': e['isActive'] == 1,
        'cashboxId': e['cashboxId'],
        'staffRoleId': e['staffRoleId'],
        'createdAt': e['createdAt'],
        'updatedAt': e['updatedAt'],
      });
    }
    throw Exception('User not found after update');
  }

  Future<void> deleteUser(String id) async {
    final db = await _dbService.database;
    await db.delete(
      'users',
      where: 'id = ? AND tenantId = ?',
      whereArgs: [id, _tid],
    );

    await _syncService.enqueueOperation(
      entityType: 'user',
      action: 'delete',
      payload: {'id': id},
    );
  }
}
