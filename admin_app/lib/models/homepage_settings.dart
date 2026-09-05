class HomepageSlide {
  final String imageUrl;
  final String title;
  final String subtitle;
  final String buttonText;
  final String buttonHref;

  const HomepageSlide({
    required this.imageUrl,
    required this.title,
    this.subtitle = '',
    this.buttonText = '',
    this.buttonHref = '',
  });

  factory HomepageSlide.fromJson(Map<String, dynamic> json) {
    return HomepageSlide(
      imageUrl: json['imageUrl']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      subtitle: json['subtitle']?.toString() ?? '',
      buttonText: json['buttonText']?.toString() ?? '',
      buttonHref: json['buttonHref']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'imageUrl': imageUrl,
    'title': title,
    'subtitle': subtitle,
    'buttonText': buttonText,
    'buttonHref': buttonHref,
  };
}

class HomepageSection {
  final bool enabled;
  final String eyebrow;
  final String title;
  final int? limit;

  const HomepageSection({
    required this.enabled,
    required this.eyebrow,
    required this.title,
    this.limit,
  });

  factory HomepageSection.fromJson(Map<String, dynamic> json) {
    return HomepageSection(
      enabled: json['enabled'] != false,
      eyebrow: json['eyebrow']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      limit: json['limit'] == null
          ? null
          : int.tryParse(json['limit']?.toString() ?? ''),
    );
  }

  Map<String, dynamic> toJson() => {
    'enabled': enabled,
    'eyebrow': eyebrow,
    'title': title,
    if (limit != null) 'limit': limit,
  };
}

class HomepageSettings {
  final List<HomepageSlide> carousel;
  final HomepageSection browseByCategory;
  final HomepageSection newArrivals;
  final HomepageSection bestSellers;

  const HomepageSettings({
    required this.carousel,
    required this.browseByCategory,
    required this.newArrivals,
    required this.bestSellers,
  });

  factory HomepageSettings.fromJson(Map<String, dynamic> json) {
    final sections = json['sections'] is Map
        ? Map<String, dynamic>.from(json['sections'] as Map)
        : const <String, dynamic>{};
    final carousel = json['carousel'] is List
        ? (json['carousel'] as List)
              .whereType<Map>()
              .map(
                (item) =>
                    HomepageSlide.fromJson(Map<String, dynamic>.from(item)),
              )
              .toList()
        : const <HomepageSlide>[];
    return HomepageSettings(
      carousel: carousel,
      browseByCategory: HomepageSection.fromJson(
        sections['browseByCategory'] is Map
            ? Map<String, dynamic>.from(sections['browseByCategory'] as Map)
            : const {},
      ),
      newArrivals: HomepageSection.fromJson(
        sections['newArrivals'] is Map
            ? Map<String, dynamic>.from(sections['newArrivals'] as Map)
            : const {},
      ),
      bestSellers: HomepageSection.fromJson(
        sections['bestSellers'] is Map
            ? Map<String, dynamic>.from(sections['bestSellers'] as Map)
            : const {},
      ),
    );
  }

  Map<String, dynamic> toJson() => {
    'carousel': carousel.map((item) => item.toJson()).toList(),
    'sections': {
      'browseByCategory': browseByCategory.toJson(),
      'newArrivals': newArrivals.toJson(),
      'bestSellers': bestSellers.toJson(),
    },
  };
}
