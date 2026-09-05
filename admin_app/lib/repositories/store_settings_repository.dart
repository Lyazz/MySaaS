import 'dart:convert';

import 'package:sqflite_sqlcipher/sqflite.dart';

import '../models/store_settings.dart';
import 'license_guard.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_conflict_policy.dart';
import '../services/sync_service.dart';
import '../services/tenant_mode_service.dart';

class StoreSettingsRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  StoreSettingsRepository(this._apiService);

  String get _tid => TenantModeService().activeTenantId;
  String get _rowId => 'singleton_$_tid';

  Future<StoreSettings> getStoreSettings({bool forceRefresh = false}) async {
    final db = await _dbService.database;
    final localSettings = await _readLocalSettings(db);

    if (forceRefresh || await _syncService.isOnline) {
      try {
        final response = await _apiService.client.get('/admin/store-settings');
        final data = response.data;
        if (data is Map) {
          final remoteSettings = StoreSettings.fromJson(
            Map<String, dynamic>.from(data),
          );
          await _writeLocalSettings(
            db,
            remoteSettings,
            syncStatus: SyncStatus.synced.name,
          );
          return remoteSettings;
        }
      } catch (_) {}
    }

    return localSettings ?? StoreSettings.empty;
  }

  Future<StoreSettings> patchStoreSettings(Map<String, dynamic> patch) async {
    LicenseWritePolicy.ensureAllowed(
      const WriteIntent('storeSettings', 'patch'),
    );
    final db = await _dbService.database;
    final current = await _readLocalSettings(db) ?? StoreSettings.empty;
    final updated = _applyPatch(current, patch);
    final baseFingerprint = SyncConflictPolicies.fingerprintStoreSettings(
      current,
    );

    await _writeLocalSettings(db, updated, syncStatus: SyncStatus.pending.name);
    await _syncService.enqueueOperation(
      entityType: 'storeSettings',
      action: 'patch',
      payload: {
        'id': _rowId,
        'patch': patch,
        'baseFingerprint': baseFingerprint,
      },
    );

    return updated;
  }

  Future<StoreSettings?> _readLocalSettings(Database db) async {
    final rows = await db.query(
      'store_settings',
      where: 'tenantId = ?',
      whereArgs: [_tid],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    return _rowToSettings(rows.first);
  }

  StoreSettings _rowToSettings(Map<String, Object?> row) {
    return StoreSettings.fromJson({
      'name': row['name'],
      'slug': row['slug'],
      'logoUrl': row['logoUrl'],
      'faviconUrl': row['faviconUrl'],
      'primaryColor': row['primaryColor'],
      'useBrandColor': row['useBrandColor'] == 1,
      'templateKey': row['templateKey'],
      'announcementText': row['announcementText'],
      'announcementScrolling': row['announcementScrolling'] == 1,
      'language': row['language'],
      'cartEnabled': row['cartEnabled'] != 0,
      'codEnabled': row['codEnabled'] != 0,
      'orderIdPrefix': row['orderIdPrefix'],
      'minimumOrderAmountDzd': row['minimumOrderAmountDzd'],
      'hideOptionalAddress': row['hideOptionalAddress'] == 1,
      'currencyCode': row['currencyCode'],
      'currencyCountry': row['currencyCountry'],
      'isCompleted': row['isCompleted'] == 1,
      'legalPages': _decodeJsonMap(row['legalPagesJson']),
    });
  }

  Future<void> _writeLocalSettings(
    Database db,
    StoreSettings settings, {
    required String syncStatus,
  }) async {
    await db.insert('store_settings', {
      'id': _rowId,
      'tenantId': _tid,
      'name': settings.name,
      'slug': settings.slug,
      'logoUrl': settings.logoUrl,
      'faviconUrl': settings.faviconUrl,
      'primaryColor': settings.primaryColor,
      'useBrandColor': settings.useBrandColor ? 1 : 0,
      'templateKey': settings.templateKey,
      'announcementText': settings.announcementText,
      'announcementScrolling': settings.announcementScrolling ? 1 : 0,
      'language': settings.language,
      'cartEnabled': settings.cartEnabled ? 1 : 0,
      'codEnabled': settings.codEnabled ? 1 : 0,
      'orderIdPrefix': settings.orderIdPrefix,
      'minimumOrderAmountDzd': settings.minimumOrderAmountDzd,
      'hideOptionalAddress': settings.hideOptionalAddress ? 1 : 0,
      'currencyCode': settings.currencyCode,
      'currencyCountry': settings.currencyCountry,
      'isCompleted': settings.isCompleted ? 1 : 0,
      'legalPagesJson': settings.legalPages.isEmpty
          ? null
          : jsonEncode(settings.legalPages),
      'syncStatus': syncStatus,
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  StoreSettings _applyPatch(StoreSettings current, Map<String, dynamic> patch) {
    return current.copyWith(
      name: patch.containsKey('name') ? patch['name']?.toString() ?? '' : null,
      slug: patch.containsKey('slug') ? patch['slug']?.toString() ?? '' : null,
      logoUrl: patch.containsKey('logoUrl')
          ? patch['logoUrl']?.toString()
          : null,
      faviconUrl: patch.containsKey('faviconUrl')
          ? patch['faviconUrl']?.toString()
          : null,
      primaryColor: patch.containsKey('primaryColor')
          ? patch['primaryColor']?.toString() ?? current.primaryColor
          : null,
      useBrandColor: patch.containsKey('useBrandColor')
          ? patch['useBrandColor'] == true
          : null,
      templateKey: patch.containsKey('templateKey')
          ? patch['templateKey']?.toString() ?? current.templateKey
          : null,
      announcementText: patch.containsKey('announcementText')
          ? patch['announcementText']?.toString() ?? ''
          : null,
      announcementScrolling: patch.containsKey('announcementScrolling')
          ? patch['announcementScrolling'] == true
          : null,
      language: patch.containsKey('language')
          ? patch['language']?.toString() ?? current.language
          : null,
      cartEnabled: patch.containsKey('cartEnabled')
          ? patch['cartEnabled'] != false
          : null,
      codEnabled: patch.containsKey('codEnabled')
          ? patch['codEnabled'] != false
          : null,
      orderIdPrefix: patch.containsKey('orderIdPrefix')
          ? patch['orderIdPrefix']?.toString() ?? current.orderIdPrefix
          : null,
      minimumOrderAmountDzd: patch.containsKey('minimumOrderAmountDzd')
          ? int.tryParse(patch['minimumOrderAmountDzd']?.toString() ?? '')
          : null,
      hideOptionalAddress: patch.containsKey('hideOptionalAddress')
          ? patch['hideOptionalAddress'] == true
          : null,
      currencyCode: patch.containsKey('currencyCode')
          ? patch['currencyCode']?.toString() ?? current.currencyCode
          : null,
      currencyCountry: patch.containsKey('currencyCountry')
          ? patch['currencyCountry']?.toString() ?? current.currencyCountry
          : null,
      isCompleted: patch.containsKey('isCompleted')
          ? patch['isCompleted'] == true
          : null,
      legalPages: patch.containsKey('legalPages')
          ? _decodeJsonMap(patch['legalPages'])
          : null,
    );
  }

  Map<String, dynamic> _decodeJsonMap(dynamic raw) {
    if (raw is Map<String, dynamic>) return raw;
    if (raw is Map) return raw.cast<String, dynamic>();
    if (raw is String && raw.trim().isNotEmpty) {
      final decoded = jsonDecode(raw);
      if (decoded is Map) return decoded.cast<String, dynamic>();
    }
    return const {};
  }
}
