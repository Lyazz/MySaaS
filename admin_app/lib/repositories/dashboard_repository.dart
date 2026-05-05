import 'dart:convert';
import 'package:sqflite_sqlcipher/sqflite.dart';

import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';
import '../services/tenant_mode_service.dart';

class DashboardRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  DashboardRepository(this._apiService);

  String get _tid => TenantModeService().activeTenantId;

  Future<Map<String, dynamic>?> getDashboardStats(
    String period, {
    bool forceRefresh = false,
  }) async {
    final db = await _dbService.database;
    final id = 'stats_$period';
    final localData = await db.query(
      'dashboard_stats',
      where: 'id = ? AND tenantId = ?',
      whereArgs: [id, _tid],
    );

    Map<String, dynamic>? localStats;
    if (localData.isNotEmpty) {
      final e = localData.first;
      if (e['statsJson'] != null) {
        localStats = jsonDecode(e['statsJson'].toString());
      }
    }

    if (forceRefresh || await _syncService.isOnline) {
      try {
        final res = await _apiService.client.get(
          '/admin/dashboard/stats',
          queryParameters: {'period': period},
        );
        final remoteStats = res.data;

        await db.insert('dashboard_stats', {
          'id': id,
          'tenantId': _tid,
          'statsJson': jsonEncode(remoteStats),
          'lastUpdated': DateTime.now().toIso8601String(),
        }, conflictAlgorithm: ConflictAlgorithm.replace);

        return remoteStats;
      } catch (_) {}
    }
    return localStats;
  }
}
