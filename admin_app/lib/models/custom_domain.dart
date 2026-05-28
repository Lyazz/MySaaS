class CustomDomain {
  final String id;
  final String domain;
  final String cnameTarget;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const CustomDomain({
    required this.id,
    required this.domain,
    required this.cnameTarget,
    this.createdAt,
    this.updatedAt,
  });

  factory CustomDomain.fromJson(Map<String, dynamic> json) {
    return CustomDomain(
      id: json['id']?.toString() ?? '',
      domain: json['domain']?.toString() ?? '',
      cnameTarget: json['cnameTarget']?.toString() ?? '',
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? ''),
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? ''),
    );
  }
}
