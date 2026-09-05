import 'package:admin_app/utils/pos_grid.dart';
import 'package:flutter_test/flutter_test.dart';

int cols(double width, {required bool isMobile, int preferred = 4}) =>
    posAdaptiveGridColumns(
      width: width,
      isMobile: isMobile,
      preferred: preferred,
    );

void main() {
  group('very narrow viewports', () {
    test('drop to a single column below the readable threshold', () {
      expect(cols(320, isMobile: true), 1);
      expect(cols(320, isMobile: false), 1);
      expect(cols(359, isMobile: true), 1);
    });
  });

  group('mobile', () {
    test('phones fit two columns at the default density', () {
      expect(cols(390, isMobile: true), 2);
      expect(cols(430, isMobile: true), 2);
    });

    test('large phones and small tablets use the room they have', () {
      // Previously pinned at 2 regardless of width, wasting most of the
      // viewport on anything wider than a phone.
      expect(cols(540, isMobile: true), 3);
      expect(cols(690, isMobile: true), 4);
    });

    test('never squeezes tiles below the touch-friendly minimum', () {
      for (final width in const [390.0, 540.0, 690.0]) {
        final count = cols(width, isMobile: true, preferred: 8);
        expect(width / count, greaterThanOrEqualTo(kPosMinTileWidthMobile));
      }
    });

    test('honours a lower cashier density as an upper bound', () {
      expect(cols(690, isMobile: true, preferred: 2), 2);
      expect(cols(690, isMobile: true, preferred: 1), 1);
    });
  });

  group('desktop and tablet', () {
    test('follow the cashier density when it fits', () {
      expect(cols(1600, isMobile: false, preferred: 4), 4);
      expect(cols(1600, isMobile: false, preferred: 6), 6);
    });

    test(
      'a high density no longer produces unreadable tiles on narrow windows',
      () {
        // 8 columns at 700px used to be honoured directly, drawing ~70px tiles.
        final count = cols(700, isMobile: false, preferred: 8);
        expect(count, lessThan(8));
        expect(700 / count, greaterThanOrEqualTo(kPosMinTileWidthDesktop));
      },
    );

    test('stays within the density control range at every width', () {
      for (var width = 360.0; width <= 2560.0; width += 20) {
        for (final preferred in const [1, 2, 4, 6, 8]) {
          final count = cols(width, isMobile: false, preferred: preferred);
          expect(count, inInclusiveRange(1, kPosMaxColumns));
          expect(count, lessThanOrEqualTo(preferred < 2 ? 2 : preferred));
          expect(width / count, greaterThanOrEqualTo(kPosMinTileWidthDesktop));
        }
      }
    });
  });
}
