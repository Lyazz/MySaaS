import 'package:admin_app/bootstrap.dart';
import 'package:admin_app/models/app_mode.dart';
import 'package:admin_app/models/bootstrap_config.dart';
import 'package:admin_app/models/provisioning_payload.dart';
import 'package:admin_app/models/subscription_tier.dart';
import 'package:admin_app/providers/auth_provider.dart';
import 'package:admin_app/screens/activation_screen.dart';
import 'package:admin_app/services/activation_service.dart';
import 'package:admin_app/services/api_service.dart';
import 'package:admin_app/services/app_storage.dart';
import 'package:admin_app/services/device_info_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'helpers/pump_localized_app.dart';

String _locationOf(Object routerObject) {
  final dynamic router = routerObject;
  return router.routeInformationProvider.value.uri.toString();
}

class _FakeActivationService extends ActivationService {
  _FakeActivationService({
    required this.result,
    this.offlineResult,
    this.offlineRequestCode = 'offline-request-code',
    this.error,
  }) : super(
         ApiService(baseUrl: 'https://swekly.com/api'),
         DeviceInfoService(),
       );

  final ActivationResult? result;
  final ActivationResult? offlineResult;
  final String offlineRequestCode;
  final Exception? error;

  @override
  Future<ActivationResult> activateOnline(String activationCode) async {
    if (error != null) throw error!;
    if (activationCode.trim() != 'trusted-activation-code') {
      throw Exception('Invalid or expired activation code');
    }
    return result!;
  }

  @override
  Future<String> generateOfflineRequestCode() async {
    if (error != null) throw error!;
    return offlineRequestCode;
  }

  @override
  Future<ActivationResult> verifyOfflineActivationCode(String token) async {
    if (error != null) throw error!;
    if (token.trim() != 'signed-offline-token') {
      throw Exception('Invalid or tampered activation code');
    }
    return offlineResult ?? result!;
  }
}

GoRouter _buildTestRouter(
  ProviderContainer container,
  ValueNotifier<int> refresh,
) {
  return GoRouter(
    initialLocation: '/activate',
    refreshListenable: refresh,
    redirect: (context, state) {
      final authState = container.read(authProvider);
      final bootstrap = container.read(bootstrapProvider);
      final isProvisioned = bootstrap.isProvisioned;
      final isLoggedIn = authState.isAuthenticated;
      final path = state.uri.path;

      if (!isProvisioned) {
        return path == '/activate' ? null : '/activate';
      }

      if (path == '/activate') {
        return authState.mode.skipsAuthentication || isLoggedIn
            ? '/'
            : '/login';
      }

      if (authState.mode.skipsAuthentication) {
        if (path == '/login') return '/';
        return null;
      }

      if (!isLoggedIn && path != '/login') {
        return '/login';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/activate',
        builder: (context, state) => const ActivationScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) =>
            const Scaffold(body: Center(child: Text('Login'))),
      ),
      GoRoute(
        path: '/',
        builder: (context, state) =>
            const Scaffold(body: Center(child: Text('Home'))),
      ),
    ],
  );
}

void main() {
  testWidgets(
    'ActivationScreen provisions the device and routes unauthenticated tenants to login',
    (tester) async {
      await AppStorage.clearAuthSession();
      await AppStorage.clearProvisioningState();

      final container = ProviderContainer(
        overrides: [
          bootstrapProvider.overrideWith(
            () => BootstrapNotifier(
              BootstrapConfig(apiBaseUrl: 'https://swekly.com/api'),
            ),
          ),
          activationServiceProvider.overrideWith(
            (ref) => _FakeActivationService(
              result: const ActivationResult(
                activationToken: 'signed-token-1',
                provisioning: ProvisioningPayload(
                  apiBaseUrl: 'https://tenant.example.com/api',
                  mode: AppMode.hybrid,
                  subscriptionTier: SubscriptionTier.online,
                  tenantId: 'tenant-42',
                  workspaceId: 'workspace-99',
                ),
              ),
            ),
          ),
        ],
      );
      addTearDown(container.dispose);

      final refresh = ValueNotifier<int>(0);
      addTearDown(refresh.dispose);
      final bootstrapSub = container.listen<BootstrapConfig>(
        bootstrapProvider,
        (_, __) => refresh.value++,
      );
      addTearDown(bootstrapSub.close);
      final authSub = container.listen<AuthState>(
        authProvider,
        (_, __) => refresh.value++,
      );
      addTearDown(authSub.close);

      final router = _buildTestRouter(container, refresh);
      addTearDown(router.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: buildLocalizedTestApp(routerConfig: router),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      await tester.enterText(find.byType(TextField), 'trusted-activation-code');
      await tester.ensureVisible(find.text('Activate Device'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Activate Device'));
      await tester.pumpAndSettle();

      expect(_locationOf(router), '/login');

      final bootstrap = container.read(bootstrapProvider);
      expect(bootstrap.apiBaseUrl, 'https://tenant.example.com/api');
      expect(bootstrap.tenantId, 'tenant-42');
      expect(bootstrap.workspaceId, 'workspace-99');
      expect(bootstrap.authToken, isNull);
      expect(bootstrap.isProvisioned, isTrue);

      final persisted = await AppStorage.loadBootstrap(
        defaultApiBaseUrl: 'https://swekly.com/api',
      );
      expect(persisted.apiBaseUrl, 'https://tenant.example.com/api');
      expect(persisted.subscriptionTier, SubscriptionTier.online);
      expect(persisted.tenantId, 'tenant-42');
      expect(persisted.workspaceId, 'workspace-99');
      expect(persisted.authToken, isNull);
      expect(await AppStorage.getActivationToken(), 'signed-token-1');
    },
  );

  testWidgets('ActivationScreen shows payload validation errors', (
    tester,
  ) async {
    final container = ProviderContainer(
      overrides: [
        bootstrapProvider.overrideWith(
          () => BootstrapNotifier(
            BootstrapConfig(apiBaseUrl: 'https://swekly.com/api'),
          ),
        ),
        activationServiceProvider.overrideWith(
          (ref) => _FakeActivationService(
            result: null,
            error: Exception('Invalid or expired activation code'),
          ),
        ),
      ],
    );
    addTearDown(container.dispose);

    final refresh = ValueNotifier<int>(0);
    addTearDown(refresh.dispose);
    final bootstrapSub = container.listen<BootstrapConfig>(
      bootstrapProvider,
      (_, __) => refresh.value++,
    );
    addTearDown(bootstrapSub.close);
    final authSub = container.listen<AuthState>(
      authProvider,
      (_, __) => refresh.value++,
    );
    addTearDown(authSub.close);

    final router = _buildTestRouter(container, refresh);
    addTearDown(router.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: buildLocalizedTestApp(routerConfig: router),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));

    await tester.enterText(find.byType(TextField), 'bad-code');
    await tester.ensureVisible(find.text('Activate Device'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Activate Device'));
    await tester.pumpAndSettle();

    expect(find.text('Invalid or expired activation code'), findsOneWidget);
    expect(_locationOf(router), '/activate');
  });

  testWidgets('ActivationScreen provisions offline activation locally', (
    tester,
  ) async {
    await AppStorage.clearAuthSession();
    await AppStorage.clearProvisioningState();

    final container = ProviderContainer(
      overrides: [
        bootstrapProvider.overrideWith(
          () => BootstrapNotifier(
            const BootstrapConfig(apiBaseUrl: 'https://swekly.com/api'),
          ),
        ),
        activationServiceProvider.overrideWith(
          (ref) => _FakeActivationService(
            result: const ActivationResult(
              activationToken: 'signed-token-online',
              provisioning: ProvisioningPayload(
                apiBaseUrl: 'https://tenant.example.com/api',
                mode: AppMode.hybrid,
                subscriptionTier: SubscriptionTier.online,
                tenantId: 'tenant-online',
                workspaceId: 'workspace-online',
              ),
            ),
            offlineResult: const ActivationResult(
              activationToken: 'signed-offline-token',
              provisioning: ProvisioningPayload(
                apiBaseUrl: 'https://tenant.example.com/api',
                mode: AppMode.offlineOnly,
                subscriptionTier: SubscriptionTier.offlineOnly,
                tenantId: 'tenant-offline',
                workspaceId: 'workspace-offline',
              ),
            ),
          ),
        ),
      ],
    );
    addTearDown(container.dispose);

    final refresh = ValueNotifier<int>(0);
    addTearDown(refresh.dispose);
    final bootstrapSub = container.listen<BootstrapConfig>(
      bootstrapProvider,
      (_, __) => refresh.value++,
    );
    addTearDown(bootstrapSub.close);
    final authSub = container.listen<AuthState>(
      authProvider,
      (_, __) => refresh.value++,
    );
    addTearDown(authSub.close);

    final router = _buildTestRouter(container, refresh);
    addTearDown(router.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: buildLocalizedTestApp(routerConfig: router),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));

    await tester.enterText(
      find.byType(TextField).first,
      'trusted-activation-code',
    );
    await tester.tap(find.text('Offline Activation'));
    await tester.pumpAndSettle();

    expect(find.text('offline-request-code'), findsOneWidget);

    await tester.enterText(find.byType(TextField).last, 'signed-offline-token');
    await tester.tap(find.text('Verify'));
    await tester.pumpAndSettle();

    expect(_locationOf(router), '/');

    final bootstrap = container.read(bootstrapProvider);
    expect(bootstrap.tenantId, 'tenant-offline');
    expect(bootstrap.workspaceId, 'workspace-offline');
    expect(bootstrap.mode, AppMode.offlineOnly);
    expect(await AppStorage.getActivationToken(), 'signed-offline-token');
  });

  testWidgets('ActivationScreen desktop layout matches golden', (tester) async {
    tester.view.physicalSize = const Size(1440, 1200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    final container = ProviderContainer(
      overrides: [
        bootstrapProvider.overrideWith(
          () => BootstrapNotifier(
            const BootstrapConfig(apiBaseUrl: 'https://swekly.com/api'),
          ),
        ),
        activationServiceProvider.overrideWith(
          (ref) => _FakeActivationService(
            result: const ActivationResult(
              activationToken: 'signed-token-2',
              provisioning: ProvisioningPayload(
                apiBaseUrl: 'https://tenant.example.com/api',
                mode: AppMode.offlineOnly,
                subscriptionTier: SubscriptionTier.offlineOnly,
                tenantId: 'tenant-42',
                workspaceId: 'workspace-99',
              ),
            ),
          ),
        ),
      ],
    );
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: buildLocalizedTestApp(home: const ActivationScreen()),
      ),
    );
    await tester.pumpAndSettle();

    await expectLater(
      find.byType(ActivationScreen),
      matchesGoldenFile('goldens/activation_screen_desktop.png'),
    );
  });
}
