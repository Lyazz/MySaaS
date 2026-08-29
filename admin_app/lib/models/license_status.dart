import 'package:flutter/foundation.dart';

/// Where this device stands with its activation licence.
///
/// This is a third axis, deliberately kept apart from `AppMode` (what
/// connectivity policy applies) and `SubscriptionTier` (which features the
/// tenant is entitled to). Folding it into either would be exactly the "one
/// boolean for three concepts" collapse that made the original offline handling
/// hard to reason about.
enum LicenseState {
  /// No activation token at all. The device has never been activated.
  unactivated,

  /// Inside the offline window. Everything works.
  valid,

  /// Past `licenseExpiresAt` but before `graceUntil`. Everything still works;
  /// the app warns, increasingly loudly.
  grace,

  /// Past `graceUntil`, or holding a token that cannot be read. Read-only.
  lockedExpired,

  /// The server said this device was revoked. Read-only.
  lockedRevoked,

  /// The server said the tenant is suspended. Read-only.
  lockedSuspended,
}

extension LicenseStateX on LicenseState {
  /// Whether the licence itself permits unrestricted writes.
  ///
  /// `unactivated` is included: a device that has never been activated is not
  /// locked, it simply has no licence yet, and is gated by the router and by
  /// the server instead. Only an expired or revoked licence restricts writes.
  bool get allowsWrites =>
      this == LicenseState.valid ||
      this == LicenseState.grace ||
      this == LicenseState.unactivated;

  /// Locked means "read, finish open work, export" -- never "data destroyed".
  bool get isLocked =>
      this != LicenseState.valid &&
      this != LicenseState.grace &&
      this != LicenseState.unactivated;
}

/// How long a v1 token -- one minted before licences carried a window -- is
/// honoured once this build first sees it.
///
/// Devices in the field hold these. Refusing one outright would brick a device
/// that has done nothing wrong, so it gets a grace runway to reach the server
/// once, after which the heartbeat replaces it with a real v2 licence.
const Duration kLegacyTokenRunway = Duration(days: 7);
const Duration kLegacyTokenMaxAge = Duration(days: 30);
const Duration kLegacyTokenGrace = Duration(days: 7);

/// The facts about the current licence. Pure data: [stateAt] derives the state,
/// so the same snapshot can be re-evaluated as time passes without refetching.
@immutable
class LicenseSnapshot {
  /// Null until the device has been activated at least once.
  final DateTime? licenseExpiresAt;
  final DateTime? graceUntil;
  final DateTime? trialEnd;
  final DateTime? lastHeartbeatAt;

  final String? deviceId;
  final String? revokedReason;

  final int maxDevices;
  final int tokenVersion;

  /// 1 for a legacy token whose window we synthesized, 2 for a real licence.
  final int tokenSchemaVersion;

  final bool subscriptionIsTrialing;

  /// Set from an explicit server refusal. Dates cannot tell us a device was
  /// revoked -- only the server can, and only when it can be reached.
  final LicenseState? serverLock;

  /// True when there is no token at all.
  final bool isUnactivated;

  const LicenseSnapshot({
    this.licenseExpiresAt,
    this.graceUntil,
    this.trialEnd,
    this.lastHeartbeatAt,
    this.deviceId,
    this.revokedReason,
    this.maxDevices = 1,
    this.tokenVersion = 1,
    this.tokenSchemaVersion = 2,
    this.subscriptionIsTrialing = false,
    this.serverLock,
    this.isUnactivated = false,
  });

  /// The state of a device that has never been activated.
  static const LicenseSnapshot unactivated = LicenseSnapshot(
    isUnactivated: true,
  );

  /// Derives the state at [now].
  ///
  /// Order matters: an explicit server refusal outranks the dates, because a
  /// revoked device may still be holding a perfectly valid-looking window.
  LicenseState stateAt(DateTime now) {
    if (isUnactivated) return LicenseState.unactivated;
    if (serverLock != null) return serverLock!;

    final expiresAt = licenseExpiresAt;
    final grace = graceUntil;

    // A token we could not read a window out of is not trusted.
    if (expiresAt == null || grace == null) return LicenseState.lockedExpired;

    if (now.isBefore(expiresAt)) return LicenseState.valid;
    if (now.isBefore(grace)) return LicenseState.grace;
    return LicenseState.lockedExpired;
  }

  /// Time left before the next transition, or null when there is none.
  Duration? remainingAt(DateTime now) {
    switch (stateAt(now)) {
      case LicenseState.valid:
        return licenseExpiresAt!.difference(now);
      case LicenseState.grace:
        return graceUntil!.difference(now);
      default:
        return null;
    }
  }

  /// Days left of a trial, for the countdown banner.
  int? trialDaysRemainingAt(DateTime now) {
    if (!subscriptionIsTrialing || trialEnd == null) return null;
    final remaining = trialEnd!.difference(now);
    return remaining.isNegative ? 0 : remaining.inDays;
  }

  LicenseSnapshot copyWith({
    DateTime? licenseExpiresAt,
    DateTime? graceUntil,
    DateTime? trialEnd,
    DateTime? lastHeartbeatAt,
    String? deviceId,
    String? revokedReason,
    int? maxDevices,
    int? tokenVersion,
    int? tokenSchemaVersion,
    bool? subscriptionIsTrialing,
    LicenseState? serverLock,
    bool clearServerLock = false,
    bool? isUnactivated,
  }) {
    return LicenseSnapshot(
      licenseExpiresAt: licenseExpiresAt ?? this.licenseExpiresAt,
      graceUntil: graceUntil ?? this.graceUntil,
      trialEnd: trialEnd ?? this.trialEnd,
      lastHeartbeatAt: lastHeartbeatAt ?? this.lastHeartbeatAt,
      deviceId: deviceId ?? this.deviceId,
      revokedReason: revokedReason ?? this.revokedReason,
      maxDevices: maxDevices ?? this.maxDevices,
      tokenVersion: tokenVersion ?? this.tokenVersion,
      tokenSchemaVersion: tokenSchemaVersion ?? this.tokenSchemaVersion,
      subscriptionIsTrialing:
          subscriptionIsTrialing ?? this.subscriptionIsTrialing,
      serverLock: clearServerLock ? null : (serverLock ?? this.serverLock),
      isUnactivated: isUnactivated ?? this.isUnactivated,
    );
  }

  /// Builds a snapshot from decoded activation-token claims.
  ///
  /// [legacyFirstSeenAt] is when this build first encountered a v1 token, and
  /// is only consulted for v1. [now] is the monotonic clock reading.
  factory LicenseSnapshot.fromClaims(
    Map<String, dynamic> claims, {
    required DateTime now,
    DateTime? legacyFirstSeenAt,
    DateTime? lastHeartbeatAt,
  }) {
    DateTime? parse(Object? value) {
      if (value is! String || value.trim().isEmpty) return null;
      return DateTime.tryParse(value)?.toUtc();
    }

    final isV2 = claims['v'] == 2;

    if (!isV2) {
      // Legacy token: synthesize a short, bounded window. It is deliberately
      // generous enough that a device gets a real chance to reach the server,
      // and deliberately short enough that it cannot be used to dodge the
      // licensing rules indefinitely.
      final issuedAtSeconds = claims['iat'];
      final issuedAt = issuedAtSeconds is int
          ? DateTime.fromMillisecondsSinceEpoch(
              issuedAtSeconds * 1000,
              isUtc: true,
            )
          : now;

      final firstSeen = legacyFirstSeenAt ?? now;
      final byAge = issuedAt.add(kLegacyTokenMaxAge);
      final byRunway = firstSeen.add(kLegacyTokenRunway);
      final expiresAt = byAge.isBefore(byRunway) ? byAge : byRunway;

      return LicenseSnapshot(
        licenseExpiresAt: expiresAt,
        graceUntil: expiresAt.add(kLegacyTokenGrace),
        deviceId: claims['deviceId'] as String?,
        tokenSchemaVersion: 1,
        lastHeartbeatAt: lastHeartbeatAt,
      );
    }

    final status = (claims['subscriptionStatus'] as String?)
        ?.trim()
        .toUpperCase();

    return LicenseSnapshot(
      licenseExpiresAt: parse(claims['licenseExpiresAt']),
      graceUntil: parse(claims['graceUntil']),
      trialEnd: parse(claims['trialEnd']),
      deviceId: claims['deviceId'] as String?,
      maxDevices: claims['maxDevices'] is int ? claims['maxDevices'] as int : 1,
      tokenVersion: claims['tokenVersion'] is int
          ? claims['tokenVersion'] as int
          : 1,
      tokenSchemaVersion: 2,
      subscriptionIsTrialing: status == 'TRIALING',
      lastHeartbeatAt: lastHeartbeatAt,
    );
  }

  Map<String, dynamic> toJson() => {
    'licenseExpiresAt': licenseExpiresAt?.toIso8601String(),
    'graceUntil': graceUntil?.toIso8601String(),
    'trialEnd': trialEnd?.toIso8601String(),
    'lastHeartbeatAt': lastHeartbeatAt?.toIso8601String(),
    'deviceId': deviceId,
    'revokedReason': revokedReason,
    'maxDevices': maxDevices,
    'tokenVersion': tokenVersion,
    'tokenSchemaVersion': tokenSchemaVersion,
    'subscriptionIsTrialing': subscriptionIsTrialing,
    'serverLock': serverLock?.name,
    'isUnactivated': isUnactivated,
  };

  factory LicenseSnapshot.fromJson(Map<String, dynamic> json) {
    DateTime? parse(Object? value) {
      if (value is! String || value.trim().isEmpty) return null;
      return DateTime.tryParse(value)?.toUtc();
    }

    LicenseState? lock;
    final lockName = json['serverLock'];
    if (lockName is String) {
      for (final state in LicenseState.values) {
        if (state.name == lockName) {
          lock = state;
          break;
        }
      }
    }

    return LicenseSnapshot(
      licenseExpiresAt: parse(json['licenseExpiresAt']),
      graceUntil: parse(json['graceUntil']),
      trialEnd: parse(json['trialEnd']),
      lastHeartbeatAt: parse(json['lastHeartbeatAt']),
      deviceId: json['deviceId'] as String?,
      revokedReason: json['revokedReason'] as String?,
      maxDevices: json['maxDevices'] is int ? json['maxDevices'] as int : 1,
      tokenVersion: json['tokenVersion'] is int
          ? json['tokenVersion'] as int
          : 1,
      tokenSchemaVersion: json['tokenSchemaVersion'] is int
          ? json['tokenSchemaVersion'] as int
          : 2,
      subscriptionIsTrialing: json['subscriptionIsTrialing'] == true,
      serverLock: lock,
      isUnactivated: json['isUnactivated'] == true,
    );
  }
}
