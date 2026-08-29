import 'package:flutter/foundation.dart';

import '../models/license_status.dart';
import '../services/license_service.dart';
import '../services/monotonic_clock.dart';

/// One attempted write, described well enough for the policy to rule on it.
@immutable
class WriteIntent {
  /// Matches the outbox vocabulary in `SyncService._supportedOperations`.
  final String entityType;
  final String action;

  /// True when this write completes something the operator had already started
  /// before the lock -- closing an open cash session, settling an order that
  /// already exists locally. The repository sets it from state it has already
  /// loaded, so establishing it costs no extra query.
  final bool finishesOpenWork;

  const WriteIntent(
    this.entityType,
    this.action, {
    this.finishesOpenWork = false,
  });

  String get key => '$entityType:$action';

  @override
  String toString() => 'WriteIntent($key, finishesOpenWork: $finishesOpenWork)';
}

/// Thrown instead of performing a write the licence does not permit.
class LicenseLockedException implements Exception {
  final LicenseSnapshot snapshot;
  final LicenseState state;
  final WriteIntent intent;

  const LicenseLockedException({
    required this.snapshot,
    required this.state,
    required this.intent,
  });

  @override
  String toString() =>
      'LicenseLockedException(${intent.key} refused in ${state.name})';
}

/// What a locked device may still do.
///
/// The rule is "read, finish what is already open, export" -- never "your data
/// is gone". A shop that hits the lock mid-afternoon must still be able to close
/// its till and settle the orders it already took, or the lock would cost the
/// operator real money and real trust.
///
/// Expressed as data rather than conditionals scattered through forty call
/// sites, so the whole policy can be read, and tested, in one place.
class LicenseWritePolicy {
  const LicenseWritePolicy._();

  /// Permitted while locked with no further questions.
  static const Set<String> unconditionalWhileLocked = {
    // Closing a till that is already open. Refusing this would strand a shop
    // mid-day with cash it cannot reconcile.
    'cashSession:close',
  };

  /// Permitted while locked only when the repository confirms it completes
  /// work that already exists locally.
  static const Set<String> conditionalOnOpenWork = {
    // The settle-up movements needed to close an already-open session.
    'cashTransaction:create',
    // Moving an existing order to DELIVERED / CANCELLED / RETURNED.
    'order:updateStatus',
    // Annotating an existing order while finishing it.
    'order:updateCallStatus',
    'order:updateInternalNotes',
    // Collecting payment on an order that was already issued.
    'customerPayment:create',
  };

  /// Wraps every mutation a repository performs.
  ///
  /// The check lives here, at the repository layer, rather than in the sync
  /// outbox, because every repository writes SQLite *first* and enqueues
  /// second. Throwing at enqueue time would leave a local row with no outbox
  /// entry -- permanent divergence between this device and the server.
  ///
  /// It is also not a UI-layer guard: that would put the responsibility back on
  /// each of the app's many screens to remember it.
  static Future<T> guardedWrite<T>(
    WriteIntent intent,
    Future<T> Function() run,
  ) async {
    if (!allowsNow(intent)) {
      throw LicenseLockedException(
        snapshot: LicenseService().current,
        state: LicenseService().state,
        intent: intent,
      );
    }

    // Every write is also an observation of the current time, which keeps the
    // monotonic mark advancing during normal use.
    MonotonicClock.instance.observeNow();
    return run();
  }

  /// Rules on one write.
  static bool isAllowed(
    LicenseSnapshot snapshot,
    DateTime now,
    WriteIntent intent,
  ) {
    final state = snapshot.stateAt(now);
    if (state.allowsWrites) return true;

    // Unactivated is NOT a lock. The lock exists for a device that was licensed
    // and then expired or was revoked; a device that has never been activated is
    // gated elsewhere -- the router sends an offline-only install to activation,
    // and the server refuses an online device's API calls on its own.
    //
    // Treating it as a lock here would break the shipping default: with seat
    // enforcement disabled, a legitimate login returns no activation token, and
    // blocking every write on that device would be a self-inflicted outage.
    if (state == LicenseState.unactivated) return true;

    if (unconditionalWhileLocked.contains(intent.key)) return true;
    if (conditionalOnOpenWork.contains(intent.key)) {
      return intent.finishesOpenWork;
    }

    return false;
  }

  /// Convenience for callers that just want a yes/no against the live licence.
  static bool allowsNow(WriteIntent intent) => isAllowed(
    LicenseService().current,
    MonotonicClock.instance.now(),
    intent,
  );

  /// Throws unless the write is permitted.
  ///
  /// Call this at the TOP of a repository mutation, before it touches SQLite.
  /// Every repository writes locally first and enqueues second, so a check that
  /// happens at enqueue time would leave a local row with no outbox entry --
  /// this device and the server would then disagree forever.
  static void ensureAllowed(WriteIntent intent) {
    if (allowsNow(intent)) {
      // Normal use keeps the monotonic mark moving forward.
      MonotonicClock.instance.observeNow();
      return;
    }

    throw LicenseLockedException(
      snapshot: LicenseService().current,
      state: LicenseService().state,
      intent: intent,
    );
  }

  /// The permissive superset used by the outbox backstop.
  ///
  /// `SyncService.enqueueOperation` cannot know whether a write finishes open
  /// work, so it allows anything that *could* qualify. It exists to catch a
  /// repository that forgot to wrap a write, not to make the fine-grained call.
  static bool couldBeAllowedWhileLocked(String entityType, String action) {
    final key = '$entityType:$action';
    return unconditionalWhileLocked.contains(key) ||
        conditionalOnOpenWork.contains(key);
  }
}
