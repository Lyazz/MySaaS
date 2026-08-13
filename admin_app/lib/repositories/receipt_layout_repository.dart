import 'package:uuid/uuid.dart';
import 'package:sqflite_sqlcipher/sqflite.dart';

import '../models/receipt_layout.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';
import '../services/tenant_mode_service.dart';

class ReceiptLayoutRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  ReceiptLayoutRepository(this._apiService);

  String get _tid => TenantModeService().activeTenantId;

  Future<List<ReceiptLayout>> getLayouts({bool forceRefresh = false}) async {
    final db = await _dbService.database;
    final localData = await db.query(
      'receipt_layouts',
      where: 'tenantId = ?',
      whereArgs: [_tid],
    );

    final localLayouts = localData
        .map(
          (e) => ReceiptLayout.fromMap({
            'id': e['id'],
            'name': e['name'],
            'showLogo': e['showLogo'] == 1,
            'cachedLogoUrl': e['cachedLogoUrl'],
            'showStoreName': e['showStoreName'] == 1,
            'storeNameOverride': e['storeNameOverride'],
            'showStoreAddress': e['showStoreAddress'] == 1,
            'storeAddressOverride': e['storeAddressOverride'],
            'showStorePhone': e['showStorePhone'] == 1,
            'storePhoneOverride': e['storePhoneOverride'],
            'showStoreEmail': e['showStoreEmail'] == 1,
            'storeEmailOverride': e['storeEmailOverride'],
            'showHeader': e['showHeader'] == 1,
            'headerText': e['headerText'],
            'showDate': e['showDate'] == 1,
            'showOrderNumber': e['showOrderNumber'] == 1,
            'showCustomerInfo': e['showCustomerInfo'] == 1,
            'showFooter': e['showFooter'] == 1,
            'footerText': e['footerText'],
            'showTaxBreakdown': e['showTaxBreakdown'] == 1,
          }),
        )
        .toList();

    if (forceRefresh || await _syncService.isOnline) {
      try {
        final response = await _apiService.client.get(
          '/admin/settings/receipt_layouts',
        );
        final List<dynamic> remoteData = response.data;
        final remoteLayouts = remoteData
            .map((e) => ReceiptLayout.fromMap(e))
            .toList();

        await db.transaction((txn) async {
          await txn.delete(
            'receipt_layouts',
            where: "tenantId = ? AND syncStatus = 'synced'",
            whereArgs: [_tid],
          );
          for (var r in remoteLayouts) {
            await txn.insert('receipt_layouts', {
              'id': r.id,
              'tenantId': _tid,
              'name': r.name,
              'showLogo': r.showLogo ? 1 : 0,
              'cachedLogoUrl': r.cachedLogoUrl,
              'showStoreName': r.showStoreName ? 1 : 0,
              'storeNameOverride': r.storeNameOverride,
              'showStoreAddress': r.showStoreAddress ? 1 : 0,
              'storeAddressOverride': r.storeAddressOverride,
              'showStorePhone': r.showStorePhone ? 1 : 0,
              'storePhoneOverride': r.storePhoneOverride,
              'showStoreEmail': r.showStoreEmail ? 1 : 0,
              'storeEmailOverride': r.storeEmailOverride,
              'showHeader': r.showHeader ? 1 : 0,
              'headerText': r.headerText,
              'showDate': r.showDate ? 1 : 0,
              'showOrderNumber': r.showOrderNumber ? 1 : 0,
              'showCustomerInfo': r.showCustomerInfo ? 1 : 0,
              'showFooter': r.showFooter ? 1 : 0,
              'footerText': r.footerText,
              'showTaxBreakdown': r.showTaxBreakdown ? 1 : 0,
              'syncStatus': 'synced',
            }, conflictAlgorithm: ConflictAlgorithm.replace);
          }
        });
        return remoteLayouts;
      } catch (_) {}
    }
    return localLayouts;
  }

  Future<ReceiptLayout> createLayout(ReceiptLayout layout) async {
    final db = await _dbService.database;

    final id = const Uuid().v4();
    final newLayout = layout.copyWith(id: id);

    await db.insert('receipt_layouts', {
      'id': newLayout.id,
      'tenantId': _tid,
      'name': newLayout.name,
      'showLogo': newLayout.showLogo ? 1 : 0,
      'cachedLogoUrl': newLayout.cachedLogoUrl,
      'showStoreName': newLayout.showStoreName ? 1 : 0,
      'storeNameOverride': newLayout.storeNameOverride,
      'showStoreAddress': newLayout.showStoreAddress ? 1 : 0,
      'storeAddressOverride': newLayout.storeAddressOverride,
      'showStorePhone': newLayout.showStorePhone ? 1 : 0,
      'storePhoneOverride': newLayout.storePhoneOverride,
      'showStoreEmail': newLayout.showStoreEmail ? 1 : 0,
      'storeEmailOverride': newLayout.storeEmailOverride,
      'showHeader': newLayout.showHeader ? 1 : 0,
      'headerText': newLayout.headerText,
      'showDate': newLayout.showDate ? 1 : 0,
      'showOrderNumber': newLayout.showOrderNumber ? 1 : 0,
      'showCustomerInfo': newLayout.showCustomerInfo ? 1 : 0,
      'showFooter': newLayout.showFooter ? 1 : 0,
      'footerText': newLayout.footerText,
      'showTaxBreakdown': newLayout.showTaxBreakdown ? 1 : 0,
      'syncStatus': SyncStatus.pending.name,
    });


    return newLayout;
  }

  Future<void> updateLayout(ReceiptLayout layout) async {
    final db = await _dbService.database;

    await db.update(
      'receipt_layouts',
      {
        'name': layout.name,
        'showLogo': layout.showLogo ? 1 : 0,
        'cachedLogoUrl': layout.cachedLogoUrl,
        'showStoreName': layout.showStoreName ? 1 : 0,
        'storeNameOverride': layout.storeNameOverride,
        'showStoreAddress': layout.showStoreAddress ? 1 : 0,
        'storeAddressOverride': layout.storeAddressOverride,
        'showStorePhone': layout.showStorePhone ? 1 : 0,
        'storePhoneOverride': layout.storePhoneOverride,
        'showStoreEmail': layout.showStoreEmail ? 1 : 0,
        'storeEmailOverride': layout.storeEmailOverride,
        'showHeader': layout.showHeader ? 1 : 0,
        'headerText': layout.headerText,
        'showDate': layout.showDate ? 1 : 0,
        'showOrderNumber': layout.showOrderNumber ? 1 : 0,
        'showCustomerInfo': layout.showCustomerInfo ? 1 : 0,
        'showFooter': layout.showFooter ? 1 : 0,
        'footerText': layout.footerText,
        'showTaxBreakdown': layout.showTaxBreakdown ? 1 : 0,
        'syncStatus': SyncStatus.pending.name,
      },
      where: 'id = ? AND tenantId = ?',
      whereArgs: [layout.id, _tid],
    );

  }

  Future<void> deleteLayout(String id) async {
    final db = await _dbService.database;
    // Deletes outright. This used to only flag the row and leave the
    // actual removal to a sync round-trip that has no endpoint behind
    // it, so deleted entries came back on the next read.
    await db.delete(
      'receipt_layouts',
      where: 'id = ? AND tenantId = ?',
      whereArgs: [id, _tid],
    );
  }
}
