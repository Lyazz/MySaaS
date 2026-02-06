class Customer {
  final String id;
  final String name;
  final String phone;
  final String? address;
  final int ordersCount;
  final double totalSpent;
  final DateTime? lastOrderAt;

  Customer({
    required this.id,
    required this.name,
    required this.phone,
    this.address,
    required this.ordersCount,
    required this.totalSpent,
    this.lastOrderAt,
  });

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      address: json['address'],
      ordersCount: json['ordersCount'] ?? 0,
      totalSpent: (json['totalSpent'] ?? 0).toDouble(),
      lastOrderAt: json['lastOrderAt'] != null
          ? DateTime.parse(json['lastOrderAt'])
          : null,
    );
  }
}
