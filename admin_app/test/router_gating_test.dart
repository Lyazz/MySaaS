import 'package:admin_app/bootstrap.dart';
import 'package:admin_app/models/admin_dashboard.dart';
import 'package:admin_app/models/app_mode.dart';
import 'package:admin_app/models/bootstrap_config.dart';
import 'package:admin_app/models/store_settings.dart';
import 'package:admin_app/models/subscription_tier.dart';
import 'package:admin_app/providers/admin_dashboard_provider.dart';
import 'package:admin_app/providers/auth_provider.dart';
import 'package:admin_app/providers/network_status_provider.dart';
import 'package:admin_app/providers/store_settings_provider.dart';
import 'package:admin_app/router.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

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

class _TestDashboardNotifier extends AdminDashboardNotifier {
  _TestDashboardNotifier(this._state);

  final AdminDashboardState _state;

  @override
  AdminDashboardState build() => _state;
}

class _TestNetworkStatusNotifier extends NetworkStatusNotifier {
  _TestNetworkStatusNotifier(this._state);

  final NetworkStatus _state;

  @override
  NetworkStatus build() => _state;
}

ProviderContainer _buildContainer({
  required BootstrapConfig bootstrap,
  required AuthState authState,
}) {
  return ProviderContainer(
    overrides: [
      bootstrapProvider.overrideWith(() => BootstrapNotifier(bootstrap)),
      authProvider.overrideWith(() => _TestAuthNotifier(authState)),
      storeSettingsProvider.overrideWith(
        () => _TestStoreSettingsNotifier(
          const StoreSettingsState(
            settings: StoreSettings.empty,
            isLoading: false,
          ),
        ),
      ),
      adminDashboardProvider.overrideWith(
        () => _TestDashboardNotifier(
          const AdminDashboardState(
            data: AdminDashboardData.empty,
            isLoading: false,
          ),
        ),
      ),
      networkStatusProvider.overrideWith(
        () => _TestNetworkStatusNotifier(NetworkStatus.connected),
      ),
    ],
  );
}

String _locationOf(Object routerObject) {
  final dynamic router = routerObject;
  return router.routeInformationProvider.value.uri.toString();
}

Future<void> _pumpRouterApp(
  WidgetTester tester, {
  required ProviderContainer container,
  required Object router,
}) async {
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: buildLocalizedTestApp(
        routerConfig: router as RouterConfig<Object>,
      ),
    ),
  );
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 400));
}

void main() {
  testWidgets('router sends unprovisioned startup to login', (tester) async {
    final container = _buildContainer(
      bootstrap: const BootstrapConfig(apiBaseUrl: 'https://api.example.com'),
      authState: const AuthState(mode: AppMode.online),
    );
    addTearDown(container.dispose);

    final router = container.read(routerProvider);

    await _pumpRouterApp(tester, container: container, router: router);

    expect(_locationOf(router), '/login');
    expect(find.text('Log in to your account'), findsOneWidget);
  });

  testWidgets(
    'router requires login for provisioned online tenants without a session',
    (tester) async {
      final container = _buildContainer(
        bootstrap: const BootstrapConfig(
          apiBaseUrl: 'https://api.example.com',
          mode: AppMode.hybrid,
          subscriptionTier: SubscriptionTier.online,
          tenantId: 'tenant-1',
        ),
        authState: const AuthState(
          mode: AppMode.hybrid,
          subscriptionTier: SubscriptionTier.online,
        ),
      );
      addTearDown(container.dispose);

      final router = container.read(routerProvider);

      await _pumpRouterApp(tester, container: container, router: router);

      expect(_locationOf(router), '/login');
      expect(find.text('Log in to your account'), findsOneWidget);
    },
  );

  testWidgets(
    'offline activation button opens offline activation mode for signed-out provisioned tenants',
    (tester) async {
      final container = _buildContainer(
        bootstrap: const BootstrapConfig(
          apiBaseUrl: 'https://api.example.com',
          mode: AppMode.hybrid,
          subscriptionTier: SubscriptionTier.online,
          tenantId: 'tenant-1',
        ),
        authState: const AuthState(
          mode: AppMode.hybrid,
          subscriptionTier: SubscriptionTier.online,
        ),
      );
      addTearDown(container.dispose);

      final router = container.read(routerProvider);

      await _pumpRouterApp(tester, container: container, router: router);

      expect(_locationOf(router), '/login');
      await tester.tap(find.text('Offline Activation'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));

      expect(_locationOf(router), '/activate?mode=offline');
      expect(find.text('Offline activation'), findsOneWidget);
    },
  );

  testWidgets('router restores authenticated sessions to the app shell', (
    tester,
  ) async {
    final user = User(
      id: 'owner-1',
      email: 'owner@example.com',
      role: 'owner',
      isSuperAdmin: false,
      tenantId: 'tenant-1',
    );
    final container = _buildContainer(
      bootstrap: BootstrapConfig(
        apiBaseUrl: 'https://api.example.com',
        mode: AppMode.online,
        subscriptionTier: SubscriptionTier.online,
        tenantId: 'tenant-1',
        authToken: 'token-123',
        userJson: user.toJson(),
      ),
      authState: AuthState(
        user: user,
        token: 'token-123',
        mode: AppMode.online,
        subscriptionTier: SubscriptionTier.online,
      ),
    );
    addTearDown(container.dispose);

    final router = container.read(routerProvider);

    await _pumpRouterApp(tester, container: container, router: router);

    expect(_locationOf(router), '/');
  });

  testWidgets(
    'router redirects offline-only tenants away from locked billing screens',
    (tester) async {
      final container = _buildContainer(
        bootstrap: const BootstrapConfig(
          apiBaseUrl: 'https://api.example.com',
          mode: AppMode.offlineOnly,
          subscriptionTier: SubscriptionTier.offlineOnly,
          tenantId: 'tenant-1',
        ),
        authState: const AuthState(
          mode: AppMode.offlineOnly,
          subscriptionTier: SubscriptionTier.offlineOnly,
        ),
      );
      addTearDown(container.dispose);

      final router = container.read(routerProvider);
      router.go('/billing');

      await _pumpRouterApp(tester, container: container, router: router);

      expect(_locationOf(router), '/locked/billing');
      expect(
        find.text(
          'Upgrade to an online tier to unlock hosted storefront capabilities from this app.',
        ),
        findsOneWidget,
      );
    },
  );

  testWidgets(
    'router redirects staff without billing access to their first allowed route',
    (tester) async {
      final user = User(
        id: 'staff-1',
        email: 'staff@example.com',
        role: 'staff',
        isSuperAdmin: false,
        tenantId: 'tenant-1',
      );
      final container = _buildContainer(
        bootstrap: BootstrapConfig(
          apiBaseUrl: 'https://api.example.com',
          mode: AppMode.online,
          subscriptionTier: SubscriptionTier.online,
          tenantId: 'tenant-1',
          authToken: 'token-123',
          userJson: user.toJson(),
          staffPermissions: const ['orders:read'],
        ),
        authState: AuthState(
          user: user,
          token: 'token-123',
          mode: AppMode.online,
          subscriptionTier: SubscriptionTier.online,
          staffPermissions: const ['orders:read'],
        ),
      );
      addTearDown(container.dispose);

      final router = container.read(routerProvider);
      router.go('/billing');

      await _pumpRouterApp(tester, container: container, router: router);

      expect(_locationOf(router), '/orders');
      expect(find.text('Orders'), findsWidgets);
    },
  );

  testWidgets(
    'router keeps a freshly registered owner on the confirmation panel',
    (tester) async {
      // A tenant is created in offline mode, so the owner lands in local-only
      // mode the moment registration succeeds. The register route must survive
      // that so the "account created" panel is readable.
      final user = User(
        id: 'owner-1',
        email: 'owner@example.com',
        role: 'owner',
        isSuperAdmin: false,
        tenantId: 'tenant-1',
      );
      final container = _buildContainer(
        bootstrap: BootstrapConfig(
          apiBaseUrl: 'https://api.example.com',
          mode: AppMode.offlineOnly,
          subscriptionTier: SubscriptionTier.offlineOnly,
          tenantId: 'tenant-1',
          authToken: 'token-123',
          userJson: user.toJson(),
        ),
        authState: AuthState(
          user: user,
          token: 'token-123',
          mode: AppMode.offlineOnly,
          subscriptionTier: SubscriptionTier.offlineOnly,
        ),
      );
      addTearDown(container.dispose);

      final router = container.read(routerProvider);
      router.go('/register');

      await _pumpRouterApp(tester, container: container, router: router);

      expect(_locationOf(router), '/register');
    },
  );

  testWidgets('router sends a signed-out local-only install away from register', (
    tester,
  ) async {
    // The dashboard is the redirect target, so give it a desktop-sized surface.
    await tester.binding.setSurfaceSize(const Size(1600, 1200));
    addTearDown(() async {
      await tester.binding.setSurfaceSize(null);
    });

    final container = _buildContainer(
      bootstrap: const BootstrapConfig(
        apiBaseUrl: 'https://api.example.com',
        mode: AppMode.offlineOnly,
        subscriptionTier: SubscriptionTier.offlineOnly,
        tenantId: 'tenant-1',
      ),
      authState: const AuthState(
        mode: AppMode.offlineOnly,
        subscriptionTier: SubscriptionTier.offlineOnly,
      ),
    );
    addTearDown(container.dispose);

    final router = container.read(routerProvider);
    router.go('/register');

    await _pumpRouterApp(tester, container: container, router: router);

    expect(_locationOf(router), '/');
  });

  testWidgets('reading the router twice returns the same instance', (
    tester,
  ) async {
    // The router used to be rebuilt on every auth change, which reset
    // navigation to the initial location.
    final container = _buildContainer(
      bootstrap: const BootstrapConfig(
        apiBaseUrl: 'https://api.example.com',
        mode: AppMode.online,
        subscriptionTier: SubscriptionTier.online,
        tenantId: 'tenant-1',
      ),
      authState: const AuthState(mode: AppMode.online),
    );
    addTearDown(container.dispose);

    expect(
      identical(container.read(routerProvider), container.read(routerProvider)),
      isTrue,
    );
  });
}
