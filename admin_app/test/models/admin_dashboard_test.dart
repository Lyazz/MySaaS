import 'package:admin_app/models/admin_dashboard.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('AdminDashboardData.fromJson accepts nested JSON strings', () {
    final data = AdminDashboardData.fromJson({
      'counts': '{"products":4,"categories":2,"orders":7}',
      'last7d': '{"orders":5,"revenue":1250.5}',
      'inventory': '{"lowStockProducts":1,"outOfStockProducts":0}',
      'ordersByStatus': '{"PENDING":3,"DELIVERED":4}',
      'recentOrders':
          '[{"id":"ord_1","status":"PENDING","totalAmount":"900","customerName":"Samir","customerPhone":"0555000000","createdAt":"2026-05-06T10:00:00.000Z"}]',
    });

    expect(data.counts.products, 4);
    expect(data.counts.categories, 2);
    expect(data.counts.orders, 7);
    expect(data.last7d.orders, 5);
    expect(data.last7d.revenue, 1250.5);
    expect(data.inventory.lowStockProducts, 1);
    expect(data.ordersByStatus['PENDING'], 3);
    expect(data.recentOrders, hasLength(1));
    expect(data.recentOrders.first.id, 'ord_1');
  });
}
