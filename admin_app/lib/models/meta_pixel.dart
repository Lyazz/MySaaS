class MetaPixel {
  final String id;
  final String? name;
  final String pixelId;
  final bool isActive;
  final bool isGlobal;

  MetaPixel({
    required this.id,
    this.name,
    required this.pixelId,
    this.isActive = true,
    this.isGlobal = false,
  });

  factory MetaPixel.fromJson(Map<String, dynamic> json) {
    return MetaPixel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString(),
      pixelId: json['pixelId']?.toString() ?? '',
      isActive: json['isActive'] != false,
      isGlobal: json['isGlobal'] == true,
    );
  }
}
