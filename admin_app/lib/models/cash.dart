class CashboxSummary {
  final String id;
  final String name;
  final bool isActive;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final CashOpenSession? openSession;

  CashboxSummary({
    required this.id,
    required this.name,
    required this.isActive,
    this.createdAt,
    this.updatedAt,
    this.openSession,
  });

  factory CashboxSummary.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic raw) {
      final value = raw?.toString();
      if (value == null || value.isEmpty) return null;
      return DateTime.tryParse(value);
    }

    final open = json['openSession'];
    return CashboxSummary(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      isActive: json['isActive'] == true,
      createdAt: parseDate(json['createdAt']),
      updatedAt: parseDate(json['updatedAt']),
      openSession: open is Map
          ? CashOpenSession.fromJson(open.cast<String, dynamic>())
          : null,
    );
  }
}

class CashOpenSession {
  final String id;
  final DateTime? openedAt;
  final double openingFloat;

  CashOpenSession({
    required this.id,
    this.openedAt,
    required this.openingFloat,
  });

  factory CashOpenSession.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic raw) {
      final value = raw?.toString();
      if (value == null || value.isEmpty) return null;
      return DateTime.tryParse(value);
    }

    return CashOpenSession(
      id: json['id']?.toString() ?? '',
      openedAt: parseDate(json['openedAt']),
      openingFloat: _parseDouble(json['openingFloat']),
    );
  }
}

class CashSessionSummary {
  final String id;
  final String cashboxId;
  final String status; // OPEN|CLOSED
  final double openingFloat;
  final DateTime? openedAt;
  final DateTime? closedAt;
  final double? closingCount;
  final double? expectedClosing;
  final double? difference;
  final String? note;
  final String? openedByUserId;
  final String? closedByUserId;

  CashSessionSummary({
    required this.id,
    required this.cashboxId,
    required this.status,
    required this.openingFloat,
    this.openedAt,
    this.closedAt,
    this.closingCount,
    this.expectedClosing,
    this.difference,
    this.note,
    this.openedByUserId,
    this.closedByUserId,
  });

  factory CashSessionSummary.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic raw) {
      final value = raw?.toString();
      if (value == null || value.isEmpty) return null;
      return DateTime.tryParse(value);
    }

    return CashSessionSummary(
      id: json['id']?.toString() ?? '',
      cashboxId: json['cashboxId']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      openingFloat: _parseDouble(json['openingFloat']),
      openedAt: parseDate(json['openedAt']),
      closedAt: parseDate(json['closedAt']),
      closingCount: json['closingCount'] == null
          ? null
          : _parseDouble(json['closingCount']),
      expectedClosing: json['expectedClosing'] == null
          ? null
          : _parseDouble(json['expectedClosing']),
      difference: json['difference'] == null
          ? null
          : _parseDouble(json['difference']),
      note: json['note']?.toString(),
      openedByUserId: json['openedByUserId']?.toString(),
      closedByUserId: json['closedByUserId']?.toString(),
    );
  }
}

class CashSessionExpectedClosing {
  final String sessionId;
  final double openingFloat;
  final double inSum;
  final double outSum;
  final double expectedClosing;
  final Map<String, double> expectedByMethod;

  CashSessionExpectedClosing({
    required this.sessionId,
    required this.openingFloat,
    required this.inSum,
    required this.outSum,
    required this.expectedClosing,
    required this.expectedByMethod,
  });

  factory CashSessionExpectedClosing.fromJson(Map<String, dynamic> json) {
    Map<String, double> parseByMethod(dynamic raw) {
      if (raw is! Map) return const {};
      final map = <String, double>{};
      for (final entry in raw.entries) {
        map[entry.key.toString()] = _parseDouble(entry.value);
      }
      return map;
    }

    return CashSessionExpectedClosing(
      sessionId: json['sessionId']?.toString() ?? '',
      openingFloat: _parseDouble(json['openingFloat']),
      inSum: _parseDouble(json['inSum']),
      outSum: _parseDouble(json['outSum']),
      expectedClosing: _parseDouble(json['expectedClosing']),
      expectedByMethod: parseByMethod(json['expectedByMethod']),
    );
  }
}

class CashTransactionSummary {
  final String id;
  final String cashboxId;
  final String sessionId;
  final String direction; // IN|OUT
  final String type;
  final double amount;
  final String currency;
  final String method;
  final String? customerId;
  final String? supplierId;
  final String? saleId;
  final String? orderId;
  final String? purchaseOrderId;
  final String? expenseCategory;
  final String? transferGroupId;
  final String? reference;
  final String? note;
  final String? createdByUserId;
  final DateTime? createdAt;

  CashTransactionSummary({
    required this.id,
    required this.cashboxId,
    required this.sessionId,
    required this.direction,
    required this.type,
    required this.amount,
    required this.currency,
    required this.method,
    this.customerId,
    this.supplierId,
    this.saleId,
    this.orderId,
    this.purchaseOrderId,
    this.expenseCategory,
    this.transferGroupId,
    this.reference,
    this.note,
    this.createdByUserId,
    this.createdAt,
  });

  factory CashTransactionSummary.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic raw) {
      final value = raw?.toString();
      if (value == null || value.isEmpty) return null;
      return DateTime.tryParse(value);
    }

    return CashTransactionSummary(
      id: json['id']?.toString() ?? '',
      cashboxId: json['cashboxId']?.toString() ?? '',
      sessionId: json['sessionId']?.toString() ?? '',
      direction: json['direction']?.toString() ?? '',
      type: json['type']?.toString() ?? '',
      amount: _parseDouble(json['amount']),
      currency: json['currency']?.toString() ?? 'DZD',
      method: json['method']?.toString() ?? 'CASH',
      customerId: json['customerId']?.toString(),
      supplierId: json['supplierId']?.toString(),
      saleId: json['saleId']?.toString(),
      orderId: json['orderId']?.toString(),
      purchaseOrderId: json['purchaseOrderId']?.toString(),
      expenseCategory: json['expenseCategory']?.toString(),
      transferGroupId: json['transferGroupId']?.toString(),
      reference: json['reference']?.toString(),
      note: json['note']?.toString(),
      createdByUserId: json['createdByUserId']?.toString(),
      createdAt: parseDate(json['createdAt']),
    );
  }
}

class CashUserSummary {
  final String id;
  final String email;
  final String role;
  final bool isActive;

  CashUserSummary({
    required this.id,
    required this.email,
    required this.role,
    required this.isActive,
  });

  factory CashUserSummary.fromJson(Map<String, dynamic> json) {
    return CashUserSummary(
      id: json['id']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      role: json['role']?.toString() ?? '',
      isActive: json['isActive'] == true,
    );
  }
}

double _parseDouble(dynamic raw) {
  if (raw == null) return 0;
  if (raw is num) return raw.toDouble();
  return double.tryParse(raw.toString()) ?? 0;
}
