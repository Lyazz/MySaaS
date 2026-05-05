import 'package:sqflite_sqlcipher/sqflite.dart';

import '../models/billing_models.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';
import '../services/tenant_mode_service.dart';

class BillingRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  BillingRepository(this._apiService);

  String get _tid => TenantModeService().activeTenantId;

  Future<Subscription> getSubscription({bool forceRefresh = false}) async {
    return Subscription(
      planCode: 'pro',
      status: 'ACTIVE',
      nextBillingDate: DateTime.now().add(const Duration(days: 15)),
    );
  }

  Future<List<Invoice>> getInvoices({bool forceRefresh = false}) async {
    final db = await _dbService.database;
    final localData = await db.query(
      'billing_invoices',
      where: 'tenantId = ?',
      whereArgs: [_tid],
    );

    final localInvoices = localData
        .map(
          (e) => Invoice.fromJson({
            'id': e['id'],
            'amount': e['amount'],
            'status': e['status'],
            'dueDate': e['dueDate'],
            'pdfUrl': e['pdfUrl'],
          }),
        )
        .toList();

    if (forceRefresh || await _syncService.isOnline) {
      try {
        final res = await _apiService.client.get('/admin/billing/invoices');
        final List<dynamic> data = res.data['invoices'] ?? [];
        final remoteInvoices = data.map((e) => Invoice.fromJson(e)).toList();

        await db.transaction((txn) async {
          await txn.delete('billing_invoices', where: 'tenantId = ?', whereArgs: [_tid]);
          for (var i in remoteInvoices) {
            await txn.insert('billing_invoices', {
              'id': i.id,
              'tenantId': _tid,
              'amount': i.amount,
              'status': i.status,
              'dueDate': i.dueDate?.toIso8601String(),
              'pdfUrl': i.pdfUrl,
            }, conflictAlgorithm: ConflictAlgorithm.replace);
          }
        });
        return remoteInvoices;
      } catch (_) {}
    }
    return localInvoices;
  }
}
