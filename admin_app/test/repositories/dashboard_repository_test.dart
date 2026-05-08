import 'package:admin_app/repositories/dashboard_repository.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('parseDashboardStatsPayload', () {
    test('decodes JSON text into a string-keyed map', () {
      final parsed = parseDashboardStatsPayload(
        '{"counts":{"products":3},"ordersByStatus":{"PENDING":2}}',
      );

      expect(parsed, isNotNull);
      expect(parsed!['counts'], isA<Map>());
      expect((parsed['counts'] as Map)['products'], 3);
      expect((parsed['ordersByStatus'] as Map)['PENDING'], 2);
    });

    test('returns null for non-map payloads', () {
      expect(parseDashboardStatsPayload('"not a dashboard object"'), isNull);
      expect(parseDashboardStatsPayload(null), isNull);
    });
  });
}
