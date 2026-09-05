import 'package:admin_app/models/cash.dart';
import 'package:admin_app/utils/pos_cashbox.dart';
import 'package:admin_app/utils/pos_payment.dart';
import 'package:flutter_test/flutter_test.dart';

CashboxSummary _cashbox(String id, {bool open = false}) => CashboxSummary(
  id: id,
  name: 'Till $id',
  isActive: true,
  openSession: open
      ? CashOpenSession(id: 'session-$id', openingFloat: 0)
      : null,
);

void main() {
  group('cashbox attribution', () {
    test('uses the only cashbox with an open session', () {
      final resolved = resolvePosCashboxId([
        _cashbox('a', open: true),
        _cashbox('b'),
      ]);
      expect(resolved, 'a');
    });

    test('stays unattributed when no session is open', () {
      expect(resolvePosCashboxId([_cashbox('a'), _cashbox('b')]), isNull);
      expect(resolvePosCashboxId(const []), isNull);
    });

    test('refuses to guess between two open tills', () {
      // Booking a sale into the wrong drawer is worse than leaving it
      // unattributed, which is the pre-existing behaviour.
      final resolved = resolvePosCashboxId([
        _cashbox('a', open: true),
        _cashbox('b', open: true),
      ]);
      expect(resolved, isNull);
    });

    test('an explicit preference breaks the ambiguous case', () {
      final resolved = resolvePosCashboxId([
        _cashbox('a', open: true),
        _cashbox('b', open: true),
      ], preferredCashboxId: 'b');
      expect(resolved, 'b');
    });

    test('a preference for a closed till is ignored', () {
      final resolved = resolvePosCashboxId([
        _cashbox('a', open: true),
        _cashbox('b'),
      ], preferredCashboxId: 'b');
      expect(resolved, 'a');
    });
  });

  group('ledger method', () {
    PosPaymentBreakdown b({required double card, required double cash}) =>
        PosPaymentBreakdown(total: 1000, cardAmount: card, cashReceived: cash);

    test('cash-only settles as CASH', () {
      final breakdown = b(card: 0, cash: 1000);
      expect(breakdown.isSettled, isTrue);
      expect(breakdown.ledgerMethod, 'CASH');
      expect(breakdown.isSplit, isFalse);
    });

    test('card-only settles as CARD rather than defaulting to cash', () {
      // The backend defaults an absent method to CASH, which is what recorded
      // every card sale as a cash movement.
      final breakdown = b(card: 1000, cash: 0);
      expect(breakdown.isSettled, isTrue);
      expect(breakdown.ledgerMethod, 'CARD');
    });

    test('overpaid cash still reports CASH and returns change', () {
      final breakdown = b(card: 0, cash: 1200);
      expect(breakdown.change, 200);
      expect(breakdown.ledgerMethod, 'CASH');
    });

    test('a split reports its larger share and spells out the breakdown', () {
      final cardHeavy = b(card: 700, cash: 300);
      expect(cardHeavy.isSplit, isTrue);
      expect(cardHeavy.ledgerMethod, 'CARD');
      expect(cardHeavy.ledgerNote, contains('split'));
      expect(cardHeavy.ledgerNote, contains('700.00'));
      expect(cardHeavy.ledgerNote, contains('300.00'));

      final cashHeavy = b(card: 300, cash: 700);
      expect(cashHeavy.isSplit, isTrue);
      expect(cashHeavy.ledgerMethod, 'CASH');
    });

    test('non-split payments carry the plain note', () {
      expect(b(card: 0, cash: 1000).ledgerNote, 'POS sale payment');
    });

    test('reported method is always a value the ledger accepts', () {
      const accepted = {'CASH', 'CARD', 'TRANSFER', 'OTHER'};
      for (final card in const [0.0, 1.0, 499.5, 1000.0]) {
        final breakdown = b(card: card, cash: 1000 - card);
        expect(accepted, contains(breakdown.ledgerMethod));
      }
    });
  });
}
