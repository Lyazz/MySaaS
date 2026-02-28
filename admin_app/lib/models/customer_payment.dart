class CustomerPayment {
  final String id;
  final double amount;
  final String currency;
  final String method;
  final String? reference;
  final String? note;
  final String? saleId;
  final DateTime? createdAt;

  CustomerPayment({
    required this.id,
    required this.amount,
    required this.currency,
    required this.method,
    this.reference,
    this.note,
    this.saleId,
    this.createdAt,
  });

  factory CustomerPayment.fromJson(Map<String, dynamic> json) {
    double parseDouble(dynamic raw) {
      if (raw == null) return 0;
      if (raw is num) return raw.toDouble();
      return double.tryParse(raw.toString()) ?? 0;
    }

    DateTime? parseDate(dynamic raw) {
      final value = raw?.toString();
      if (value == null || value.isEmpty) return null;
      return DateTime.tryParse(value);
    }

    return CustomerPayment(
      id: json['id']?.toString() ?? '',
      amount: parseDouble(json['amount']),
      currency: json['currency']?.toString() ?? 'DZD',
      method: json['method']?.toString() ?? 'CASH',
      reference: json['reference']?.toString(),
      note: json['note']?.toString(),
      saleId: json['saleId']?.toString(),
      createdAt: parseDate(json['createdAt']),
    );
  }
}
