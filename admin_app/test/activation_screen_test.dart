import 'package:admin_app/bootstrap.dart';
import 'package:admin_app/models/app_mode.dart';
import 'package:admin_app/models/bootstrap_config.dart';
import 'package:admin_app/providers/auth_provider.dart';
import 'package:admin_app/screens/activation_screen.dart';
import 'package:admin_app/services/app_storage.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'helpers/pump_localized_app.dart';

String _locationOf(Object routerObject) {
  final dynamic router = routerObject;
  return router.routeInformationProvider.value.uri.toString();
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
      final path = state.uri.toString();

      if (!isProvisioned) {
        return path == '/activate' ? null : '/activate';
      }

      if (path == '/activate') {
        return authState.mode == AppMode.offlineOnly || isLoggedIn
            ? '/'
            : '/login';
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

      await tester.enterText(find.byType(TextField), '''
{
  "tenantId": "tenant-42",
  "workspaceId": "workspace-99",
  "mode": "online"
}
''');
      await tester.ensureVisible(find.text('Activate Device'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Activate Device'));
      await tester.pumpAndSettle();

      expect(_locationOf(router), '/login');

      final bootstrap = container.read(bootstrapProvider);
      expect(bootstrap.apiBaseUrl, 'https://swekly.com/api');
      expect(bootstrap.tenantId, 'tenant-42');
      expect(bootstrap.workspaceId, 'workspace-99');
      expect(bootstrap.authToken, isNull);
      expect(bootstrap.isProvisioned, isTrue);

      final persisted = await AppStorage.loadBootstrap(
        defaultApiBaseUrl: 'https://swekly.com/api',
      );
      expect(persisted.apiBaseUrl, 'https://swekly.com/api');
      expect(persisted.tenantId, 'tenant-42');
      expect(persisted.workspaceId, 'workspace-99');
      expect(persisted.authToken, isNull);
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

    await tester.enterText(find.byType(TextField), '{"mode":"online"}');
    await tester.ensureVisible(find.text('Activate Device'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Activate Device'));
    await tester.pumpAndSettle();

    expect(
      find.text('Provisioning payload is missing tenantId.'),
      findsOneWidget,
    );
    expect(_locationOf(router), '/activate');
  });
}
