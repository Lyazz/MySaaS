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

  /// True when the sale is settled with both card and cash.
  bool get isSplit => cardAmount > epsilon && cashApplied > epsilon;

  /// The single method to record against the sale's cash-ledger entry.
  ///
  /// The backend stores one method per transaction (`CASH | CARD | TRANSFER |
  /// OTHER`), so a split sale cannot be represented faithfully. The larger
  /// share wins as the least-wrong summary, and [ledgerNote] carries the full
  /// breakdown so the detail is not lost.
  String get ledgerMethod {
    if (cardAmount <= epsilon) return 'CASH';
    if (cashApplied <= epsilon) return 'CARD';
    return cardAmount >= cashApplied ? 'CARD' : 'CASH';
  }

  /// Human-readable note for the ledger entry; spells out a split so the
  /// single [ledgerMethod] above is not mistaken for the whole story.
  String get ledgerNote {
    if (!isSplit) return 'POS sale payment';
    return 'POS split payment: card ${cardAmount.toStringAsFixed(2)} '
        '+ cash ${cashApplied.toStringAsFixed(2)}';
  }

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
