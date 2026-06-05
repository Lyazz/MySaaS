class ProductBundleDeal {
  final String? id;
  final int bundleQty;
  final double bundlePrice;
  final String? tag;
  final bool isActive;
  final DateTime? startsAt;
  final DateTime? endsAt;

  ProductBundleDeal({
    this.id,
    required this.bundleQty,
    required this.bundlePrice,
    this.tag,
    this.isActive = true,
    this.startsAt,
    this.endsAt,
  });

  factory ProductBundleDeal.fromJson(Map<String, dynamic> json) {
    return ProductBundleDeal(
      id: json['id']?.toString(),
      bundleQty: json['bundleQty'] is int ? json['bundleQty'] : int.tryParse(json['bundleQty']?.toString() ?? '2') ?? 2,
      bundlePrice: json['bundlePrice'] is num ? (json['bundlePrice'] as num).toDouble() : double.tryParse(json['bundlePrice']?.toString() ?? '0') ?? 0.0,
      tag: json['tag']?.toString(),
      isActive: json['isActive'] != false,
      startsAt: json['startsAt'] != null ? DateTime.tryParse(json['startsAt'].toString()) : null,
      endsAt: json['endsAt'] != null ? DateTime.tryParse(json['endsAt'].toString()) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'bundleQty': bundleQty,
      'bundlePrice': bundlePrice,
      'tag': tag,
      'isActive': isActive,
      'startsAt': startsAt?.toIso8601String(),
      'endsAt': endsAt?.toIso8601String(),
    };
  }

  ProductBundleDeal copyWith({
    String? id,
    int? bundleQty,
    double? bundlePrice,
    String? tag,
    bool? isActive,
    DateTime? startsAt,
    DateTime? endsAt,
  }) {
    return ProductBundleDeal(
      id: id ?? this.id,
      bundleQty: bundleQty ?? this.bundleQty,
      bundlePrice: bundlePrice ?? this.bundlePrice,
      tag: tag ?? this.tag,
      isActive: isActive ?? this.isActive,
      startsAt: startsAt ?? this.startsAt,
      endsAt: endsAt ?? this.endsAt,
    );
  }
}
