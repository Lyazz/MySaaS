class Integration {
  final String provider;
  final bool isActive;
  final Map<String, dynamic> config;

  const Integration({
    required this.provider,
    required this.isActive,
    required this.config,
  });

  factory Integration.fromJson(String provider, Map<String, dynamic> json) {
    return Integration(
      provider: provider,
      isActive: json['isActive'] == true,
      config: json['config'] is Map
          ? Map<String, dynamic>.from(json['config'] as Map)
          : {},
    );
  }

  static Integration empty(String provider) =>
      Integration(provider: provider, isActive: false, config: {});
}
