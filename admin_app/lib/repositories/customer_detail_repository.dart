import '../models/customer_detail.dart';
import '../models/customer_sale.dart';
import '../models/customer_payment.dart';
import '../models/customer.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';

class CustomerDetailRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  CustomerDetailRepository(this._apiService);

  Future<CustomerDetail?> getCustomerDetail(
    String id, {
    bool forceRefresh = false,
  }) async {
    final trimmed = id.trim();
    if (trimmed.isEmpty) return null;

    if (forceRefresh || await _syncService.isOnline) {
      final res = await _apiService.client.get('/admin/customers/$trimmed');
      final data = res.data;
      if (data is! Map) return null;
      return CustomerDetail.fromJson(data.cast<String, dynamic>());
    }

    final db = await _dbService.database;
    final customerRows = await db.query(
      'customers',
      where: 'id = ?',
      whereArgs: [trimmed],
      limit: 1,
    );

    Customer? summary;
    if (customerRows.isNotEmpty) {
      final c = customerRows.first;
      summary = Customer.fromJson({
        'id': c['id'],
        'name': c['name'],
        'phone': c['phone'],
        'email': c['email'],
        'address': c['address'],
        'totalSpent': c['totalSpent'],
        'ordersCount': c['ordersCount'],
      });
    }

    final salesRows = await db.query(
      'sales',
      where: 'customerId = ?',
      whereArgs: [trimmed],
      orderBy: 'createdAt DESC',
    );

    final sales = salesRows
        .map(
          (s) => CustomerSale.fromJson({
            'id': s['id'],
            'status': s['status'],
            'totalAmount': s['total'],
            'createdAt': s['createdAt'],
            'updatedAt': s['createdAt'],
          }),
        )
        .toList();

    final paymentsRows = await db.query(
      'customer_payments',
      where: 'customerId = ?',
      whereArgs: [trimmed],
      orderBy: 'createdAt DESC',
    );

    final payments = paymentsRows
        .map(
          (p) => CustomerPayment.fromJson({
            'id': p['id'],
            'amount': p['amount'],
            'currency': p['currency'],
            'method': p['method'],
            'reference': p['reference'],
            'note': p['note'],
            'saleId': p['saleId'],
            'createdAt': p['createdAt'],
          }),
        )
        .toList();

    return CustomerDetail(summary: summary, sales: sales, payments: payments);
  }
}

