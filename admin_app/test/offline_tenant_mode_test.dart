import 'package:admin_app/models/app_mode.dart';
import 'package:admin_app/services/api_service.dart';
import 'package:admin_app/services/sync_service.dart';
import 'package:admin_app/services/tenant_mode_service.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  setUp(() {
    // Reset to online before each test.
    TenantModeService().initialize(mode: AppMode.online, tenantId: '');
  });

  test(
    'TenantModeService blocks admin network requests for offline-only tenants',
    () {
      TenantModeService().initialize(
        mode: AppMode.offlineOnly,
        tenantId: 'tenant-1',
      );

      expect(TenantModeService().isRequestAllowed('/login'), true);
      expect(TenantModeService().isRequestAllowed('/me'), true);

      expect(
        TenantModeService().isRequestAllowed('/admin/billing/subscription'),
        false,
      );
      expect(TenantModeService().isRequestAllowed('/admin/products'), false);
      expect(TenantModeService().isRequestAllowed('/admin/orders'), false);
      expect(
        TenantModeService().isRequestAllowed('/admin/contact-infos'),
        false,
      );
      expect(TenantModeService().isRequestAllowed('/upload'), false);

      TenantModeService().initialize(mode: AppMode.online, tenantId: '');
      expect(TenantModeService().isRequestAllowed('/admin/products'), true);
    },
  );

  test('ApiService rejects blocked requests when offline tenant', () async {
    TenantModeService().initialize(
      mode: AppMode.offlineOnly,
      tenantId: 'tenant-1',
    );
    final api = ApiService(baseUrl: 'http://localhost:3000/api');

    try {
      await api.client.get('/admin/products');
      fail('Expected DioException');
    } catch (e) {
      expect(e, isA<DioException>());
      final ex = e as DioException;
      expect(ex.type, DioExceptionType.cancel);
    }
  });

  test('SyncService.isOnline returns false in offlineOnly mode', () async {
    final api = ApiService(baseUrl: 'http://localhost:3000/api');
    SyncService().initialize(api, mode: AppMode.offlineOnly);
    expect(await SyncService().isOnline, false);
  });

  test('TenantModeService activeTenantId reflects initialized tenantId', () {
    TenantModeService().initialize(
      mode: AppMode.online,
      tenantId: 'tenant-abc',
    );
    expect(TenantModeService().activeTenantId, 'tenant-abc');
  });
}
