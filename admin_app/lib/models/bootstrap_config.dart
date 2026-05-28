import 'package:flutter/foundation.dart';

import 'app_mode.dart';

class BootstrapConfig {
  final String apiBaseUrl;
  final AppMode mode;
  final String tenantId;
  final String? workspaceId;
  final String? authToken;
  final Map<String, dynamic>? userJson;
  final Map<String, dynamic>? staffRoleJson;
  final List<String> staffPermissions;
  final bool provisioningLocked;

  const BootstrapConfig({
    required this.apiBaseUrl,
    this.mode = AppMode.online,
    this.tenantId = '',
    this.workspaceId,
    this.authToken,
    this.userJson,
    this.staffRoleJson,
    this.staffPermissions = const [],
    this.provisioningLocked = true,
  });

  BootstrapConfig copyWith({
    String? apiBaseUrl,
    AppMode? mode,
    String? tenantId,
    String? workspaceId,
    String? authToken,
    Map<String, dynamic>? userJson,
    Map<String, dynamic>? staffRoleJson,
    List<String>? staffPermissions,
    bool? provisioningLocked,
    bool clearWorkspaceId = false,
    bool clearAuthToken = false,
    bool clearUserJson = false,
    bool clearStaffRoleJson = false,
    bool clearStaffPermissions = false,
  }) {
    return BootstrapConfig(
      apiBaseUrl: apiBaseUrl ?? this.apiBaseUrl,
      mode: mode ?? this.mode,
      tenantId: tenantId ?? this.tenantId,
      workspaceId: clearWorkspaceId ? null : (workspaceId ?? this.workspaceId),
      authToken: clearAuthToken ? null : (authToken ?? this.authToken),
      userJson: clearUserJson ? null : (userJson ?? this.userJson),
      staffRoleJson: clearStaffRoleJson
          ? null
          : (staffRoleJson ?? this.staffRoleJson),
      staffPermissions: clearStaffPermissions
          ? const []
          : (staffPermissions ?? this.staffPermissions),
      provisioningLocked: provisioningLocked ?? this.provisioningLocked,
    );
  }

  bool get isProvisioned =>
      tenantId.trim().isNotEmpty || (authToken?.trim().isNotEmpty == true);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is BootstrapConfig &&
        other.apiBaseUrl == apiBaseUrl &&
        other.mode == mode &&
        other.tenantId == tenantId &&
        other.workspaceId == workspaceId &&
        other.authToken == authToken &&
        mapEquals(other.userJson, userJson) &&
        mapEquals(other.staffRoleJson, staffRoleJson) &&
        listEquals(other.staffPermissions, staffPermissions) &&
        other.provisioningLocked == provisioningLocked;
  }

  @override
  int get hashCode => Object.hash(
    apiBaseUrl,
    mode,
    tenantId,
    workspaceId,
    authToken,
    _mapHash(userJson),
    _mapHash(staffRoleJson),
    Object.hashAll(staffPermissions),
    provisioningLocked,
  );

  static int? _mapHash(Map<String, dynamic>? value) {
    if (value == null) return null;
    return Object.hashAllUnordered(
      value.entries.map((entry) => Object.hash(entry.key, entry.value)),
    );
  }
}
