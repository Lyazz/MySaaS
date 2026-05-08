import 'dart:convert';
import 'package:sqflite_sqlcipher/sqflite.dart';

import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';
import '../services/tenant_mode_service.dart';

Map<String, dynamic>? parseDashboardStatsPayload(dynamic payload) {
  if (payload is Map<String, dynamic>) return payload;

  if (payload is Map) {
    return payload.map((key, value) => MapEntry(key.toString(), value));
  }

  if (payload is String) {
    final trimmed = payload.trim();
    if (trimmed.isEmpty) return null;

    try {
      final decoded = jsonDecode(trimmed);
      return parseDashboardStatsPayload(decoded);
    } catch (_) {
      return null;
    }
  }

  return null;
}

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
        localStats = parseDashboardStatsPayload(e['statsJson']);
      }
    }

    if (forceRefresh || await _syncService.isOnline) {
      try {
        final res = await _apiService.client.get(
          '/admin/dashboard',
          queryParameters: {'range': period},
        );
        final remoteStats = parseDashboardStatsPayload(res.data);
        if (remoteStats == null) return localStats;

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
