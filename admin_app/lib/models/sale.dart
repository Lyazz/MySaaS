class Sale {
  final String id;
  final String customerName;
  final String customerPhone;
  final double totalAmount;
  final String status;
  final DateTime updatedAt;
  final String type; // 'ORDER' or 'POS'

  Sale({
    required this.id,
    required this.customerName,
    required this.customerPhone,
    required this.totalAmount,
    required this.status,
    required this.updatedAt,
    this.type = 'ORDER',
  });

  factory Sale.fromJson(Map<String, dynamic> json) {
    double parseDouble(dynamic raw) {
      if (raw == null) return 0;
      if (raw is num) return raw.toDouble();
      return double.tryParse(raw.toString()) ?? 0;
    }

    return Sale(
      id: json['id'] ?? '',
      customerName: json['customerName'] ?? '',
      customerPhone: json['customerPhone'] ?? '',
      totalAmount: parseDouble(json['totalAmount']),
      status: json['status'] ?? 'COMPLETED',
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'])
          : DateTime.now(),
      type: json['type'] ?? 'ORDER',
    );
  }
}
