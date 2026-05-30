class Product {
  final String id;
  final String title;
  final String slug;
  final String? miniDescription;
  final String? description;
  final double price;
  final int stock;
  final int lowStockThreshold;
  final bool isActive;
  final List<String> images;
  final List<ProductImage> productImages;
  final Category? category;
  final String? categoryId;
  final List<ProductOption> options;
  final List<ProductVariant> variants;

  Product({
    required this.id,
    required this.title,
    required this.slug,
    this.miniDescription,
    this.description,
    required this.price,
    required this.stock,
    this.lowStockThreshold = 5,
    required this.isActive,
    this.images = const [],
    this.productImages = const [],
    this.category,
    this.categoryId,
    this.options = const [],
    this.variants = const [],
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    final options =
        (json['options'] as List?)
            ?.map((e) => ProductOption.fromJson(e))
            .toList() ??
        [];

    final variants =
        (json['variants'] as List?)
            ?.map((e) => ProductVariant.fromJson(e))
            .toList() ??
        [];

    return Product(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? '',
      slug: json['slug'] ?? '',
      miniDescription: json['miniDescription'],
      description: json['description'],
      price: _parseCheckDouble(json['price']),
      stock: _parseCheckInt(json['stock']),
      lowStockThreshold: _parseCheckInt(json['lowStockThreshold']) > 0
          ? _parseCheckInt(json['lowStockThreshold'])
          : 5,
      isActive: json['isActive'] ?? false,
      images: (json['images'] as List?)?.map((e) => e as String).toList() ?? [],
      productImages:
          (json['productImages'] as List?)
              ?.map((e) => ProductImage.fromJson(e))
              .toList() ??
          [],
      category: json['category'] is Map
          ? Category.fromJson(json['category'])
          : null,
      categoryId:
          json['categoryId']?.toString() ??
          (json['category'] is Map
              ? json['category']['id']?.toString()
              : (json['category'] is String ? json['category'] : null)),
      options: options,
      variants: ProductVariant.resolveAllOptionReferences(
        variants: variants,
        options: options,
      ),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'slug': slug,
      'miniDescription': miniDescription,
      'description': description,
      'price': price,
      'stock': stock,
      'lowStockThreshold': lowStockThreshold,
      'isActive': isActive,
      'categoryId': categoryId,
      'images': images, // Simplified for creation
    };
  }

  String? get mainImageUrl {
    if (productImages.isNotEmpty) {
      final main = productImages.firstWhere(
        (img) => img.isMain,
        orElse: () => productImages.first,
      );
      return main.url;
    }
    if (images.isNotEmpty) {
      return images.first;
    }
    return null;
  }
}

class ProductImage {
  final String? id;
  final String url;
  final bool isMain;
  final int position;

  ProductImage({
    this.id,
    required this.url,
    required this.isMain,
    required this.position,
  });

  factory ProductImage.fromJson(Map<String, dynamic> json) {
    final resolvedUrl =
        json['url']?.toString() ??
        json['imageUrl']?.toString() ??
        json['src']?.toString() ??
        '';

    return ProductImage(
      id: json['id'],
      url: resolvedUrl,
      isMain: json['isMain'] ?? false,
      position: json['position'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {'id': id, 'url': url, 'isMain': isMain, 'position': position};
  }
}

class Category {
  final String id;
  final String title;
  final String slug;
  final String? imageUrl;
  final DateTime? createdAt;
  final int productCount;

  Category({
    required this.id,
    required this.title,
    required this.slug,
    this.imageUrl,
    this.createdAt,
    this.productCount = 0,
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? '',
      slug: json['slug'] ?? '',
      imageUrl: json['imageUrl'],
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString())
          : null,
      productCount: json['_count']?['products'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {'title': title, 'slug': slug, 'imageUrl': imageUrl};
  }
}

class ProductOption {
  final String id;
  final String name;
  final String displayType;
  final int position;
  final List<ProductOptionValue> values;

  ProductOption({
    required this.id,
    required this.name,
    required this.displayType,
    required this.position,
    this.values = const [],
  });

  factory ProductOption.fromJson(Map<String, dynamic> json) {
    return ProductOption(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      displayType: json['displayType'] ?? 'dropdown',
      position: json['position'] ?? 0,
      values:
          (json['values'] as List?)
              ?.map((e) => ProductOptionValue.fromJson(e))
              .toList() ??
          [],
    );
  }
}

class ProductOptionValue {
  final String id;
  final String label;
  final int position;
  final String? meta;

  ProductOptionValue({
    required this.id,
    required this.label,
    required this.position,
    this.meta,
  });

  factory ProductOptionValue.fromJson(Map<String, dynamic> json) {
    return ProductOptionValue(
      id: json['id'] ?? '',
      label: json['label'] ?? '',
      position: json['position'] ?? 0,
      meta: json['meta'],
    );
  }
}

class ProductVariant {
  final String id;
  final double price;
  final double? compareAtPrice;
  final double cost;
  final int stock;
  final String sku;
  final bool skuLocked;
  final String? barcode;
  final bool isActive;
  final bool trackInventory;
  final int safetyStock;
  final int reserved;
  final List<String> images;
  final List<ProductVariantOptionValue> optionValues;

  ProductVariant({
    required this.id,
    required this.price,
    this.compareAtPrice,
    required this.cost,
    required this.stock,
    required this.sku,
    required this.skuLocked,
    this.barcode,
    required this.isActive,
    required this.trackInventory,
    required this.safetyStock,
    required this.reserved,
    this.images = const [],
    this.optionValues = const [],
  });

  factory ProductVariant.fromJson(Map<String, dynamic> json) {
    return ProductVariant(
      id: json['id'] ?? '',
      price: _parseCheckDouble(json['price']),
      compareAtPrice: json['compareAtPrice'] != null
          ? _parseCheckDouble(json['compareAtPrice'])
          : null,
      cost: _parseCheckDouble(json['cost']),
      stock: _parseCheckInt(json['stock']),
      sku: json['sku']?.toString() ?? '',
      skuLocked: json['skuLocked'] ?? false,
      barcode: json['barcode']?.toString(),
      isActive: json['isActive'] ?? true,
      trackInventory: json['trackInventory'] ?? true,
      safetyStock: _parseCheckInt(json['safetyStock']),
      reserved: _parseCheckInt(json['reserved']),
      images:
          (json['images'] as List?)?.map((e) {
            if (e is String) return e;
            if (e is Map) {
              return (e['url'] ?? e['imageUrl'] ?? '').toString();
            }
            return '';
          }).toList() ??
          [], // Simple list of strings for now
      optionValues:
          (json['optionValues'] as List?)
              ?.map((e) => ProductVariantOptionValue.fromJson(e))
              .toList() ??
          [],
    );
  }

  String get title {
    if (optionValues.isEmpty) return 'Default';
    return optionValues.map((ov) => ov.optionValue?.label ?? '?').join(' / ');
  }

  static List<ProductVariant> resolveAllOptionReferences({
    required List<ProductVariant> variants,
    required List<ProductOption> options,
  }) {
    if (variants.isEmpty || options.isEmpty) return variants;

    final optionById = {for (final option in options) option.id: option};
    final valueByOptionAndValueId = <String, Map<String, ProductOptionValue>>{};
    for (final option in options) {
      valueByOptionAndValueId[option.id] = {
        for (final value in option.values) value.id: value,
      };
    }

    final optionPositionById = {
      for (final option in options) option.id: option.position,
    };

    return variants.map((variant) {
      if (variant.optionValues.isEmpty) return variant;

      final resolvedOptionValues = variant.optionValues.map((ov) {
        final resolvedOption = ov.option ?? optionById[ov.optionId];
        final resolvedValue =
            ov.optionValue ??
            valueByOptionAndValueId[ov.optionId]?[ov.optionValueId];

        if (resolvedOption == ov.option && resolvedValue == ov.optionValue) {
          return ov;
        }

        return ProductVariantOptionValue(
          optionId: ov.optionId,
          optionValueId: ov.optionValueId,
          option: resolvedOption,
          optionValue: resolvedValue,
        );
      }).toList();

      resolvedOptionValues.sort((a, b) {
        final aPos = optionPositionById[a.optionId] ?? 999999;
        final bPos = optionPositionById[b.optionId] ?? 999999;
        if (aPos != bPos) return aPos.compareTo(bPos);
        return a.optionId.compareTo(b.optionId);
      });

      return ProductVariant(
        id: variant.id,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        cost: variant.cost,
        stock: variant.stock,
        sku: variant.sku,
        skuLocked: variant.skuLocked,
        barcode: variant.barcode,
        isActive: variant.isActive,
        trackInventory: variant.trackInventory,
        safetyStock: variant.safetyStock,
        reserved: variant.reserved,
        images: variant.images,
        optionValues: resolvedOptionValues,
      );
    }).toList();
  }
}

class ProductVariantOptionValue {
  final String optionId;
  final String optionValueId;
  final ProductOption? option;
  final ProductOptionValue? optionValue;

  ProductVariantOptionValue({
    required this.optionId,
    required this.optionValueId,
    this.option,
    this.optionValue,
  });

  factory ProductVariantOptionValue.fromJson(Map<String, dynamic> json) {
    return ProductVariantOptionValue(
      optionId: json['optionId'] ?? '',
      optionValueId: json['optionValueId'] ?? '',
      option: json['option'] != null
          ? ProductOption.fromJson(json['option'])
          : null,
      optionValue: json['optionValue'] != null
          ? ProductOptionValue.fromJson(json['optionValue'])
          : null,
    );
  }
}

double _parseCheckDouble(dynamic value) {
  if (value == null) return 0.0;
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? 0.0;
  return 0.0;
}

int _parseCheckInt(dynamic value) {
  if (value == null) return 0;
  if (value is int) return value;
  if (value is String) return int.tryParse(value) ?? 0;
  return 0;
}
