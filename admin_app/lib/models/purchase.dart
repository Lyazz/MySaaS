class Purchase {
  final String id;
  final String supplierId;
  final String supplierName;
  final double totalAmount;
  final String status; // PENDING, COMPLETED, CANCELLED
  final DateTime createdAt;
  final String? notes;

  Purchase({
    required this.id,
    required this.supplierId,
    required this.supplierName,
    required this.totalAmount,
    required this.status,
    required this.createdAt,
    this.notes,
  });

  factory Purchase.fromJson(Map<String, dynamic> json) {
    return Purchase(
      id: json['id'] ?? '',
      supplierId: json['supplierId'] ?? '',
      supplierName: json['supplierName'] ?? '',
      totalAmount: (json['totalAmount'] ?? 0).toDouble(),
      status: json['status'] ?? 'PENDING',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
      notes: json['notes'],
    );
  }
}
