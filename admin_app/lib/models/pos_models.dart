class CartItem {
  final String productId;
  final String? variantId;
  final String name;
  final String? variantTitle;
  final double price;
  final int quantity;

  CartItem({
    required this.productId,
    this.variantId,
    required this.name,
    this.variantTitle,
    required this.price,
    this.quantity = 1,
  });

  CartItem copyWith({
    String? productId,
    String? variantId,
    String? name,
    String? variantTitle,
    double? price,
    int? quantity,
  }) {
    return CartItem(
      productId: productId ?? this.productId,
      variantId: variantId ?? this.variantId,
      name: name ?? this.name,
      variantTitle: variantTitle ?? this.variantTitle,
      price: price ?? this.price,
      quantity: quantity ?? this.quantity,
    );
  }
}
