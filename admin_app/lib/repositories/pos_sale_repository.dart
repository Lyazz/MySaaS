import 'dart:convert';
import 'package:uuid/uuid.dart';

import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';
import '../services/tenant_mode_service.dart';

class PosSaleRepository {
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  PosSaleRepository(ApiService apiService);

  String get _tid => TenantModeService().activeTenantId;

  Future<String> createSale(Map<String, dynamic> payload) async {
    final db = await _dbService.database;
    final online = await _syncService.isOnline;

    final saleId = const Uuid().v4();
    payload['offlineId'] = saleId;

    double total = 0.0;
    final payloadTotal = payload['total'];
    if (payloadTotal is num) {
      total = payloadTotal.toDouble();
    } else if (payloadTotal != null) {
      total = double.tryParse(payloadTotal.toString()) ?? 0.0;
    } else if (payload['payment'] != null &&
        payload['payment']['total'] != null) {
      total = payload['payment']['total'].toDouble();
    } else if (payload['items'] != null) {
      for (var item in (payload['items'] as List)) {
        total += (item['price'] * item['quantity']);
      }
    }

    await db.insert('sales', {
      'id': saleId,
      'tenantId': _tid,
      'customerId': payload['customerId'],
      'total': total,
      'status': 'completed',
      'createdAt': DateTime.now().toIso8601String(),
      'payloadJson': jsonEncode(payload),
      'syncStatus': online ? 'synced' : 'pending',
    });

    await _syncService.enqueueOperation(
      entityType: 'sale',
      action: 'create',
      payload: payload,
    );

    return saleId;
  }
}
