import 'package:admin_app/models/app_mode.dart';
import 'package:admin_app/models/provisioning_payload.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('ProvisioningPayload parses trusted bootstrap JSON', () {
    final payload = ProvisioningPayload.fromEncoded('''
      {
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

    expect(payload.apiBaseUrl, 'https://swekly.com/api');
    expect(payload.mode, AppMode.offlineOnly);
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

    expect(payload.apiBaseUrl, 'https://swekly.com/api');
    expect(payload.mode, AppMode.offlineOnly);
  });

  test('ProvisioningPayload rejects missing tenantId', () {
    expect(
      () => ProvisioningPayload.fromJson({}),
      throwsA(isA<FormatException>()),
    );
  });
}
