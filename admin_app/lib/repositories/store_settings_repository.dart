import 'package:sqflite_sqlcipher/sqflite.dart';

import '../models/store_settings.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';
import '../services/tenant_mode_service.dart';

class StoreSettingsRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  StoreSettingsRepository(this._apiService);

  String get _tid => TenantModeService().activeTenantId;

  Future<StoreSettings> getStoreSettings({bool forceRefresh = false}) async {
    final db = await _dbService.database;
    final localData = await db.query(
      'store_settings',
      where: 'tenantId = ?',
      whereArgs: [_tid],
      limit: 1,
    );

    StoreSettings localSettings = StoreSettings.empty;
    if (localData.isNotEmpty) {
      final e = localData.first;
      localSettings = StoreSettings.fromJson({
        'name': e['name'],
        'slug': e['slug'],
        'currencyCode': e['currencyCode'],
        'currencyCountry': e['currencyCountry'],
        'isCompleted': e['isCompleted'] == 1,
      });
    }

    if (forceRefresh || await _syncService.isOnline) {
      try {
        final response = await _apiService.client.get('/admin/store-settings');
        final data = response.data;
        if (data is Map) {
          final remoteSettings = StoreSettings.fromJson(
            Map<String, dynamic>.from(data),
          );

          await db.transaction((txn) async {
            await txn.delete(
              'store_settings',
              where: 'tenantId = ?',
              whereArgs: [_tid],
            );
            await txn.insert('store_settings', {
              'id': 'singleton_$_tid',
              'tenantId': _tid,
              'name': remoteSettings.name,
              'slug': remoteSettings.slug,
              'currencyCode': remoteSettings.currencyCode,
              'currencyCountry': remoteSettings.currencyCountry,
              'isCompleted': remoteSettings.isCompleted ? 1 : 0,
            });
          });
          return remoteSettings;
        }
      } catch (_) {
        // Keep the local cache when the remote admin endpoint is unavailable.
      }
    }

    return localSettings;
  }

  Future<StoreSettings> patchStoreSettings(Map<String, dynamic> patch) async {
    final res = await _apiService.client.patch(
      '/admin/store-settings',
      data: patch,
    );
    final data = res.data;
    final settings = StoreSettings.fromJson(
      data is Map ? Map<String, dynamic>.from(data) : {},
    );

    final db = await _dbService.database;
    await db.insert('store_settings', {
      'id': 'singleton_$_tid',
      'tenantId': _tid,
      'name': settings.name,
      'slug': settings.slug,
      'currencyCode': settings.currencyCode,
      'currencyCountry': settings.currencyCountry,
      'isCompleted': settings.isCompleted ? 1 : 0,
    }, conflictAlgorithm: ConflictAlgorithm.replace);

    return settings;
  }
}
