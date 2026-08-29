import 'package:admin_app/services/app_storage.dart';
import 'package:admin_app/services/monotonic_clock.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late DateTime wall;
  late MonotonicClock clock;

  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
    wall = DateTime.utc(2026, 8, 27, 12);
    clock = MonotonicClock.forTesting(wallClock: () => wall);
  });

  group('monotonic behaviour', () {
    test('reports the wall clock when nothing has been observed', () {
      expect(clock.now(), wall);
    });

    test('advances the mark as the wall clock moves forward', () {
      clock.observeNow();
      wall = wall.add(const Duration(hours: 3));

      expect(clock.now(), wall);
      expect(clock.highWaterMark, isNotNull);
    });

    test('a rolled-back clock cannot un-expire a licence', () {
      clock.observeNow();
      final observed = clock.highWaterMark!;

      // The two-tap attack: wind the device clock back a month.
      wall = wall.subtract(const Duration(days: 30));

      // now() refuses to go backwards, so an expiry already passed stays passed.
      expect(clock.now(), observed);
      expect(clock.now().isAfter(wall), isTrue);
    });

    test('never lowers the mark, however far back the clock is set', () {
      clock.observeNow();
      final mark = clock.highWaterMark!;

      wall = wall.subtract(const Duration(days: 365));
      clock.observeNow();

      expect(clock.highWaterMark, mark);
    });
  });

  group('server time', () {
    test('a server instant advances the mark past the device clock', () {
      final serverTime = wall.add(const Duration(days: 2));
      clock.observeServerTime(serverTime);

      expect(clock.now(), serverTime);
    });

    test('a stale server instant does not pull the mark back', () {
      clock.observeNow();
      final mark = clock.highWaterMark!;

      clock.observeServerTime(wall.subtract(const Duration(days: 5)));

      expect(clock.highWaterMark, mark);
    });
  });

  group('clock skew reporting', () {
    test('reports no skew when the clock is ahead of the mark', () {
      clock.observeNow();
      wall = wall.add(const Duration(days: 1));

      expect(clock.clockBehindBy, Duration.zero);
      expect(clock.isClockSuspect, isFalse);
    });

    test('a small lag is tolerated silently', () {
      clock.observeNow();
      wall = wall.subtract(const Duration(hours: 2));

      expect(clock.clockBehindBy, const Duration(hours: 2));
      // A couple of hours is drift, not fraud.
      expect(clock.isClockSuspect, isFalse);
    });

    test('a large lag is surfaced, but is never itself a lock', () {
      clock.observeNow();
      wall = wall.subtract(const Duration(days: 40));

      expect(clock.isClockSuspect, isTrue);
      // The dead-CMOS-battery case: warn, do not lock.
      expect(clock.now(), isNot(wall));
    });
  });

  group('persistence', () {
    test('restores the mark across a cold start', () async {
      clock.observeNow();
      await clock.flushPersist();

      final stored = await AppStorage.getLicenseTimeHighWaterMark();
      expect(stored, isNotNull);

      final rebooted = MonotonicClock.forTesting(
        wallClock: () => wall.subtract(const Duration(days: 10)),
      );
      await rebooted.restore();

      // Wiping the clock and restarting does not reset the floor.
      expect(
        rebooted.now().isAfter(wall.subtract(const Duration(days: 10))),
        isTrue,
      );
    });

    test('restore is idempotent', () async {
      await clock.restore();
      final first = clock.highWaterMark;
      await clock.restore();

      expect(clock.highWaterMark, first);
    });
  });
}
