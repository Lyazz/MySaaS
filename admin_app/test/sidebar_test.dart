import 'package:admin_app/models/app_mode.dart';
import 'package:admin_app/models/store_settings.dart';
import 'package:admin_app/models/subscription_tier.dart';
import 'package:admin_app/providers/auth_provider.dart';
import 'package:admin_app/providers/store_settings_provider.dart';
import 'package:admin_app/widgets/sidebar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import 'helpers/pump_localized_app.dart';

class _TestAuthNotifier extends AuthNotifier {
  _TestAuthNotifier(this._state);

  final AuthState _state;

  @override
  AuthState build() => _state;
}

class _TestStoreSettingsNotifier extends StoreSettingsNotifier {
  _TestStoreSettingsNotifier(this._state);

  final StoreSettingsState _state;

  @override
  StoreSettingsState build() => _state;
}

GoRouter _buildRouter() {
  return GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const Scaffold(body: Sidebar()),
      ),
      GoRoute(
        path: '/billing',
        builder: (context, state) => const Scaffold(body: Sidebar()),
      ),
    ],
  );
}

void main() {
  testWidgets(
    'Sidebar shows locked billing and integrations for offline-only owners',
    (tester) async {
      final owner = User(
        id: 'owner-1',
        email: 'owner@example.com',
        role: 'owner',
        isSuperAdmin: false,
        tenantId: 'tenant-1',
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authProvider.overrideWith(
              () => _TestAuthNotifier(
                AuthState(
                  user: owner,
                  token: 'token-123',
                  mode: AppMode.offlineOnly,
                  subscriptionTier: SubscriptionTier.offlineOnly,
                ),
              ),
            ),
            storeSettingsProvider.overrideWith(
              () => _TestStoreSettingsNotifier(
                StoreSettingsState(
                  settings: StoreSettings.empty.copyWith(
                    name: 'Tenant Store',
                    slug: 'tenant-store',
                  ),
                  isLoading: false,
                ),
              ),
            ),
          ],
          child: buildLocalizedTestApp(routerConfig: _buildRouter()),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Billing'), findsOneWidget);
      expect(find.text('Integrations'), findsOneWidget);
      expect(find.byIcon(LucideIcons.lock), findsNWidgets(2));
    },
  );

  testWidgets(
    'Sidebar keeps billing and integrations enabled for online owners',
    (tester) async {
      final owner = User(
        id: 'owner-1',
        email: 'owner@example.com',
        role: 'owner',
        isSuperAdmin: false,
        tenantId: 'tenant-1',
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authProvider.overrideWith(
              () => _TestAuthNotifier(
                AuthState(
                  user: owner,
                  token: 'token-123',
                  mode: AppMode.online,
                  subscriptionTier: SubscriptionTier.online,
                ),
              ),
            ),
            storeSettingsProvider.overrideWith(
              () => _TestStoreSettingsNotifier(
                StoreSettingsState(
                  settings: StoreSettings.empty.copyWith(
                    name: 'Tenant Store',
                    slug: 'tenant-store',
                  ),
                  isLoading: false,
                ),
              ),
            ),
          ],
          child: buildLocalizedTestApp(routerConfig: _buildRouter()),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Billing'), findsOneWidget);
      expect(find.text('Integrations'), findsOneWidget);
      expect(find.byIcon(LucideIcons.lock), findsNothing);
    },
  );
}
