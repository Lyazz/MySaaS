// Manual verification test: logs into the real local "Embellir" demo tenant
// through the actual auth flow and API client, against the local dev backend
// (`npm run dev` + seeded Postgres). Not part of the default CI test matrix —
// requires a running local backend at http://embellir.localhost:3000/api.
import 'package:admin_app/bootstrap.dart';
import 'package:admin_app/models/bootstrap_config.dart';
import 'package:admin_app/providers/auth_provider.dart';
import 'package:admin_app/services/api_service.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  const baseUrl = 'http://embellir.localhost:3000/api';

  ProviderContainer buildContainer() {
    final container = ProviderContainer(
      overrides: [
        bootstrapProvider.overrideWith(
          () => BootstrapNotifier(const BootstrapConfig(apiBaseUrl: baseUrl)),
        ),
      ],
    );
    container.read(authProvider);
    return container;
  }

  testWidgets(
    'logs in as the Embellir owner and loads tenant-scoped store settings',
    (tester) async {
      final container = buildContainer();
      addTearDown(container.dispose);

      await container
          .read(authProvider.notifier)
          .login('admin@embellir.com', 'password');

      final state = container.read(authProvider);
      expect(state.isAuthenticated, isTrue);
      expect(state.user?.email, 'admin@embellir.com');
      expect(state.user?.role, 'owner');
      expect(state.user?.tenantId, isNotEmpty);

      final api = container.read(apiProvider);
      final response = await api.client.get('/admin/store-settings');
      expect(response.statusCode, 200);
      final data = (response.data as Map).cast<String, dynamic>();
      expect(data['name'], 'Embellir');
      expect(data['slug'], 'embellir');
    },
  );

  testWidgets('rejects an invalid password for the Embellir tenant', (
    tester,
  ) async {
    final container = buildContainer();
    addTearDown(container.dispose);

    await expectLater(
      container
          .read(authProvider.notifier)
          .login('admin@embellir.com', 'not-the-password'),
      throwsA(anything),
    );
    expect(container.read(authProvider).isAuthenticated, isFalse);
  });
}
