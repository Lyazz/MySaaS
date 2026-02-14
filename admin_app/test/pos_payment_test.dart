import 'package:flutter_test/flutter_test.dart';

import 'package:admin_app/utils/pos_payment.dart';

void main() {
  test('split payment settles when cash covers remaining', () {
    const b = PosPaymentBreakdown(total: 100, cardAmount: 30, cashReceived: 70);
    expect(b.isValid, true);
    expect(b.isSettled, true);
    expect(b.cashDue, 70);
    expect(b.cashApplied, 70);
    expect(b.change, 0);
    expect(b.remaining, 0);
  });

  test('split payment is not settled when cash is short', () {
    const b = PosPaymentBreakdown(total: 100, cardAmount: 30, cashReceived: 60);
    expect(b.isValid, true);
    expect(b.isSettled, false);
    expect(b.remaining, 10);
  });

  test('cash overpayment computes change', () {
    const b = PosPaymentBreakdown(total: 100, cardAmount: 20, cashReceived: 90);
    expect(b.isSettled, true);
    expect(b.cashDue, 80);
    expect(b.cashApplied, 80);
    expect(b.change, 10);
  });

  test('card-only payment can settle the total', () {
    const b = PosPaymentBreakdown(total: 100, cardAmount: 100, cashReceived: 0);
    expect(b.isSettled, true);
    expect(b.cashDue, 0);
    expect(b.change, 0);
  });

  test('invalid card amount is rejected', () {
    const b = PosPaymentBreakdown(total: 100, cardAmount: 101, cashReceived: 0);
    expect(b.isValid, false);
    expect(b.isSettled, false);
  });

  test('payment lines include applied cash and change', () {
    const b = PosPaymentBreakdown(total: 100, cardAmount: 20, cashReceived: 90);
    final lines = b.lines;
    expect(lines.length, 2);
    expect(lines[0].method, PosPaymentMethod.card);
    expect(lines[0].amount, 20);
    expect(lines[1].method, PosPaymentMethod.cash);
    expect(lines[1].amount, 80);
    expect(lines[1].received, 90);
    expect(lines[1].change, 10);
  });
}

