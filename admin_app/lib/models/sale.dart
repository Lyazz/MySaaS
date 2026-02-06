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
    return Sale(
      id: json['id'] ?? '',
      customerName: json['customerName'] ?? '',
      customerPhone: json['customerPhone'] ?? '',
      totalAmount: (json['totalAmount'] ?? 0).toDouble(),
      status: json['status'] ?? 'COMPLETED',
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'])
          : DateTime.now(),
      type: json['type'] ?? 'ORDER',
    );
  }
}
