enum PosDiscountType { fixed, percent }

class PosDiscount {
  final PosDiscountType type;
  final double value;
  final String? reason;

  const PosDiscount({required this.type, required this.value, this.reason});

  double amountFor(double subtotal) {
    if (!subtotal.isFinite || subtotal <= 0) return 0;
    if (!value.isFinite || value <= 0) return 0;

    final raw = switch (type) {
      PosDiscountType.fixed => value,
      PosDiscountType.percent => subtotal * (value / 100),
    };

    if (raw <= 0) return 0;
    if (raw >= subtotal) return subtotal;
    return raw;
  }

  Map<String, dynamic> toJson(double subtotal) {
    return {
      'type': type.name,
      'value': value,
      'amount': amountFor(subtotal),
      if (reason != null && reason!.trim().isNotEmpty) 'reason': reason!.trim(),
    };
  }
}

class CartItem {
  final String productId;
  final String? variantId;
  final String name;
  final String? variantTitle;
  final double price;
  final int quantity;
  final String? imageUrl;

  CartItem({
    required this.productId,
    this.variantId,
    required this.name,
    this.variantTitle,
    required this.price,
    this.quantity = 1,
    this.imageUrl,
  });

  CartItem copyWith({
    String? productId,
    String? variantId,
    String? name,
    String? variantTitle,
    double? price,
    int? quantity,
    String? imageUrl,
  }) {
    return CartItem(
      productId: productId ?? this.productId,
      variantId: variantId ?? this.variantId,
      name: name ?? this.name,
      variantTitle: variantTitle ?? this.variantTitle,
      price: price ?? this.price,
      quantity: quantity ?? this.quantity,
      imageUrl: imageUrl ?? this.imageUrl,
    );
  }
}
