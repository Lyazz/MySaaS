enum PosPaymentMethod { cash, card }

class PosPaymentLine {
  final PosPaymentMethod method;
  final double amount;
  final double? received;
  final double? change;

  const PosPaymentLine({
    required this.method,
    required this.amount,
    this.received,
    this.change,
  });

  Map<String, dynamic> toJson() {
    return {
      'method': method.name,
      'amount': amount,
      if (received != null) 'received': received,
      if (change != null) 'change': change,
    };
  }
}

class PosPaymentBreakdown {
  static const double epsilon = 1e-6;

  final double total;
  final double cardAmount;
  final double cashReceived;

  const PosPaymentBreakdown({
    required this.total,
    required this.cardAmount,
    required this.cashReceived,
  });

  double get cashDue {
    final due = total - cardAmount;
    return due < 0 ? 0 : due;
  }

  double get cashApplied {
    final due = cashDue;
    return cashReceived < due ? cashReceived : due;
  }

  double get change {
    final over = cashReceived - cashDue;
    return over > 0 ? over : 0;
  }

  double get paidApplied => cardAmount + cashApplied;

  double get remaining {
    final rest = total - paidApplied;
    return rest > 0 ? rest : 0;
  }

  bool get isValid {
    if (!total.isFinite || total < 0) return false;
    if (!cardAmount.isFinite || cardAmount < 0) return false;
    if (!cashReceived.isFinite || cashReceived < 0) return false;
    if (cardAmount - total > epsilon) return false;
    return true;
  }

  bool get isSettled => isValid && remaining <= epsilon;

  List<PosPaymentLine> get lines {
    final items = <PosPaymentLine>[];
    if (cardAmount > 0) {
      items.add(
        PosPaymentLine(method: PosPaymentMethod.card, amount: cardAmount),
      );
    }
    if (cashApplied > 0 || cashReceived > 0) {
      items.add(
        PosPaymentLine(
          method: PosPaymentMethod.cash,
          amount: cashApplied,
          received: cashReceived,
          change: change,
        ),
      );
    }
    return items;
  }
}

class PosPaymentRequest {
  final double cardAmount;
  final double cashReceived;

  const PosPaymentRequest({
    required this.cardAmount,
    required this.cashReceived,
  });

  factory PosPaymentRequest.fastCash(double total) {
    return PosPaymentRequest(cardAmount: 0, cashReceived: total);
  }

  PosPaymentBreakdown breakdown(double total) {
    return PosPaymentBreakdown(
      total: total,
      cardAmount: cardAmount,
      cashReceived: cashReceived,
    );
  }
}
