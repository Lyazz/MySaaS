import 'dart:convert';

import '../app_config.dart';
import 'app_mode.dart';
import 'bootstrap_config.dart';

class ProvisioningPayload {
  final String apiBaseUrl;
  final AppMode mode;
  final String tenantId;
  final String? workspaceId;
  final String? authToken;
  final Map<String, dynamic>? userJson;
  final Map<String, dynamic>? staffRoleJson;
  final List<String> staffPermissions;

  const ProvisioningPayload({
    required this.apiBaseUrl,
    required this.mode,
    required this.tenantId,
    this.workspaceId,
    this.authToken,
    this.userJson,
    this.staffRoleJson,
    this.staffPermissions = const [],
  });

  factory ProvisioningPayload.fromEncoded(String raw) {
    final decoded = jsonDecode(raw.trim());
    if (decoded is! Map) {
      throw const FormatException(
        'Provisioning payload must be a JSON object.',
      );
    }

    return ProvisioningPayload.fromJson(Map<String, dynamic>.from(decoded));
  }

  factory ProvisioningPayload.fromJson(Map<String, dynamic> json) {
    final tenantId = (json['tenantId'] ?? '').toString().trim();
    final workspaceId = (json['workspaceId'] ?? '').toString().trim();
    final authToken = (json['authToken'] ?? '').toString().trim();
    final mode = _parseMode(json);

    if (tenantId.isEmpty) {
      throw const FormatException('Provisioning payload is missing tenantId.');
    }

    final userRaw = json['user'];
    final staffRoleRaw = json['staffRole'];
    final permissionsRaw = json['staffPermissions'];

    return ProvisioningPayload(
      apiBaseUrl: defaultApiBaseUrl,
      mode: mode,
      tenantId: tenantId,
      workspaceId: workspaceId.isEmpty ? null : workspaceId,
      authToken: authToken.isEmpty ? null : authToken,
      userJson: userRaw is Map<String, dynamic>
          ? userRaw
          : (userRaw is Map ? Map<String, dynamic>.from(userRaw) : null),
      staffRoleJson: staffRoleRaw is Map<String, dynamic>
          ? staffRoleRaw
          : (staffRoleRaw is Map
                ? Map<String, dynamic>.from(staffRoleRaw)
                : null),
      staffPermissions: permissionsRaw is List
          ? permissionsRaw.map((item) => item.toString()).toList()
          : const [],
    );
  }

  BootstrapConfig toBootstrapConfig() {
    return BootstrapConfig(
      apiBaseUrl: apiBaseUrl,
      mode: mode,
      tenantId: tenantId,
      workspaceId: workspaceId,
      authToken: authToken,
      userJson: userJson,
      staffRoleJson: staffRoleJson,
      staffPermissions: staffPermissions,
    );
  }

  static AppMode _parseMode(Map<String, dynamic> json) {
    final raw = (json['mode'] ?? '').toString().trim();
    if (raw.isNotEmpty) {
      for (final mode in AppMode.values) {
        if (mode.name == raw) return mode;
      }
      throw FormatException('Unsupported provisioning mode "$raw".');
    }

    if (json['isOffline'] == true) return AppMode.offlineOnly;
    return AppMode.online;
  }
}
