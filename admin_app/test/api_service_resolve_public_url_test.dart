import 'package:admin_app/services/api_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('resolvePublicUrl expands relative upload paths against API origin', () {
    final api = ApiService(baseUrl: 'http://192.168.1.4:3000/api');

    expect(
      api.resolvePublicUrl('/uploads/tenant-1/image.webp'),
      'http://192.168.1.4:3000/uploads/tenant-1/image.webp',
    );
  });

  test(
    'resolvePublicUrl rewrites loopback asset hosts to the configured API host',
    () {
      final api = ApiService(baseUrl: 'http://192.168.1.4:3000/api');

      expect(
        api.resolvePublicUrl(
          'http://localhost:9000/products/tenants/tenant-1/public/image.webp',
        ),
        'http://192.168.1.4:9000/products/tenants/tenant-1/public/image.webp',
      );
    },
  );

  test('resolvePublicUrl keeps non-loopback absolute URLs unchanged', () {
    final api = ApiService(baseUrl: 'http://192.168.1.4:3000/api');

    expect(
      api.resolvePublicUrl('https://cdn.example.com/assets/image.webp'),
      'https://cdn.example.com/assets/image.webp',
    );
  });
}
