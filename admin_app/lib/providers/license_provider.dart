import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/license_status.dart';
import '../services/license_service.dart';
import '../services/monotonic_clock.dart';

/// Raw stream of licence changes.
///
/// `LicenseService` re-emits on its own timer as well as on change, so a screen
/// left open across a grace boundary updates without any interaction.
final licenseChangesProvider = StreamProvider<LicenseSnapshot>((ref) async* {
  yield LicenseService().current;
  yield* LicenseService().changes;
});

/// The current snapshot, always non-null.
///
/// Falls back to the service's cached value rather than exposing a loading
/// state: the licence is restored before the first frame, so there is never a
/// moment where the answer is genuinely unknown.
final licenseSnapshotProvider = Provider<LicenseSnapshot>((ref) {
  final async = ref.watch(licenseChangesProvider);
  return async.when(
    data: (snapshot) => snapshot,
    // The licence is restored before the first frame, so the service's cached
    // value is always meaningful -- there is no genuine "unknown" state to show.
    loading: () => LicenseService().current,
    error: (_, __) => LicenseService().current,
  );
});

/// The derived state, evaluated against the monotonic clock.
final licenseStateProvider = Provider<LicenseState>((ref) {
  final snapshot = ref.watch(licenseSnapshotProvider);
  return snapshot.stateAt(MonotonicClock.instance.now());
});

/// Whether this device may currently create new business records.
final licenseAllowsWritesProvider = Provider<bool>((ref) {
  return ref.watch(licenseStateProvider).allowsWrites;
});
