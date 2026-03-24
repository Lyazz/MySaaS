import 'package:uuid/uuid.dart';
import 'package:sqflite_sqlcipher/sqflite.dart';

import '../models/receipt_layout.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';

class ReceiptLayoutRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  ReceiptLayoutRepository(this._apiService);

  Future<List<ReceiptLayout>> getLayouts({bool forceRefresh = false}) async {
    final db = await _dbService.database;
    final localData = await db.query('receipt_layouts');

    final localLayouts = localData
        .map(
          (e) => ReceiptLayout.fromMap({
            'id': e['id'],
            'name': e['name'],
            'showLogo': e['showLogo'] == 1,
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
          await txn.delete('receipt_layouts', where: "syncStatus = 'synced'");
          for (var r in remoteLayouts) {
            await txn.insert('receipt_layouts', {
              'id': r.id,
              'name': r.name,
              'showLogo': r.showLogo ? 1 : 0,
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
      } catch (e) {
        print('Background receipt layout fetch failed: \$e');
      }
    }
    return localLayouts;
  }

  Future<ReceiptLayout> createLayout(ReceiptLayout layout) async {
    final db = await _dbService.database;
    final online = await _syncService.isOnline;

    final id = const Uuid().v4();
    final newLayout = ReceiptLayout(
      id: id,
      name: layout.name,
      showLogo: layout.showLogo,
      showHeader: layout.showHeader,
      headerText: layout.headerText,
      showDate: layout.showDate,
      showOrderNumber: layout.showOrderNumber,
      showCustomerInfo: layout.showCustomerInfo,
      showFooter: layout.showFooter,
      footerText: layout.footerText,
      showTaxBreakdown: layout.showTaxBreakdown,
    );

    await db.insert('receipt_layouts', {
      'id': newLayout.id,
      'name': newLayout.name,
      'showLogo': newLayout.showLogo ? 1 : 0,
      'showHeader': newLayout.showHeader ? 1 : 0,
      'headerText': newLayout.headerText,
      'showDate': newLayout.showDate ? 1 : 0,
      'showOrderNumber': newLayout.showOrderNumber ? 1 : 0,
      'showCustomerInfo': newLayout.showCustomerInfo ? 1 : 0,
      'showFooter': newLayout.showFooter ? 1 : 0,
      'footerText': newLayout.footerText,
      'showTaxBreakdown': newLayout.showTaxBreakdown ? 1 : 0,
      'syncStatus': online ? 'synced' : 'pending',
    });

    await _syncService.enqueueOperation(
      entityType: 'receiptLayout',
      action: 'create',
      payload: newLayout.toMap(),
    );

    return newLayout;
  }

  Future<void> updateLayout(ReceiptLayout layout) async {
    final db = await _dbService.database;
    final online = await _syncService.isOnline;

    await db.update(
      'receipt_layouts',
      {
        'name': layout.name,
        'showLogo': layout.showLogo ? 1 : 0,
        'showHeader': layout.showHeader ? 1 : 0,
        'headerText': layout.headerText,
        'showDate': layout.showDate ? 1 : 0,
        'showOrderNumber': layout.showOrderNumber ? 1 : 0,
        'showCustomerInfo': layout.showCustomerInfo ? 1 : 0,
        'showFooter': layout.showFooter ? 1 : 0,
        'footerText': layout.footerText,
        'showTaxBreakdown': layout.showTaxBreakdown ? 1 : 0,
        'syncStatus': online ? 'synced' : 'pending',
      },
      where: 'id = ?',
      whereArgs: [layout.id],
    );

    await _syncService.enqueueOperation(
      entityType: 'receiptLayout',
      action: 'update',
      payload: layout.toMap(),
    );
  }

  Future<void> deleteLayout(String id) async {
    final db = await _dbService.database;
    await db.delete('receipt_layouts', where: 'id = ?', whereArgs: [id]);

    await _syncService.enqueueOperation(
      entityType: 'receiptLayout',
      action: 'delete',
      payload: {'id': id},
    );
  }
}
