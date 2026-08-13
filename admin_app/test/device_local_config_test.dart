import 'package:admin_app/services/sync_service.dart';
import 'package:flutter_test/flutter_test.dart';

/// Printer profiles and receipt layouts describe hardware attached to one
/// terminal. They have no table and no route on the server, so queueing them
/// for sync produced a permanently `rejected` entry per edit — a standing
/// "action needed" badge that no retry could ever clear.
void main() {
  group('device-local config stays out of the sync queue', () {
    test('enqueueing a printer profile is refused', () async {
      await expectLater(
        SyncService().enqueueOperation(
          entityType: 'printerProfile',
          action: 'create',
          payload: const {'id': 'profile-1'},
        ),
        throwsA(isA<SyncUnsupportedOperation>()),
      );
    });

    test('enqueueing a receipt layout is refused', () async {
      await expectLater(
        SyncService().enqueueOperation(
          entityType: 'receiptLayout',
          action: 'update',
          payload: const {'id': 'layout-1'},
        ),
        throwsA(isA<SyncUnsupportedOperation>()),
      );
    });

    test('entity types that do have a server route are still accepted', () async {
      // Guards against over-trimming the supported set: these four are the
      // neighbours of the two removed above. With no tenant bound in this bare
      // test they fail the *later* tenant check with a StateError, which is
      // itself the proof that they passed the supported-operation gate.
      for (final pair in const [
        ('product', 'create'),
        ('customer', 'update'),
        ('order', 'updateStatus'),
        ('contactInfo', 'delete'),
      ]) {
        await expectLater(
          SyncService().enqueueOperation(
            entityType: pair.$1,
            action: pair.$2,
            payload: const {'id': 'x'},
          ),
          throwsA(isA<StateError>()),
          reason: '${pair.$1}:${pair.$2} must remain syncable',
        );
      }
    });
  });
}
