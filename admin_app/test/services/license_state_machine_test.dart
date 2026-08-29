import 'package:admin_app/models/license_status.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final now = DateTime.utc(2026, 8, 27, 12);

  LicenseSnapshot snapshot({
    Duration expiresIn = const Duration(days: 30),
    Duration graceAfterExpiry = const Duration(days: 7),
    LicenseState? serverLock,
    bool trialing = false,
    DateTime? trialEnd,
  }) {
    final expiresAt = now.add(expiresIn);
    return LicenseSnapshot(
      licenseExpiresAt: expiresAt,
      graceUntil: expiresAt.add(graceAfterExpiry),
      serverLock: serverLock,
      subscriptionIsTrialing: trialing,
      trialEnd: trialEnd,
    );
  }

  group('state transitions', () {
    test('inside the window is valid', () {
      expect(snapshot().stateAt(now), LicenseState.valid);
    });

    test('past the expiry but inside grace is grace', () {
      final s = snapshot(expiresIn: const Duration(days: -1));
      expect(s.stateAt(now), LicenseState.grace);
      // Grace still writes -- it is a warning, not a lock.
      expect(s.stateAt(now).allowsWrites, isTrue);
    });

    test('past grace is locked', () {
      final s = snapshot(expiresIn: const Duration(days: -8));
      expect(s.stateAt(now), LicenseState.lockedExpired);
      expect(s.stateAt(now).allowsWrites, isFalse);
      expect(s.stateAt(now).isLocked, isTrue);
    });

    test('an unactivated device is not treated as locked', () {
      const s = LicenseSnapshot.unactivated;
      expect(s.stateAt(now), LicenseState.unactivated);
      // No licence yet is not the same as an expired one: it goes to
      // activation, not to the read-only banner, and it is not write-blocked.
      expect(s.stateAt(now).isLocked, isFalse);
      expect(s.stateAt(now).allowsWrites, isTrue);
    });

    test('a token with no readable window is locked, not trusted', () {
      const s = LicenseSnapshot(licenseExpiresAt: null, graceUntil: null);
      expect(s.stateAt(now), LicenseState.lockedExpired);
    });
  });

  group('boundaries', () {
    test('the instant of expiry moves to grace, not to locked', () {
      final s = LicenseSnapshot(
        licenseExpiresAt: now,
        graceUntil: now.add(const Duration(days: 7)),
      );
      expect(s.stateAt(now), LicenseState.grace);
    });

    test('the instant grace ends locks', () {
      final s = LicenseSnapshot(
        licenseExpiresAt: now.subtract(const Duration(days: 7)),
        graceUntil: now,
      );
      expect(s.stateAt(now), LicenseState.lockedExpired);
    });

    test('one millisecond before expiry is still valid', () {
      final s = LicenseSnapshot(
        licenseExpiresAt: now.add(const Duration(milliseconds: 1)),
        graceUntil: now.add(const Duration(days: 7)),
      );
      expect(s.stateAt(now), LicenseState.valid);
    });
  });

  group('server refusals outrank the dates', () {
    test('a revoked device is locked even inside a valid window', () {
      final s = snapshot(serverLock: LicenseState.lockedRevoked);
      expect(s.stateAt(now), LicenseState.lockedRevoked);
    });

    test('a suspended tenant is locked even inside a valid window', () {
      final s = snapshot(serverLock: LicenseState.lockedSuspended);
      expect(s.stateAt(now), LicenseState.lockedSuspended);
    });

    test('clearing the lock returns to the date-driven state', () {
      final s = snapshot(
        serverLock: LicenseState.lockedRevoked,
      ).copyWith(clearServerLock: true);
      expect(s.stateAt(now), LicenseState.valid);
    });
  });

  group('legacy v1 tokens', () {
    Map<String, dynamic> v1Claims({DateTime? issuedAt}) => {
      'deviceId': 'device-1',
      'iat': ((issuedAt ?? now).millisecondsSinceEpoch / 1000).floor(),
    };

    test('gets a synthesized window instead of being refused', () {
      final s = LicenseSnapshot.fromClaims(
        v1Claims(),
        now: now,
        legacyFirstSeenAt: now,
      );

      expect(s.tokenSchemaVersion, 1);
      expect(s.stateAt(now), LicenseState.valid);
    });

    test('gets at least 14 days from first sight before locking', () {
      final s = LicenseSnapshot.fromClaims(
        v1Claims(),
        now: now,
        legacyFirstSeenAt: now,
      );

      // 7-day runway + 7-day grace. A device in the field must never be
      // bricked instantly by shipping the new build.
      expect(s.stateAt(now.add(const Duration(days: 13))).allowsWrites, isTrue);
      expect(s.stateAt(now.add(const Duration(days: 15))).isLocked, isTrue);
    });

    test('an old token is bounded by its age, not only by first sight', () {
      final s = LicenseSnapshot.fromClaims(
        v1Claims(issuedAt: now.subtract(const Duration(days: 28))),
        now: now,
        legacyFirstSeenAt: now,
      );

      // issuedAt + 30d is sooner than firstSeen + 7d, so it wins.
      expect(s.licenseExpiresAt, now.add(const Duration(days: 2)));
    });
  });

  group('v2 claims', () {
    test('reads the window and the trial flag straight off the token', () {
      final trialEnd = now.add(const Duration(days: 5));
      final s = LicenseSnapshot.fromClaims({
        'v': 2,
        'deviceId': 'device-9',
        'maxDevices': 3,
        'tokenVersion': 4,
        'subscriptionStatus': 'TRIALING',
        'trialEnd': trialEnd.toIso8601String(),
        'licenseExpiresAt': trialEnd.toIso8601String(),
        'graceUntil': trialEnd.add(const Duration(days: 7)).toIso8601String(),
      }, now: now);

      expect(s.tokenSchemaVersion, 2);
      expect(s.deviceId, 'device-9');
      expect(s.maxDevices, 3);
      expect(s.tokenVersion, 4);
      expect(s.subscriptionIsTrialing, isTrue);
      expect(s.trialDaysRemainingAt(now), 5);
    });

    test('a trial that ended locks the device with no network involved', () {
      final trialEnd = now.subtract(const Duration(days: 8));
      final s = LicenseSnapshot.fromClaims({
        'v': 2,
        'subscriptionStatus': 'TRIALING',
        'trialEnd': trialEnd.toIso8601String(),
        'licenseExpiresAt': trialEnd.toIso8601String(),
        'graceUntil': trialEnd.add(const Duration(days: 7)).toIso8601String(),
      }, now: now);

      expect(s.stateAt(now), LicenseState.lockedExpired);
    });
  });

  group('serialization', () {
    test('round-trips through json', () {
      final original = snapshot(
        serverLock: LicenseState.lockedRevoked,
        trialing: true,
        trialEnd: now.add(const Duration(days: 3)),
      ).copyWith(revokedReason: 'Reported stolen', deviceId: 'device-2');

      final restored = LicenseSnapshot.fromJson(original.toJson());

      expect(restored.stateAt(now), original.stateAt(now));
      expect(restored.revokedReason, 'Reported stolen');
      expect(restored.deviceId, 'device-2');
      expect(restored.subscriptionIsTrialing, isTrue);
      expect(restored.licenseExpiresAt, original.licenseExpiresAt);
    });
  });
}
