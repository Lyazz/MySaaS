class StaffRolePermissionGroup {
  final String resource;
  final List<String> actions;

  StaffRolePermissionGroup({required this.resource, required this.actions});

  factory StaffRolePermissionGroup.fromJson(Map<String, dynamic> json) {
    final actionsRaw = json['actions'];
    final actions = (actionsRaw is List)
        ? actionsRaw.map((e) => e.toString()).toList()
        : <String>[];
    return StaffRolePermissionGroup(
      resource: json['resource']?.toString() ?? '',
      actions: actions,
    );
  }

  Map<String, dynamic> toJson() => {'resource': resource, 'actions': actions};
}

class StaffRole {
  static const resources = <String>[
    'dashboard',
    'products',
    'categories',
    'variants',
    'inventory',
    'orders',
    'sales',
    'purchases',
    'suppliers',
    'customers',
    'delivery',
    'cash',
    'billing',
    'storeSettings',
    'homepageSettings',
    'contactInfos',
    'integrations',
    'metaPixels',
    'pos',
  ];

  static const actions = <String>['read', 'create', 'update', 'delete'];

  final String id;
  final String name;
  final List<StaffRolePermissionGroup> permissions;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  StaffRole({
    required this.id,
    required this.name,
    required this.permissions,
    this.createdAt,
    this.updatedAt,
  });

  factory StaffRole.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic raw) {
      final value = raw?.toString();
      if (value == null || value.isEmpty) return null;
      return DateTime.tryParse(value);
    }

    final permsRaw = json['permissions'];
    final perms = (permsRaw is List)
        ? permsRaw
              .whereType<Map>()
              .map(
                (e) => StaffRolePermissionGroup.fromJson(
                  e.map((k, v) => MapEntry(k.toString(), v)),
                ),
              )
              .toList()
        : <StaffRolePermissionGroup>[];

    return StaffRole(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      permissions: perms,
      createdAt: parseDate(json['createdAt']),
      updatedAt: parseDate(json['updatedAt']),
    );
  }
}
