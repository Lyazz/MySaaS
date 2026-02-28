class Customer {
  final String id;
  final String name;
  final String phone;
  final String? email;
  final String? address;
  final double openingBalance;
  final int ordersCount;
  final double totalSpent;
  final double totalPaid;
  final double currentBalance;
  final DateTime? lastOrderAt;
  final String? lastOrderId;

  Customer({
    required this.id,
    required this.name,
    required this.phone,
    this.email,
    this.address,
    this.openingBalance = 0,
    required this.ordersCount,
    required this.totalSpent,
    this.totalPaid = 0,
    this.currentBalance = 0,
    this.lastOrderAt,
    this.lastOrderId,
  });

  factory Customer.fromJson(Map<String, dynamic> json) {
    double parseDouble(dynamic raw) {
      if (raw == null) return 0;
      if (raw is num) return raw.toDouble();
      return double.tryParse(raw.toString()) ?? 0;
    }

    return Customer(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      email: json['email']?.toString(),
      address: json['address'],
      openingBalance: parseDouble(json['openingBalance']),
      ordersCount: json['ordersCount'] ?? 0,
      totalSpent: parseDouble(json['totalSpent']),
      totalPaid: parseDouble(json['totalPaid']),
      currentBalance: parseDouble(json['currentBalance']),
      lastOrderAt: json['lastOrderAt'] != null
          ? DateTime.parse(json['lastOrderAt'])
          : null,
      lastOrderId: json['lastOrderId']?.toString(),
    );
  }
}
