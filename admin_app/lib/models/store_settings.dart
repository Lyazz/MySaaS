class StoreSettings {
  final String name;
  final String slug;
  final String currencyCode;
  final String currencyCountry;
  final bool isCompleted;

  const StoreSettings({
    required this.name,
    required this.slug,
    required this.currencyCode,
    required this.currencyCountry,
    required this.isCompleted,
  });

  factory StoreSettings.fromJson(Map<String, dynamic> json) {
    return StoreSettings(
      name: json['name']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      currencyCode: json['currencyCode']?.toString() ?? 'DZD',
      currencyCountry: json['currencyCountry']?.toString() ?? 'DZ',
      isCompleted: json['isCompleted'] == true,
    );
  }

  static const empty = StoreSettings(
    name: '',
    slug: '',
    currencyCode: 'DZD',
    currencyCountry: 'DZ',
    isCompleted: true,
  );
}

