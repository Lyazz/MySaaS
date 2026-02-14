class PurchaseItem {
  final String id;
  final String productId;
  final String productName;
  final String? sku;
  final double quantityOrdered;
  final double quantityReceived;
  final double unitCost;

  PurchaseItem({
    required this.id,
    required this.productId,
    required this.productName,
    this.sku,
    required this.quantityOrdered,
    required this.quantityReceived,
    required this.unitCost,
  });

  double get total => quantityOrdered * unitCost;

  factory PurchaseItem.fromJson(Map<String, dynamic> json) {
    final variant = json['variant'];
    final product = variant?['product'];
    final options = variant?['optionValues'] as List?;

    String name = product?['title'] ?? 'Unknown Product';
    if (options != null && options.isNotEmpty) {
      final optionsStr = options
          .map((o) => o['optionValue']?['label'] ?? '?')
          .join(' / ');
      name += ' ($optionsStr)';
    }

    return PurchaseItem(
      id: json['id'] ?? '',
      productId:
          json['variantId'] ??
          '', // Using variantId as the key ID for the item link
      productName: name,
      sku: variant?['sku'],
      quantityOrdered:
          double.tryParse(json['quantityOrdered']?.toString() ?? '0') ?? 0.0,
      quantityReceived:
          double.tryParse(json['quantityReceived']?.toString() ?? '0') ?? 0.0,
      unitCost: double.tryParse(json['unitCost']?.toString() ?? '0') ?? 0.0,
    );
  }

  PurchaseItem copyWith({
    double? quantityOrdered,
    double? unitCost,
    double? quantityReceived,
  }) {
    return PurchaseItem(
      id: id,
      productId: productId,
      productName: productName,
      sku: sku,
      quantityOrdered: quantityOrdered ?? this.quantityOrdered,
      quantityReceived: quantityReceived ?? this.quantityReceived,
      unitCost: unitCost ?? this.unitCost,
    );
  }
}

class Purchase {
  final String id;
  final String supplierId;
  final String supplierName;
  final String? supplierEmail;
  final String? supplierPhone;
  final double totalAmount;
  final String status; // PENDING, COMPLETED, CANCELLED
  final DateTime createdAt;
  final String? notes;
  final List<PurchaseItem> items;

  Purchase({
    required this.id,
    required this.supplierId,
    required this.supplierName,
    this.supplierEmail,
    this.supplierPhone,
    required this.totalAmount,
    required this.status,
    required this.createdAt,
    this.notes,
    this.items = const [],
  });

  factory Purchase.fromJson(Map<String, dynamic> json) {
    var itemsList = <PurchaseItem>[];
    if (json['items'] != null) {
      itemsList = (json['items'] as List)
          .map((i) => PurchaseItem.fromJson(i))
          .toList();
    }

    return Purchase(
      id: json['id'] ?? '',
      supplierId: json['supplierId'] ?? json['supplier']?['id'] ?? '',
      supplierName:
          json['supplierName'] ?? json['supplier']?['name'] ?? 'Unknown',
      supplierEmail: json['supplierEmail'] ?? json['supplier']?['email'],
      supplierPhone: json['supplierPhone'] ?? json['supplier']?['phone'],
      totalAmount:
          double.tryParse(json['totalAmount']?.toString() ?? '0') ?? 0.0,
      status: json['status'] ?? 'PENDING',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
      notes: json['notes'],
      items: itemsList,
    );
  }

  Purchase copyWith({
    String? status,
    List<PurchaseItem>? items,
    double? totalAmount,
  }) {
    return Purchase(
      id: id,
      supplierId: supplierId,
      supplierName: supplierName,
      supplierEmail: supplierEmail,
      supplierPhone: supplierPhone,
      totalAmount: totalAmount ?? this.totalAmount,
      status: status ?? this.status,
      createdAt: createdAt,
      notes: notes,
      items: items ?? this.items,
    );
  }
}
