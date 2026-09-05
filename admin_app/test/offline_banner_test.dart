import 'package:admin_app/models/app_mode.dart';
import 'package:admin_app/models/subscription_tier.dart';
import 'package:admin_app/providers/auth_provider.dart';
import 'package:admin_app/providers/network_status_provider.dart';
import 'package:admin_app/providers/sync_provider.dart';
import 'package:admin_app/services/sync_service.dart';
import 'package:admin_app/widgets/offline_banner.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers/pump_localized_app.dart';

class _TestAuthNotifier extends AuthNotifier {
  _TestAuthNotifier(this._state);

  final AuthState _state;

  @override
  AuthState build() => _state;
}

class _TestNetworkStatusNotifier extends NetworkStatusNotifier {
  _TestNetworkStatusNotifier(this._state);

  final NetworkStatus _state;

  @override
  NetworkStatus build() => _state;
}

void main() {
  Future<void> pumpBanner(
    WidgetTester tester, {
    required SyncState syncState,
    required NetworkStatus networkStatus,
  }) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authProvider.overrideWith(
            () => _TestAuthNotifier(
              const AuthState(
                mode: AppMode.hybrid,
                subscriptionTier: SubscriptionTier.online,
              ),
            ),
          ),
          networkStatusProvider.overrideWith(
            () => _TestNetworkStatusNotifier(networkStatus),
          ),
          syncServiceProvider.overrideWith((ref) => SyncService()),
          syncStateProvider.overrideWith((ref) => Stream.value(syncState)),
        ],
        child: buildLocalizedTestApp(
          home: const Scaffold(body: OfflineBanner()),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('OfflineBanner shows pending hybrid sync state', (tester) async {
    await pumpBanner(
      tester,
      syncState: const SyncState(pending: 3),
      networkStatus: NetworkStatus.connected,
    );

    expect(find.text('Hybrid pending'), findsOneWidget);
    expect(find.text('3 pending'), findsOneWidget);
  });

  testWidgets('OfflineBanner shows conflicted sync state', (tester) async {
    await pumpBanner(
      tester,
      syncState: const SyncState(conflicted: 2),
      networkStatus: NetworkStatus.connected,
    );

    expect(find.text('Sync conflicted'), findsOneWidget);
    expect(find.text('2 need review'), findsOneWidget);
  });

  testWidgets('OfflineBanner recovery state matches golden', (tester) async {
    tester.view.physicalSize = const Size(1280, 240);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await pumpBanner(
      tester,
      syncState: SyncState(
        failed: 2,
        recoveryRequired: 1,
        latestError: 'Server unavailable',
      ),
      networkStatus: NetworkStatus.connected,
    );

    await expectLater(
      find.byType(OfflineBanner),
      matchesGoldenFile('goldens/offline_banner_recovery.png'),
    );
  });
}
