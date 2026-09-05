import 'package:admin_app/models/license_status.dart';
import 'package:admin_app/repositories/license_guard.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final now = DateTime.utc(2026, 8, 27, 12);

  final unlocked = LicenseSnapshot(
    licenseExpiresAt: now.add(const Duration(days: 10)),
    graceUntil: now.add(const Duration(days: 17)),
  );

  final inGrace = LicenseSnapshot(
    licenseExpiresAt: now.subtract(const Duration(days: 1)),
    graceUntil: now.add(const Duration(days: 6)),
  );

  final locked = LicenseSnapshot(
    licenseExpiresAt: now.subtract(const Duration(days: 10)),
    graceUntil: now.subtract(const Duration(days: 3)),
  );

  final revoked = unlocked.copyWith(serverLock: LicenseState.lockedRevoked);

  bool allows(LicenseSnapshot s, WriteIntent intent) =>
      LicenseWritePolicy.isAllowed(s, now, intent);

  group('while the licence is healthy', () {
    test('every write is permitted', () {
      for (final intent in const [
        WriteIntent('sale', 'create'),
        WriteIntent('product', 'update'),
        WriteIntent('order', 'create'),
        WriteIntent('storeSettings', 'patch'),
        WriteIntent('cashSession', 'open'),
      ]) {
        expect(allows(unlocked, intent), isTrue, reason: intent.key);
        expect(
          allows(inGrace, intent),
          isTrue,
          reason: '${intent.key} in grace',
        );
      }
    });
  });

  group('while locked: finishing open work', () {
    test('closing an already-open till is always allowed', () {
      // Refusing this would strand a shop mid-day with cash it cannot reconcile.
      expect(allows(locked, const WriteIntent('cashSession', 'close')), isTrue);
      expect(
        allows(revoked, const WriteIntent('cashSession', 'close')),
        isTrue,
      );
    });

    test('settle-up movements are allowed only against an open session', () {
      expect(
        allows(
          locked,
          const WriteIntent(
            'cashTransaction',
            'create',
            finishesOpenWork: true,
          ),
        ),
        isTrue,
      );
      expect(
        allows(locked, const WriteIntent('cashTransaction', 'create')),
        isFalse,
      );
    });

    test('an existing order can still be moved to its final status', () {
      expect(
        allows(
          locked,
          const WriteIntent('order', 'updateStatus', finishesOpenWork: true),
        ),
        isTrue,
      );
    });

    test('an existing order can still be annotated', () {
      for (final action in ['updateCallStatus', 'updateInternalNotes']) {
        expect(
          allows(locked, WriteIntent('order', action, finishesOpenWork: true)),
          isTrue,
          reason: action,
        );
      }
    });

    test('payment can still be collected on an order already issued', () {
      expect(
        allows(
          locked,
          const WriteIntent(
            'customerPayment',
            'create',
            finishesOpenWork: true,
          ),
        ),
        isTrue,
      );
    });
  });

  group('while locked: everything else is refused', () {
    test('no new business may be created', () {
      for (final intent in const [
        WriteIntent('sale', 'create'),
        WriteIntent('order', 'create'),
        WriteIntent('cashSession', 'open'),
        WriteIntent('customer', 'create'),
        WriteIntent('purchase', 'createDraft'),
      ]) {
        expect(allows(locked, intent), isFalse, reason: intent.key);
      }
    });

    test('catalogue and configuration are frozen', () {
      for (final intent in const [
        WriteIntent('product', 'update'),
        WriteIntent('product', 'delete'),
        WriteIntent('category', 'create'),
        WriteIntent('storeSettings', 'patch'),
        WriteIntent('staffRole', 'update'),
        WriteIntent('user', 'create'),
        WriteIntent('deliveryProvider', 'update'),
        WriteIntent('cashbox', 'update'),
        WriteIntent('supplier', 'update'),
        WriteIntent('contactInfo', 'delete'),
      ]) {
        expect(allows(locked, intent), isFalse, reason: intent.key);
      }
    });

    test('finishesOpenWork does not unlock an unrelated write', () {
      // The flag is not a skeleton key: it only applies to the listed pairs.
      expect(
        allows(
          locked,
          const WriteIntent('sale', 'create', finishesOpenWork: true),
        ),
        isFalse,
      );
      expect(
        allows(
          locked,
          const WriteIntent('product', 'update', finishesOpenWork: true),
        ),
        isFalse,
      );
    });

    test('the same rules apply to a revoked and a suspended device', () {
      for (final s in [
        revoked,
        unlocked.copyWith(serverLock: LicenseState.lockedSuspended),
      ]) {
        expect(allows(s, const WriteIntent('sale', 'create')), isFalse);
        expect(
          allows(
            s,
            const WriteIntent('order', 'updateStatus', finishesOpenWork: true),
          ),
          isTrue,
        );
      }
    });
  });

  group('an unactivated device', () {
    test('is not treated as locked', () {
      // A device that has never been activated has no licence to have expired.
      // It is gated by the router (offline-only installs go to activation) and
      // by the server (which refuses its API calls), not by this policy.
      //
      // Blocking it here would break the shipping default: with seat
      // enforcement disabled a legitimate login returns no activation token,
      // and refusing every write on that device would be a self-inflicted
      // outage.
      const s = LicenseSnapshot.unactivated;
      expect(allows(s, const WriteIntent('sale', 'create')), isTrue);
      expect(allows(s, const WriteIntent('product', 'update')), isTrue);
    });
  });

  group('outbox backstop superset', () {
    test(
      'admits exactly the pairs that could ever be allowed while locked',
      () {
        expect(
          LicenseWritePolicy.couldBeAllowedWhileLocked('cashSession', 'close'),
          isTrue,
        );
        expect(
          LicenseWritePolicy.couldBeAllowedWhileLocked('order', 'updateStatus'),
          isTrue,
        );
        expect(
          LicenseWritePolicy.couldBeAllowedWhileLocked('sale', 'create'),
          isFalse,
        );
        expect(
          LicenseWritePolicy.couldBeAllowedWhileLocked('cashSession', 'open'),
          isFalse,
        );
      },
    );
  });
}
