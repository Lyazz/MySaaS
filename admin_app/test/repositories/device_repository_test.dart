import 'package:admin_app/repositories/device_repository.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('DeviceRequest parsing', () {
    test('reads a pending request and exposes no claim code', () {
      final request = DeviceRequest.fromJson({
        'id': 'req-1',
        'status': 'PENDING',
        'claimCode': null,
      });

      expect(request.id, 'req-1');
      expect(request.status, DeviceRequestStatus.pending);
      expect(request.isPending, isTrue);
      expect(request.isApproved, isFalse);
      // A pending request must never carry a code: the server withholds it
      // until a super admin has actually decided.
      expect(request.claimCode, isNull);
    });

    test('reads an approved request with its claim code', () {
      final request = DeviceRequest.fromJson({
        'id': 'req-2',
        'status': 'APPROVED',
        'claimCode': 'abc123',
        'decidedAt': '2026-08-27T10:00:00.000Z',
      });

      expect(request.isApproved, isTrue);
      expect(request.claimCode, 'abc123');
      expect(request.decidedAt, DateTime.utc(2026, 8, 27, 10));
    });

    test('reads a denial with the reason the administrator gave', () {
      final request = DeviceRequest.fromJson({
        'id': 'req-3',
        'status': 'DENIED',
        'decisionNote': 'Not on this plan',
      });

      expect(request.isDenied, isTrue);
      expect(request.decisionNote, 'Not on this plan');
    });

    test('maps every server status', () {
      final cases = {
        'PENDING': DeviceRequestStatus.pending,
        'APPROVED': DeviceRequestStatus.approved,
        'DENIED': DeviceRequestStatus.denied,
        'EXPIRED': DeviceRequestStatus.expired,
        'CANCELLED': DeviceRequestStatus.cancelled,
      };

      for (final entry in cases.entries) {
        final request = DeviceRequest.fromJson({
          'id': 'x',
          'status': entry.key,
        });
        expect(request.status, entry.value, reason: entry.key);
      }
    });

    test('treats an unknown status as none rather than crashing', () {
      // A future server adding a status must not break an older client.
      final request = DeviceRequest.fromJson({
        'id': 'x',
        'status': 'SOMETHING_NEW',
      });

      expect(request.status, DeviceRequestStatus.none);
      expect(request.isPending, isFalse);
      expect(request.isApproved, isFalse);
    });

    test('tolerates a missing status entirely', () {
      final request = DeviceRequest.fromJson({'id': 'x'});
      expect(request.status, DeviceRequestStatus.none);
    });
  });
}
