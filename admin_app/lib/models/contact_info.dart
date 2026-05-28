class ContactInfo {
  final String id;
  final String kind;
  final String? label;
  final String value;
  final int position;
  final bool isActive;
  final String? href;

  const ContactInfo({
    required this.id,
    required this.kind,
    this.label,
    required this.value,
    required this.position,
    required this.isActive,
    this.href,
  });

  factory ContactInfo.fromJson(Map<String, dynamic> json) {
    return ContactInfo(
      id: json['id']?.toString() ?? '',
      kind: json['kind']?.toString() ?? '',
      label: json['label']?.toString(),
      value: json['value']?.toString() ?? '',
      position: int.tryParse(json['position']?.toString() ?? '0') ?? 0,
      isActive: json['isActive'] != false,
      href: json['href']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'kind': kind,
    'label': label,
    'value': value,
    'position': position,
    'isActive': isActive,
    'href': href,
  };
}
