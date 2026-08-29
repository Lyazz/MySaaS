import 'package:admin_app/app_config.dart';
import 'package:admin_app/models/app_mode.dart';
import 'package:admin_app/models/provisioning_payload.dart';
import 'package:admin_app/models/subscription_tier.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('ProvisioningPayload parses trusted bootstrap JSON', () {
    final payload = ProvisioningPayload.fromEncoded('''
      {
        "apiBaseUrl": "https://tenant.example.com/api",
        "tenantId": "tenant-1",
        "workspaceId": "workspace-7",
        "mode": "offlineOnly",
        "authToken": "token-123",
        "user": {
          "id": "user-1",
          "email": "owner@example.com",
          "tenantId": "tenant-1",
          "role": "owner"
        },
        "staffRole": {
          "id": "role-1",
          "name": "Manager"
        },
        "staffPermissions": ["orders:read", "billing:read"]
      }
    ''');

    expect(payload.apiBaseUrl, 'https://tenant.example.com/api');
    expect(payload.mode, AppMode.offlineOnly);
    expect(payload.subscriptionTier, SubscriptionTier.offlineOnly);
    expect(payload.tenantId, 'tenant-1');
    expect(payload.workspaceId, 'workspace-7');
    expect(payload.authToken, 'token-123');
    expect(payload.userJson?['email'], 'owner@example.com');
    expect(payload.staffRoleJson?['name'], 'Manager');
    expect(payload.staffPermissions, ['orders:read', 'billing:read']);
  });

  test('ProvisioningPayload accepts legacy isOffline flag fallback', () {
    final payload = ProvisioningPayload.fromJson({
      'tenantId': 'tenant-1',
      'isOffline': true,
    });

    // Compared against the configured default rather than a literal: what the
    // fallback has to guarantee is "use the app's own base URL when the payload
    // names none", and pinning the production string here breaks the test on
    // any build pointed at a different host.
    expect(payload.apiBaseUrl, defaultApiBaseUrl);
    expect(payload.mode, AppMode.offlineOnly);
    expect(payload.subscriptionTier, SubscriptionTier.offlineOnly);
  });

  test('ProvisioningPayload supports hybrid runtime with online tier', () {
    final payload = ProvisioningPayload.fromJson({
      'apiBaseUrl': 'tenant.example.com',
      'tenantId': 'tenant-1',
      'mode': 'hybrid',
      'subscriptionTier': 'online',
    });

    expect(payload.apiBaseUrl, 'https://tenant.example.com/api');
    expect(payload.mode, AppMode.hybrid);
    expect(payload.subscriptionTier, SubscriptionTier.online);
  });

  test('ProvisioningPayload rejects missing tenantId', () {
    expect(
      () => ProvisioningPayload.fromJson({}),
      throwsA(isA<FormatException>()),
    );
  });
}
