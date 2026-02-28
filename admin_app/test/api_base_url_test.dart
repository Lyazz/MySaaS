import 'package:admin_app/utils/api_base_url.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('normalizeApiBaseUrl', () {
    test('adds /api and keeps https', () {
      expect(
        normalizeApiBaseUrl('https://tenant.platform.com'),
        'https://tenant.platform.com/api',
      );
      expect(
        normalizeApiBaseUrl('https://tenant.platform.com/api'),
        'https://tenant.platform.com/api',
      );
      expect(
        normalizeApiBaseUrl('tenant.platform.com'),
        'https://tenant.platform.com/api',
      );
    });

    test('defaults to http for localhost and IPs', () {
      expect(
        normalizeApiBaseUrl('apple.localhost:3000'),
        'http://apple.localhost:3000/api',
      );
      expect(
        normalizeApiBaseUrl('http://apple.localhost:3000'),
        'http://apple.localhost:3000/api',
      );
      expect(
        normalizeApiBaseUrl('192.168.1.4:3000'),
        'http://192.168.1.4:3000/api',
      );
    });

    test('rejects empty/invalid', () {
      expect(normalizeApiBaseUrl(''), '');
      expect(normalizeApiBaseUrl('   '), '');
      expect(normalizeApiBaseUrl('nota url'), '');
    });
  });
}
