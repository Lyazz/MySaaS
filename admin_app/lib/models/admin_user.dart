class AdminUser {
  final String id;
  final String email;
  final String role; // owner | admin | staff
  final bool isActive;
  final String? cashboxId;
  final String? staffRoleId;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  AdminUser({
    required this.id,
    required this.email,
    required this.role,
    required this.isActive,
    this.cashboxId,
    this.staffRoleId,
    this.createdAt,
    this.updatedAt,
  });

  factory AdminUser.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic raw) {
      final value = raw?.toString();
      if (value == null || value.isEmpty) return null;
      return DateTime.tryParse(value);
    }

    return AdminUser(
      id: json['id']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      role: json['role']?.toString() ?? 'staff',
      isActive: json['isActive'] == true,
      cashboxId: json['cashboxId']?.toString(),
      staffRoleId: json['staffRoleId']?.toString(),
      createdAt: parseDate(json['createdAt']),
      updatedAt: parseDate(json['updatedAt']),
    );
  }
}
