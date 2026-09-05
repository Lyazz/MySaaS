import 'dart:async';

import 'package:flutter/foundation.dart';

import '../models/license_status.dart';
import '../repositories/license_guard.dart';
import 'activation_service.dart';
import 'app_storage.dart';
import 'monotonic_clock.dart';

/// Owns this device's licence: what state it is in, when it must next reach the
/// server, and whether it may write.
///
/// Singleton, matching `SyncService` and `TenantModeService`, because the
/// answer must be the same everywhere in the app at any instant -- a repository
/// deep in a POS flow and the banner at the top of the shell cannot disagree
/// about whether the device is locked.
class LicenseService {
  static final LicenseService _instance = LicenseService._internal();
  factory LicenseService() => _instance;
  LicenseService._internal();

  /// Heartbeat cadence per state. A healthy device barely talks; a locked one
  /// checks often, so reactivation lands quickly once the super admin acts.
  static const Duration _validThrottle = Duration(hours: 6);
  static const Duration _graceInterval = Duration(minutes: 30);
  static const Duration _lockedInterval = Duration(minutes: 15);

  /// Re-evaluation tick, so a terminal left running for a week crosses
  /// `graceUntil` without needing a restart.
  static const Duration _evaluationInterval = Duration(minutes: 15);

  static const List<Duration> _backoff = [
    Duration(minutes: 1),
    Duration(minutes: 5),
    Duration(minutes: 15),
    Duration(minutes: 60),
  ];

  ActivationService? _activationService;
  String? _appVersion;

  LicenseSnapshot _snapshot = LicenseSnapshot.unactivated;
  final StreamController<LicenseSnapshot> _changes =
      StreamController<LicenseSnapshot>.broadcast();

  Timer? _evaluationTimer;
  DateTime? _lastHeartbeatAttempt;
  int _consecutiveFailures = 0;
  bool _heartbeatInFlight = false;
  bool _restored = false;

  LicenseSnapshot get current => _snapshot;
  LicenseState get state => _snapshot.stateAt(MonotonicClock.instance.now());
  bool get allowsWrites => state.allowsWrites;
  bool get isRestored => _restored;
  Stream<LicenseSnapshot> get changes => _changes.stream;

  /// Injects the collaborator used for heartbeats. Safe to call repeatedly.
  ///
  /// Deliberately does NOT start the re-evaluation timer. A periodic timer owned
  /// by a service outlives the widget tree, which breaks every widget test and,
  /// worse, keeps firing after the app is torn down. The timer belongs to the
  /// app lifecycle -- see [startPeriodicEvaluation], called from `AdminApp`.
  void initialize(ActivationService activationService, {String? appVersion}) {
    _activationService = activationService;
    _appVersion = appVersion;
  }

  /// Starts the wall-clock re-evaluation, so a terminal left running for a week
  /// crosses its grace boundary without needing a restart. Owned by the app,
  /// stopped in its `dispose`.
  void startPeriodicEvaluation() => _startEvaluationTimer();

  /// Loads and evaluates the licence from local storage only.
  ///
  /// Called before `runApp`, so the very first frame already knows whether this
  /// device may write -- no flash of writable UI that then locks.
  Future<void> restore() async {
    if (_restored) return;

    await MonotonicClock.instance.restore();

    final token = await AppStorage.getActivationToken();
    if (token == null || token.trim().isEmpty) {
      _emit(LicenseSnapshot.unactivated);
      _restored = true;
      return;
    }

    final lastHeartbeatAt = await AppStorage.getLastHeartbeatAt();
    final cached = await AppStorage.getLicenseSnapshot();

    try {
      final claims = await _decode(token);
      final snapshot = LicenseSnapshot.fromClaims(
        claims,
        now: MonotonicClock.instance.now(),
        legacyFirstSeenAt: await _legacyFirstSeenAt(cached),
        lastHeartbeatAt: lastHeartbeatAt,
      );

      // A server refusal recorded earlier survives a restart: a revoked device
      // must not come back writable just because it was power-cycled.
      final priorLock = cached == null
          ? null
          : LicenseSnapshot.fromJson(cached).serverLock;

      _emit(
        priorLock == null ? snapshot : snapshot.copyWith(serverLock: priorLock),
      );
    } catch (error) {
      // A token we cannot read is not a token we may trust.
      debugPrint('LicenseService: activation token unreadable: $error');
      _emit(
        (cached != null
                ? LicenseSnapshot.fromJson(cached)
                : const LicenseSnapshot())
            .copyWith(licenseExpiresAt: null, graceUntil: null),
      );
    }

    _restored = true;
  }

  /// Applies a freshly issued licence, from activation or from a heartbeat.
  ///
  /// Persisting the token is the part that must never fail: it is the device's
  /// proof of activation, and losing it would strand the install. Evaluating it
  /// is best-effort -- if the service has no decoder wired yet (early boot, a
  /// widget test), the token is still stored and `restore()` will read it on the
  /// next pass.
  Future<void> applyActivationToken(String token) async {
    await AppStorage.saveActivationToken(token);

    if (_activationService == null) return;

    try {
      final claims = await _decode(token);
      final snapshot = LicenseSnapshot.fromClaims(
        claims,
        now: MonotonicClock.instance.now(),
        lastHeartbeatAt: DateTime.now().toUtc(),
      );

      // A new licence clears any prior refusal: the server just vouched for us.
      _emit(snapshot.copyWith(clearServerLock: true));
      _consecutiveFailures = 0;
      _restored = true;
    } catch (error) {
      debugPrint('LicenseService: could not evaluate new licence: $error');
    }
  }

  /// Contacts the server to renew the window, honouring the per-state cadence.
  ///
  /// Fire-and-forget by design: nothing in the UI or the write path waits on
  /// this. A failure is never a lock -- only a passed `graceUntil` or an
  /// explicit refusal is.
  Future<void> heartbeat({bool force = false}) async {
    final service = _activationService;
    if (service == null || _heartbeatInFlight) return;
    if (_snapshot.isUnactivated) return;
    if (!force && !_isDue()) return;

    final token = await AppStorage.getActivationToken();
    if (token == null || token.trim().isEmpty) return;

    _heartbeatInFlight = true;
    _lastHeartbeatAttempt = DateTime.now().toUtc();

    try {
      final outcome = await service.heartbeat(
        activationToken: token,
        appVersion: _appVersion,
      );

      if (outcome.isRenewed) {
        // The server clock is authoritative and advances the monotonic mark,
        // which is what makes a rolled-back device clock worthless.
        if (outcome.serverTime != null) {
          MonotonicClock.instance.observeServerTime(outcome.serverTime!);
        }
        await AppStorage.saveLastHeartbeatAt(DateTime.now().toUtc());
        await applyActivationToken(outcome.activationToken!);
        return;
      }

      if (outcome.isRefused) {
        _applyRefusal(outcome.refusalCode!, outcome.revokedReason);
        return;
      }

      _consecutiveFailures += 1;
    } finally {
      _heartbeatInFlight = false;
    }
  }

  /// Re-evaluates on app resume and heartbeats if due.
  Future<void> onResumed() async {
    MonotonicClock.instance.observeNow();
    _emit(_snapshot);
    await heartbeat();
  }

  /// Backstop used by the sync outbox.
  ///
  /// Permissive on purpose: the outbox cannot know whether a write finishes
  /// work that was already open, so it admits anything that could qualify. It
  /// exists to catch a repository that forgot its guard, not to make the
  /// fine-grained ruling.
  void assertWriteAllowed(String entityType, String action) {
    if (allowsWrites) return;

    if (!LicenseWritePolicy.couldBeAllowedWhileLocked(entityType, action)) {
      throw LicenseLockedException(
        snapshot: _snapshot,
        state: state,
        intent: WriteIntent(entityType, action),
      );
    }
  }

  /// Clears licence state on logout or reprovisioning. The monotonic clock's
  /// high-water mark deliberately survives.
  Future<void> reset() async {
    _snapshot = LicenseSnapshot.unactivated;
    _consecutiveFailures = 0;
    _lastHeartbeatAttempt = null;
    await AppStorage.clearLicenseState();
    _restored = false;
    _changes.add(_snapshot);
  }

  void dispose() {
    _evaluationTimer?.cancel();
    _evaluationTimer = null;
  }

  // ---------------------------------------------------------------------------

  Future<Map<String, dynamic>> _decode(String token) async {
    final service = _activationService;
    if (service == null) {
      throw StateError('LicenseService.initialize must run before decoding');
    }
    return service.decodeClaims(token);
  }

  /// When this build first saw a legacy token, so its runway is measured from
  /// first sight rather than from every launch.
  Future<DateTime?> _legacyFirstSeenAt(Map<String, dynamic>? cached) async {
    if (cached != null) {
      final restored = LicenseSnapshot.fromJson(cached);
      if (restored.tokenSchemaVersion == 1 &&
          restored.licenseExpiresAt != null) {
        // Preserve the window already computed rather than restarting the
        // runway on every launch, which would never expire.
        return restored.licenseExpiresAt!.subtract(kLegacyTokenRunway);
      }
    }
    return MonotonicClock.instance.now();
  }

  void _applyRefusal(String code, String? revokedReason) {
    switch (code) {
      case 'DEVICE_REVOKED':
      case 'DEVICE_UNKNOWN':
      case 'TOKEN_SUPERSEDED':
        _emit(
          _snapshot.copyWith(
            serverLock: LicenseState.lockedRevoked,
            revokedReason: revokedReason,
          ),
        );
        break;
      case 'TENANT_SUSPENDED':
        _emit(_snapshot.copyWith(serverLock: LicenseState.lockedSuspended));
        break;
      case 'LICENSE_INACTIVE':
      case 'LICENSE_EXPIRED':
        _emit(_snapshot.copyWith(serverLock: LicenseState.lockedExpired));
        break;
      case 'HARDWARE_MISMATCH':
      case 'ACTIVATION_TOKEN_INVALID':
        _emit(_snapshot.copyWith(serverLock: LicenseState.lockedExpired));
        break;
      default:
        // An unrecognised refusal is treated as a transient failure rather than
        // a lock: a future server adding a new code must not brick old clients.
        _consecutiveFailures += 1;
    }
  }

  bool _isDue() {
    final last = _lastHeartbeatAttempt;
    final now = DateTime.now().toUtc();

    if (_consecutiveFailures > 0 && last != null) {
      final delay =
          _backoff[(_consecutiveFailures - 1).clamp(0, _backoff.length - 1)];
      if (now.difference(last) < delay) return false;
    }

    if (last == null) return true;

    switch (state) {
      case LicenseState.valid:
        return now.difference(last) >= _validThrottle;
      case LicenseState.grace:
        return now.difference(last) >= _graceInterval;
      case LicenseState.lockedExpired:
      case LicenseState.lockedRevoked:
      case LicenseState.lockedSuspended:
        return now.difference(last) >= _lockedInterval;
      case LicenseState.unactivated:
        return false;
    }
  }

  void _startEvaluationTimer() {
    _evaluationTimer?.cancel();
    _evaluationTimer = Timer.periodic(_evaluationInterval, (_) {
      MonotonicClock.instance.observeNow();
      // Re-emit so listeners re-derive the state; the snapshot itself is
      // unchanged, only the clock moved.
      _changes.add(_snapshot);
      unawaited(heartbeat());
    });
  }

  void _emit(LicenseSnapshot snapshot) {
    _snapshot = snapshot;
    _changes.add(snapshot);
    unawaited(
      AppStorage.saveLicenseSnapshot(snapshot.toJson()).catchError((Object e) {
        debugPrint('LicenseService: could not persist snapshot: $e');
      }),
    );
  }

  @visibleForTesting
  void setSnapshotForTesting(LicenseSnapshot snapshot) {
    _snapshot = snapshot;
    _restored = true;
  }

  @visibleForTesting
  void resetForTesting() {
    _evaluationTimer?.cancel();
    _evaluationTimer = null;
    _snapshot = LicenseSnapshot.unactivated;
    _restored = false;
    _consecutiveFailures = 0;
    _lastHeartbeatAttempt = null;
    _heartbeatInFlight = false;
    _activationService = null;
  }
}
