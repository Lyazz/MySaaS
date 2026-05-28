import 'package:admin_app/models/app_mode.dart';
import 'package:admin_app/models/subscription_tier.dart';
import 'package:admin_app/services/app_storage.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStorage.setMockInitialValues({});
    await AppStorage.clearAuthSession();
    await AppStorage.clearProvisioningState();
  });

  test(
    'AppStorage persists secure provisioning and auth bootstrap state',
    () async {
      await AppStorage.saveApiBaseUrl('https://tenant.example.com/api');
      await AppStorage.saveProvisioningState(
        mode: AppMode.offlineOnly,
        subscriptionTier: SubscriptionTier.offlineOnly,
        tenantId: 'tenant-1',
        workspaceId: 'workspace-7',
      );
      await AppStorage.saveAuthSession(
        token: 'token-123',
        userJson: {
          'id': 'user-1',
          'email': 'owner@example.com',
          'role': 'owner',
          'tenantId': 'tenant-1',
        },
        staffRoleJson: {'id': 'role-1', 'name': 'Manager'},
        staffPermissions: const ['orders:read', 'billing:read'],
      );

      final bootstrap = await AppStorage.loadBootstrap(
        defaultApiBaseUrl: 'https://swekly.com/api',
      );

      expect(bootstrap.apiBaseUrl, 'https://swekly.com/api');
      expect(bootstrap.mode, AppMode.offlineOnly);
      expect(bootstrap.subscriptionTier, SubscriptionTier.offlineOnly);
      expect(bootstrap.tenantId, 'tenant-1');
      expect(bootstrap.workspaceId, 'workspace-7');
      expect(bootstrap.authToken, 'token-123');
      expect(bootstrap.userJson?['email'], 'owner@example.com');
      expect(bootstrap.staffRoleJson?['name'], 'Manager');
      expect(bootstrap.staffPermissions, ['orders:read', 'billing:read']);
      expect(bootstrap.isProvisioned, isTrue);
    },
  );

  test(
    'AppStorage clears secure provisioning state back to default bootstrap',
    () async {
      await AppStorage.saveApiBaseUrl('https://tenant.example.com/api');
      await AppStorage.saveProvisioningState(
        mode: AppMode.online,
        subscriptionTier: SubscriptionTier.online,
        tenantId: 'tenant-1',
        workspaceId: 'workspace-7',
      );
      await AppStorage.saveAuthSession(
        token: 'token-123',
        userJson: {'id': 'user-1', 'email': 'owner@example.com'},
      );

      await AppStorage.clearAuthSession();
      await AppStorage.clearProvisioningState();

      final bootstrap = await AppStorage.loadBootstrap(
        defaultApiBaseUrl: 'https://swekly.com/api',
      );

      expect(bootstrap.apiBaseUrl, 'https://swekly.com/api');
      expect(bootstrap.mode, AppMode.online);
      expect(bootstrap.subscriptionTier, SubscriptionTier.online);
      expect(bootstrap.tenantId, isEmpty);
      expect(bootstrap.workspaceId, isNull);
      expect(bootstrap.authToken, isNull);
      expect(bootstrap.userJson, isNull);
      expect(bootstrap.staffRoleJson, isNull);
      expect(bootstrap.staffPermissions, isEmpty);
      expect(bootstrap.isProvisioned, isFalse);
    },
  );

  test(
    'AppStorage resets stale stored API base URL to the default host',
    () async {
      await AppStorage.saveApiBaseUrl('https://tenant.example.com/api');

      final bootstrap = await AppStorage.loadBootstrap(
        defaultApiBaseUrl: 'https://swekly.com/api',
      );

      expect(bootstrap.apiBaseUrl, 'https://swekly.com/api');
    },
  );
}
