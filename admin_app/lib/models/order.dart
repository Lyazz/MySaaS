class Order {
  final String id;
  final String customerName;
  final String customerPhone;
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

  Order({
    required this.id,
    required this.customerName,
    required this.customerPhone,
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
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id'] ?? '',
      customerName: json['customerName'] ?? '',
      customerPhone: json['customerPhone'] ?? '',
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
    );
  }
}

class OrderItem {
  final String id;
  final String productId;
  final int quantity;
  final double price;
  final String? productTitle;

  OrderItem({
    required this.id,
    required this.productId,
    required this.quantity,
    required this.price,
    this.productTitle,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      id: json['id'] ?? '',
      productId: json['productId'] ?? '',
      quantity: json['quantity'] ?? 0,
      price: double.tryParse(json['price']?.toString() ?? '0') ?? 0.0,
      productTitle: json['productTitle']?.toString(),
    );
  }
}
