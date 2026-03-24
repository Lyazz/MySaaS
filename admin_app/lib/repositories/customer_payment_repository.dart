import 'package:uuid/uuid.dart';

import '../models/customer_payment.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';

class CustomerPaymentRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  CustomerPaymentRepository(this._apiService);

  Future<List<CustomerPayment>> getPaymentsForCustomer(
    String customerId, {
    bool forceRefresh = false,
  }) async {
    final db = await _dbService.database;
    // We don't cache all payments system-wide usually, just per customer as viewed.
    // For true offline this means we only see what was requested while online, or what was created offline.

    // To keep it simple, fetch online if possible
    if (forceRefresh || await _syncService.isOnline) {
      try {
        final res = await _apiService.client.get(
          '/admin/customers/$customerId/payments',
        );
        final List<dynamic> data = res.data;
        return data.map((e) => CustomerPayment.fromJson(e)).toList();
      } catch (e) {
        print('Background customer payments fetch failed: \$e');
      }
    }

    // If offline, fetch local records created offline that haven't synced yet (or are stored)
    final localData = await db.query(
      'customer_payments',
      where: 'customerId = ?',
      whereArgs: [customerId],
      orderBy: 'createdAt DESC',
    );
    return localData
        .map(
          (e) => CustomerPayment.fromJson({
            'id': e['id'],
            'amount': e['amount'],
            'currency': e['currency'],
            'method': e['method'],
            'reference': e['reference'],
            'note': e['note'],
            'saleId': e['saleId'],
            'createdAt': e['createdAt'],
          }),
        )
        .toList();
  }

  Future<CustomerPayment> addPayment(
    String customerId,
    Map<String, dynamic> payload,
  ) async {
    final db = await _dbService.database;
    final online = await _syncService.isOnline;

    final id = const Uuid().v4();
    final newPayment = CustomerPayment.fromJson({
      'id': id,
      'amount': payload['amount'],
      'currency': payload['currency'] ?? 'DZD',
      'method': payload['method'] ?? 'CASH',
      'reference': payload['reference'],
      'note': payload['note'],
      'saleId': payload['saleId'],
      'createdAt': DateTime.now().toIso8601String(),
    });

    await db.insert('customer_payments', {
      'id': newPayment.id,
      'customerId': customerId,
      'amount': newPayment.amount,
      'currency': newPayment.currency,
      'method': newPayment.method,
      'reference': newPayment.reference,
      'note': newPayment.note,
      'saleId': newPayment.saleId,
      'createdAt': newPayment.createdAt?.toIso8601String(),
      'syncStatus': online ? 'synced' : 'pending',
    });

    await _syncService.enqueueOperation(
      entityType: 'customerPayment',
      action: 'create',
      payload: {'offlineId': id, 'customerId': customerId, ...payload},
    );

    return newPayment;
  }
}
