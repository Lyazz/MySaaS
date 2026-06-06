import 'package:admin_app/bootstrap.dart';
import 'package:admin_app/models/app_mode.dart';
import 'package:admin_app/models/bootstrap_config.dart';
import 'package:admin_app/models/store_settings.dart';
import 'package:admin_app/models/subscription_tier.dart';
import 'package:admin_app/providers/auth_provider.dart';
import 'package:admin_app/providers/store_settings_provider.dart';
import 'package:admin_app/providers/sync_provider.dart';
import 'package:admin_app/services/sync_service.dart';
import 'package:admin_app/widgets/app_shell.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';

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

GoRouter _buildRouter({required String initialLocation}) {
  Widget page(String label) => Center(child: Text(label));

  return GoRouter(
    initialLocation: initialLocation,
    routes: [
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/', builder: (context, state) => page('Dashboard')),
          GoRoute(
            path: '/products',
            builder: (context, state) => page('Products'),
          ),
          GoRoute(
            path: '/products/create',
            builder: (context, state) => page('Create product'),
          ),
        ],
      ),
    ],
  );
}

String _locationOf(GoRouter router) {
  return router.routeInformationProvider.value.uri.toString();
}

Future<void> _pumpShell(
  WidgetTester tester, {
  required GoRouter router,
  Size size = const Size(800, 900),
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  final user = User(
    id: 'owner-1',
    email: 'owner@example.com',
    role: 'owner',
    isSuperAdmin: false,
    tenantId: 'tenant-1',
  );

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        bootstrapProvider.overrideWith(
          () => BootstrapNotifier(
            const BootstrapConfig(
              apiBaseUrl: 'https://api.example.com',
              mode: AppMode.online,
              subscriptionTier: SubscriptionTier.online,
              tenantId: 'tenant-1',
            ),
          ),
        ),
        authProvider.overrideWith(
          () => _TestAuthNotifier(
            AuthState(
              user: user,
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
        syncServiceProvider.overrideWithValue(SyncService()),
      ],
      child: buildLocalizedTestApp(routerConfig: router),
    ),
  );
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 100));
}

void main() {
  testWidgets('top-level routes do not show a back button', (tester) async {
    final router = _buildRouter(initialLocation: '/products');

    await _pumpShell(tester, router: router);

    expect(find.byIcon(LucideIcons.arrowLeft), findsNothing);
    expect(find.byIcon(LucideIcons.menu), findsOneWidget);
  });

  testWidgets('child routes show back and keep mobile menu available', (
    tester,
  ) async {
    final router = _buildRouter(initialLocation: '/products/create');

    await _pumpShell(tester, router: router);

    expect(find.byIcon(LucideIcons.arrowLeft), findsOneWidget);
    expect(find.byIcon(LucideIcons.menu), findsOneWidget);
  });

  testWidgets('back button falls back to parent route for direct links', (
    tester,
  ) async {
    final router = _buildRouter(initialLocation: '/products/create');

    await _pumpShell(tester, router: router);
    await tester.tap(find.byIcon(LucideIcons.arrowLeft));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(_locationOf(router), '/products');
  });

  testWidgets(
    'desktop child routes show a back button near the sidebar toggle',
    (tester) async {
      final router = _buildRouter(initialLocation: '/products/create');

      await _pumpShell(tester, router: router, size: const Size(1200, 900));

      expect(find.byIcon(LucideIcons.panelLeft), findsOneWidget);
      expect(find.byIcon(LucideIcons.arrowLeft), findsOneWidget);
    },
  );
}
