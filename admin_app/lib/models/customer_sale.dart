class CustomerSale {
  final String id;
  final String status;
  final double totalAmount;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  CustomerSale({
    required this.id,
    required this.status,
    required this.totalAmount,
    this.createdAt,
    this.updatedAt,
  });

  factory CustomerSale.fromJson(Map<String, dynamic> json) {
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

    return CustomerSale(
      id: json['id']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      totalAmount: parseDouble(json['totalAmount']),
      createdAt: parseDate(json['createdAt']),
      updatedAt: parseDate(json['updatedAt']),
    );
  }
}
