class StoreSettings {
  final String name;
  final String slug;
  final String currencyCode;
  final String currencyCountry;
  final bool isCompleted;
  // Contact
  final String phone;
  final String email;
  final String address;
  final String facebookUrl;
  final String instagramUrl;
  final String tiktokUrl;
  // Functional
  final bool hideOptionalAddress;
  final bool enableWishlist;

  const StoreSettings({
    required this.name,
    required this.slug,
    required this.currencyCode,
    required this.currencyCountry,
    required this.isCompleted,
    this.phone = '',
    this.email = '',
    this.address = '',
    this.facebookUrl = '',
    this.instagramUrl = '',
    this.tiktokUrl = '',
    this.hideOptionalAddress = false,
    this.enableWishlist = false,
  });

  factory StoreSettings.fromJson(Map<String, dynamic> json) {
    return StoreSettings(
      name: json['name']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      currencyCode: json['currencyCode']?.toString() ?? 'DZD',
      currencyCountry: json['currencyCountry']?.toString() ?? 'DZ',
      isCompleted: json['isCompleted'] == true,
      phone: json['phone']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      address: json['address']?.toString() ?? '',
      facebookUrl: json['facebookUrl']?.toString() ?? '',
      instagramUrl: json['instagramUrl']?.toString() ?? '',
      tiktokUrl: json['tiktokUrl']?.toString() ?? '',
      hideOptionalAddress: json['hideOptionalAddress'] == true,
      enableWishlist: json['enableWishlist'] == true,
    );
  }

  StoreSettings copyWith({
    String? name,
    String? slug,
    String? currencyCode,
    String? currencyCountry,
    bool? isCompleted,
    String? phone,
    String? email,
    String? address,
    String? facebookUrl,
    String? instagramUrl,
    String? tiktokUrl,
    bool? hideOptionalAddress,
    bool? enableWishlist,
  }) {
    return StoreSettings(
      name: name ?? this.name,
      slug: slug ?? this.slug,
      currencyCode: currencyCode ?? this.currencyCode,
      currencyCountry: currencyCountry ?? this.currencyCountry,
      isCompleted: isCompleted ?? this.isCompleted,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      address: address ?? this.address,
      facebookUrl: facebookUrl ?? this.facebookUrl,
      instagramUrl: instagramUrl ?? this.instagramUrl,
      tiktokUrl: tiktokUrl ?? this.tiktokUrl,
      hideOptionalAddress: hideOptionalAddress ?? this.hideOptionalAddress,
      enableWishlist: enableWishlist ?? this.enableWishlist,
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'slug': slug,
        'currencyCode': currencyCode,
        'currencyCountry': currencyCountry,
        'phone': phone,
        'email': email,
        'address': address,
        'facebookUrl': facebookUrl,
        'instagramUrl': instagramUrl,
        'tiktokUrl': tiktokUrl,
        'hideOptionalAddress': hideOptionalAddress,
        'enableWishlist': enableWishlist,
      };

  static const empty = StoreSettings(
    name: '',
    slug: '',
    currencyCode: 'DZD',
    currencyCountry: 'DZ',
    isCompleted: true,
  );
}

