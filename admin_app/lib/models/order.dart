class Order {
  final String id;
  final String customerName;
  final String customerPhone;
  final String? customerPhoneNormalized;
  final String customerAddress;
  final String? customerId;
  final double totalAmount;
  final String status;
  final DateTime createdAt;
  final List<OrderItem> items;

  // Additional fields for detailed view
  final String? publicId;
  final String? internalNotes;
  final String callStatus;
  final double? shippingAmount;
  final double? totalWithShippingAmount;
  final String? shippingProvider;
  final String deliveryMode;
  final String? shippingPickupPoint;
  final String? shippingWilayaCode;
  final String? shippingCommuneCode;
  final List<Order> previousOrders;
  final PreviousOrdersMatch? previousOrdersMatch;

  Order({
    required this.id,
    required this.customerName,
    required this.customerPhone,
    this.customerPhoneNormalized,
    required this.customerAddress,
    this.customerId,
    required this.totalAmount,
    required this.status,
    required this.createdAt,
    this.items = const [],
    this.publicId,
    this.internalNotes,
    this.callStatus = '',
    this.shippingAmount,
    this.totalWithShippingAmount,
    this.shippingProvider,
    this.deliveryMode = '',
    this.shippingPickupPoint,
    this.shippingWilayaCode,
    this.shippingCommuneCode,
    this.previousOrders = const [],
    this.previousOrdersMatch,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id'] ?? '',
      customerName: json['customerName'] ?? '',
      customerPhone: json['customerPhone'] ?? '',
      customerPhoneNormalized: json['customerPhoneNormalized']?.toString(),
      customerAddress: json['customerAddress'] ?? '',
      customerId: json['customerId']?.toString(),
      totalAmount:
          double.tryParse(json['totalAmount']?.toString() ?? '0') ?? 0.0,
      status: json['status'] ?? 'PENDING',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
      items:
          (json['items'] as List?)
              ?.map((e) => OrderItem.fromJson(e))
              .toList() ??
          [],
      publicId: json['publicId']?.toString(),
      internalNotes: json['internalNotes']?.toString(),
      callStatus: json['callStatus']?.toString() ?? '',
      shippingAmount: json['shippingAmount'] != null
          ? double.tryParse(json['shippingAmount'].toString())
          : null,
      totalWithShippingAmount: json['totalWithShippingAmount'] != null
          ? double.tryParse(json['totalWithShippingAmount'].toString())
          : null,
      shippingProvider: json['shippingProvider']?.toString(),
      deliveryMode: json['deliveryMode']?.toString() ?? '',
      shippingPickupPoint: json['shippingPickupPoint']?.toString(),
      shippingWilayaCode: json['shippingWilayaCode']?.toString(),
      shippingCommuneCode: json['shippingCommuneCode']?.toString(),
      previousOrders:
          (json['previousOrders'] as List?)
              ?.whereType<Map>()
              .map((e) => Order.fromJson(e.cast<String, dynamic>()))
              .toList() ??
          const [],
      previousOrdersMatch: json['previousOrdersMatch'] is Map
          ? PreviousOrdersMatch.fromJson(
              (json['previousOrdersMatch'] as Map).cast<String, dynamic>(),
            )
          : null,
    );
  }
}

class PreviousOrdersMatch {
  final String type;
  final String? customerId;
  final String? phoneNormalized;

  const PreviousOrdersMatch({
    required this.type,
    this.customerId,
    this.phoneNormalized,
  });

  factory PreviousOrdersMatch.fromJson(Map<String, dynamic> json) {
    return PreviousOrdersMatch(
      type: json['type']?.toString() ?? 'none',
      customerId: json['customerId']?.toString(),
      phoneNormalized: json['phoneNormalized']?.toString(),
    );
  }
}

class OrderItem {
  final String id;
  final String productId;
  final int quantity;
  final double price;
  final double? lineTotal;
  final String? productTitle;
  final String? variantLabel;

  OrderItem({
    required this.id,
    required this.productId,
    required this.quantity,
    required this.price,
    this.lineTotal,
    this.productTitle,
    this.variantLabel,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    final product = json['product'];
    final variant = json['variant'];
    final optionValues = variant is Map ? variant['optionValues'] : null;
    final labels = optionValues is List
        ? optionValues
              .whereType<Map>()
              .map((entry) {
                final optionValue = entry['optionValue'];
                return optionValue is Map
                    ? optionValue['label']?.toString()
                    : null;
              })
              .whereType<String>()
              .where((label) => label.trim().isNotEmpty)
              .toList()
        : const <String>[];

    return OrderItem(
      id: json['id'] ?? '',
      productId: json['productId'] ?? '',
      quantity: json['quantity'] ?? 0,
      price: double.tryParse(json['price']?.toString() ?? '0') ?? 0.0,
      lineTotal: json['lineTotal'] != null
          ? double.tryParse(json['lineTotal'].toString())
          : null,
      productTitle:
          json['productTitle']?.toString() ??
          (product is Map ? product['title']?.toString() : null),
      variantLabel: labels.isEmpty ? null : labels.join(' / '),
    );
  }
}
