import 'package:admin_app/services/api_service.dart';
import 'package:admin_app/services/notification_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('builds notification stream URL from API base URL', () {
    final service = NotificationService(
      () => ApiService(baseUrl: 'https://tenant.swekly.com/api'),
    );

    expect(
      service.streamUriForTest().toString(),
      'https://tenant.swekly.com/api/admin/notifications/stream',
    );
  });

  test('opens explicit notification route', () {
    final service = NotificationService(
      () => ApiService(baseUrl: 'https://tenant.swekly.com/api'),
    );
    final openedRoutes = <String>[];
    service.setRouteHandler(openedRoutes.add);

    service.openRouteFromDataForTest({
      'route': '/orders/order-1',
      'orderId': 'ignored',
    });

    expect(openedRoutes, ['/orders/order-1']);
  });

  test('falls back to order detail route when route is missing', () {
    final service = NotificationService(
      () => ApiService(baseUrl: 'https://tenant.swekly.com/api'),
    );
    final openedRoutes = <String>[];
    service.setRouteHandler(openedRoutes.add);

    service.openRouteFromDataForTest({'orderId': 'order-2'});

    expect(openedRoutes, ['/orders/order-2']);
  });

  test('incoming SSE event displays a local notification payload', () async {
    final shown = <Map<String, Object>>[];
    final service = NotificationService(
      () => ApiService(baseUrl: 'https://tenant.swekly.com/api'),
      localNotificationSink: (title, body, data) async {
        shown.add({'title': title, 'body': body, 'data': data});
      },
    );

    service.handleSseEventForTest(
      '{"title":"New order","body":"Order #A1","data":{"orderId":"order-3","route":"/orders/order-3"}}',
    );

    expect(shown, hasLength(1));
    expect(shown.first['title'], 'New order');
    expect(shown.first['body'], 'Order #A1');
    expect(shown.first['data'], containsPair('orderId', 'order-3'));
  });
}
