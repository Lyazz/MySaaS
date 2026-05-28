import 'package:admin_app/bootstrap.dart';
import 'package:admin_app/models/app_mode.dart';
import 'package:admin_app/models/bootstrap_config.dart';
import 'package:admin_app/providers/auth_provider.dart';
import 'package:admin_app/screens/settings_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/pump_localized_app.dart';

class _TestAuthNotifier extends AuthNotifier {
  _TestAuthNotifier(this._state);

  final AuthState _state;

  @override
  AuthState build() => _state;
}

void main() {
  testWidgets(
    'SettingsScreen shows provisioned workspace as read-only and offline locks',
    (tester) async {
      final container = ProviderContainer(
        overrides: [
          bootstrapProvider.overrideWith(
            () => BootstrapNotifier(
              const BootstrapConfig(
                apiBaseUrl: 'https://tenant.example.com/api',
                mode: AppMode.offlineOnly,
                tenantId: 'tenant-1',
              ),
            ),
          ),
          authProvider.overrideWith(
            () => _TestAuthNotifier(const AuthState(mode: AppMode.offlineOnly)),
          ),
        ],
      );
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: buildLocalizedTestApp(
            home: const Scaffold(body: SettingsScreen()),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Provisioned workspace'), findsOneWidget);
      expect(
        find.text(
          'https://tenant.example.com/api\nManaged by secure provisioning.',
        ),
        findsOneWidget,
      );
      expect(find.text('Workspace URL'), findsNothing);
      expect(
        find.text(
          'This tenant is provisioned for offline-only operation. Hosted storefront and cloud features stay visible here but remain locked until the tenant upgrades to an online tier.',
        ),
        findsOneWidget,
      );
      expect(find.textContaining('Available on online tiers.'), findsWidgets);
    },
  );

  testWidgets(
    'SettingsScreen does not show offline lock messaging for online tenants',
    (tester) async {
      final user = User(
        id: 'owner-1',
        email: 'owner@example.com',
        role: 'owner',
        isSuperAdmin: false,
        tenantId: 'tenant-1',
      );
      final container = ProviderContainer(
        overrides: [
          bootstrapProvider.overrideWith(
            () => BootstrapNotifier(
              BootstrapConfig(
                apiBaseUrl: 'https://tenant.example.com/api',
                mode: AppMode.online,
                tenantId: 'tenant-1',
                authToken: 'token-123',
                userJson: user.toJson(),
              ),
            ),
          ),
          authProvider.overrideWith(
            () => _TestAuthNotifier(
              AuthState(user: user, token: 'token-123', mode: AppMode.online),
            ),
          ),
        ],
      );
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: buildLocalizedTestApp(
            home: const Scaffold(body: SettingsScreen()),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Provisioned workspace'), findsOneWidget);
      expect(find.text('Workspace URL'), findsNothing);
      expect(find.textContaining('Available on online tiers.'), findsNothing);
    },
  );
}
