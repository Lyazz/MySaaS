class StoreSettings {
  final String name;
  final String slug;
  final String currencyCode;
  final String currencyCountry;
  final bool isCompleted;
  final String? logoUrl;
  final String? faviconUrl;
  final String primaryColor;
  final bool useBrandColor;
  final String templateKey;
  final String announcementText;
  final bool announcementScrolling;
  final String language;
  final bool cartEnabled;
  final bool codEnabled;
  final String orderIdPrefix;
  final int minimumOrderAmountDzd;
  final bool hideOptionalAddress;
  final bool storePickupEnabled;
  final Map<String, dynamic> legalPages;

  const StoreSettings({
    required this.name,
    required this.slug,
    required this.currencyCode,
    required this.currencyCountry,
    required this.isCompleted,
    this.logoUrl,
    this.faviconUrl,
    this.primaryColor = '#4F46E5',
    this.useBrandColor = false,
    this.templateKey = 'modern',
    this.announcementText = '',
    this.announcementScrolling = false,
    this.language = 'fr',
    this.cartEnabled = true,
    this.codEnabled = true,
    this.orderIdPrefix = 'ORD',
    this.minimumOrderAmountDzd = 0,
    this.hideOptionalAddress = false,
    this.storePickupEnabled = false,
    this.legalPages = const {},
  });

  factory StoreSettings.fromJson(Map<String, dynamic> json) {
    final legalPages = json['legalPages'];
    return StoreSettings(
      name: json['name']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      currencyCode: json['currencyCode']?.toString() ?? 'DZD',
      currencyCountry: json['currencyCountry']?.toString() ?? 'DZ',
      isCompleted: json['isCompleted'] == true,
      logoUrl: json['logoUrl']?.toString(),
      faviconUrl: json['faviconUrl']?.toString(),
      primaryColor: json['primaryColor']?.toString() ?? '#4F46E5',
      useBrandColor: json['useBrandColor'] == true,
      templateKey: json['templateKey']?.toString() ?? 'modern',
      announcementText: json['announcementText']?.toString() ?? '',
      announcementScrolling: json['announcementScrolling'] == true,
      language: json['language']?.toString() ?? 'fr',
      cartEnabled: json['cartEnabled'] != false,
      codEnabled: json['codEnabled'] != false,
      orderIdPrefix: json['orderIdPrefix']?.toString() ?? 'ORD',
      minimumOrderAmountDzd:
          int.tryParse(json['minimumOrderAmountDzd']?.toString() ?? '0') ?? 0,
      hideOptionalAddress: json['hideOptionalAddress'] == true,
      storePickupEnabled: json['storePickupEnabled'] == true,
      legalPages: legalPages is Map
          ? Map<String, dynamic>.from(legalPages)
          : const {},
    );
  }

  StoreSettings copyWith({
    String? name,
    String? slug,
    String? currencyCode,
    String? currencyCountry,
    bool? isCompleted,
    String? logoUrl,
    String? faviconUrl,
    String? primaryColor,
    bool? useBrandColor,
    String? templateKey,
    String? announcementText,
    bool? announcementScrolling,
    String? language,
    bool? cartEnabled,
    bool? codEnabled,
    String? orderIdPrefix,
    int? minimumOrderAmountDzd,
    bool? hideOptionalAddress,
    bool? storePickupEnabled,
    Map<String, dynamic>? legalPages,
  }) {
    return StoreSettings(
      name: name ?? this.name,
      slug: slug ?? this.slug,
      currencyCode: currencyCode ?? this.currencyCode,
      currencyCountry: currencyCountry ?? this.currencyCountry,
      isCompleted: isCompleted ?? this.isCompleted,
      logoUrl: logoUrl ?? this.logoUrl,
      faviconUrl: faviconUrl ?? this.faviconUrl,
      primaryColor: primaryColor ?? this.primaryColor,
      useBrandColor: useBrandColor ?? this.useBrandColor,
      templateKey: templateKey ?? this.templateKey,
      announcementText: announcementText ?? this.announcementText,
      announcementScrolling:
          announcementScrolling ?? this.announcementScrolling,
      language: language ?? this.language,
      cartEnabled: cartEnabled ?? this.cartEnabled,
      codEnabled: codEnabled ?? this.codEnabled,
      orderIdPrefix: orderIdPrefix ?? this.orderIdPrefix,
      minimumOrderAmountDzd:
          minimumOrderAmountDzd ?? this.minimumOrderAmountDzd,
      hideOptionalAddress: hideOptionalAddress ?? this.hideOptionalAddress,
      storePickupEnabled: storePickupEnabled ?? this.storePickupEnabled,
      legalPages: legalPages ?? this.legalPages,
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'slug': slug,
    'currencyCode': currencyCode,
    'currencyCountry': currencyCountry,
    'logoUrl': logoUrl,
    'faviconUrl': faviconUrl,
    'primaryColor': primaryColor,
    'useBrandColor': useBrandColor,
    'templateKey': templateKey,
    'announcementText': announcementText,
    'announcementScrolling': announcementScrolling,
    'language': language,
    'cartEnabled': cartEnabled,
    'codEnabled': codEnabled,
    'orderIdPrefix': orderIdPrefix,
    'minimumOrderAmountDzd': minimumOrderAmountDzd,
    'hideOptionalAddress': hideOptionalAddress,
    'storePickupEnabled': storePickupEnabled,
    'legalPages': legalPages,
  };

  static const empty = StoreSettings(
    name: '',
    slug: '',
    currencyCode: 'DZD',
    currencyCountry: 'DZ',
    isCompleted: true,
  );
}
