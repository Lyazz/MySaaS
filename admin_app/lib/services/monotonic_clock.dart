import 'dart:async';

import 'package:flutter/foundation.dart';

import 'app_storage.dart';

/// A clock that never runs backwards.
///
/// A licence that expires on a date is only as trustworthy as the clock that
/// reads it. Rolling a device's system clock back a month would otherwise
/// un-expire it, and on a POS terminal that is a two-tap operation in Settings.
///
/// So we keep a high-water mark of the latest instant we have ever observed, and
/// report `max(wallClock, highWaterMark)`. The mark advances on every boot, on
/// every successful heartbeat (to the server's own clock, which is
/// authoritative), on every sync pass and on every guarded write. It never moves
/// backwards. Winding the clock back therefore buys nothing.
///
/// What this deliberately does NOT attempt:
/// - platform uptime counters, which reset on reboot;
/// - detecting a *forward* jump, since moving the clock forward only locks the
///   device sooner, which is not an attack;
/// - resisting a rooted device with a patched binary. That is not a threat this
///   layer can answer, and pretending otherwise would only add complexity.
///
/// A clock more than [clockBehindTolerance] behind the mark is surfaced as a
/// warning, not a lock: a dead CMOS battery on a shop PC is far more common than
/// fraud, and locking an honest shop out over it would be the worse failure.
class MonotonicClock {
  MonotonicClock._();

  static MonotonicClock instance = MonotonicClock._();

  /// Replaces the singleton. Tests only.
  @visibleForTesting
  static void setInstanceForTesting(MonotonicClock clock) {
    instance = clock;
  }

  @visibleForTesting
  MonotonicClock.forTesting({DateTime Function()? wallClock})
    : _wallClock = wallClock ?? (() => DateTime.now().toUtc());

  DateTime Function() _wallClock = () => DateTime.now().toUtc();

  static const Duration clockBehindTolerance = Duration(hours: 24);

  DateTime? _highWaterMark;
  bool _restored = false;

  /// Persisted asynchronously so callers on a write path never wait on storage.
  Future<void>? _pendingPersist;

  DateTime? get highWaterMark => _highWaterMark;
  bool get isRestored => _restored;

  /// Loads the persisted mark. Safe to call more than once.
  Future<void> restore() async {
    if (_restored) return;

    final stored = await AppStorage.getLicenseTimeHighWaterMark();
    if (stored != null) {
      _highWaterMark = stored;
    }
    _restored = true;

    // Boot itself is an observation: time has at least reached now.
    observeNow();
  }

  /// The current instant, floored at everything we have ever seen.
  DateTime now() {
    final wall = _wallClock();
    final mark = _highWaterMark;
    if (mark == null) return wall;
    return wall.isAfter(mark) ? wall : mark;
  }

  /// Records that the wall clock has reached its current value.
  void observeNow() => _advanceTo(_wallClock());

  /// Records an instant the server vouched for. Authoritative: a server time is
  /// worth more than anything the device can tell us about itself.
  void observeServerTime(DateTime serverTime) => _advanceTo(serverTime.toUtc());

  /// How far the device clock currently sits behind the mark.
  ///
  /// [Duration.zero] when the wall clock is at or ahead of the mark.
  Duration get clockBehindBy {
    final mark = _highWaterMark;
    if (mark == null) return Duration.zero;

    final wall = _wallClock();
    if (!wall.isBefore(mark)) return Duration.zero;
    return mark.difference(wall);
  }

  /// True when the device clock is far enough behind to be worth telling the
  /// user about. Never on its own a reason to lock.
  bool get isClockSuspect => clockBehindBy > clockBehindTolerance;

  void _advanceTo(DateTime candidate) {
    final utc = candidate.toUtc();
    final mark = _highWaterMark;

    if (mark != null && !utc.isAfter(mark)) return;

    _highWaterMark = utc;
    _schedulePersist(utc);
  }

  void _schedulePersist(DateTime value) {
    // Coalesce: writes land on hot paths, and secure storage is not free.
    if (_pendingPersist != null) return;

    _pendingPersist = Future<void>(() async {
      try {
        await AppStorage.saveLicenseTimeHighWaterMark(value);
      } catch (error) {
        // Losing one persist is survivable -- the mark is re-established from
        // the next heartbeat. Failing a sale over it would not be.
        debugPrint('MonotonicClock: could not persist high-water mark: $error');
      } finally {
        _pendingPersist = null;
      }
    });
  }

  /// Waits for any in-flight persist. Tests only.
  @visibleForTesting
  Future<void> flushPersist() async => _pendingPersist;

  @visibleForTesting
  void resetForTesting({DateTime? highWaterMark}) {
    _highWaterMark = highWaterMark;
    _restored = false;
    _pendingPersist = null;
  }
}
