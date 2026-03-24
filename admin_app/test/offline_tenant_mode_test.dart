import 'package:admin_app/services/api_service.dart';
import 'package:admin_app/services/sync_service.dart';
import 'package:admin_app/services/tenant_mode_service.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('TenantModeService blocks non-billing admin requests when offline', () {
    final mode = TenantModeService();
    mode.setOfflineTenant(true);

    expect(mode.isRequestAllowed('/login'), true);
    expect(mode.isRequestAllowed('/me'), true);
    expect(mode.isRequestAllowed('/admin/billing/invoices'), true);

    expect(mode.isRequestAllowed('/admin/products'), false);
    expect(mode.isRequestAllowed('/admin/orders'), false);
    expect(mode.isRequestAllowed('/upload'), false);

    mode.setOfflineTenant(false);
    expect(mode.isRequestAllowed('/admin/products'), true);
  });

  test('ApiService rejects blocked requests when offline tenant', () async {
    TenantModeService().setOfflineTenant(true);
    final api = ApiService(baseUrl: 'http://localhost:3000/api');

    try {
      await api.client.get('/admin/products');
      fail('Expected DioException');
    } catch (e) {
      expect(e, isA<DioException>());
      final ex = e as DioException;
      expect(ex.type, DioExceptionType.cancel);
    } finally {
      TenantModeService().setOfflineTenant(false);
    }
  });

  test('SyncService.isOnline returns false for offline tenants', () async {
    final sync = SyncService();
    sync.setOfflineTenant(true);
    expect(await sync.isOnline, false);
  });
}

