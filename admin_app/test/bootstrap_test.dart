import 'package:admin_app/bootstrap.dart';
import 'package:admin_app/models/app_mode.dart';
import 'package:admin_app/models/bootstrap_config.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('bootstrap provider ignores identical replacements', () {
    final initial = BootstrapConfig(
      apiBaseUrl: 'https://swekly.com/api',
      mode: AppMode.online,
      tenantId: 'tenant-1',
      authToken: 'token-1',
      userJson: const {'id': 'user-1', 'email': 'owner@example.com'},
      staffPermissions: const ['orders:read'],
    );

    final container = ProviderContainer(
      overrides: [
        bootstrapProvider.overrideWith(() => BootstrapNotifier(initial)),
      ],
    );
    addTearDown(container.dispose);

    final states = <BootstrapConfig>[];
    final sub = container.listen(
      bootstrapProvider,
      (_, next) => states.add(next),
      fireImmediately: true,
    );
    addTearDown(sub.close);

    container
        .read(bootstrapProvider.notifier)
        .replace(initial.copyWith(staffPermissions: const ['orders:read']));

    expect(states, hasLength(1));

    container
        .read(bootstrapProvider.notifier)
        .replace(initial.copyWith(mode: AppMode.offlineOnly));

    expect(states, hasLength(2));
    expect(states.last.mode, AppMode.offlineOnly);
  });
}
