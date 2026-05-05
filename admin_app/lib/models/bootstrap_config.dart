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

  const BootstrapConfig({
    required this.apiBaseUrl,
    this.mode = AppMode.online,
    this.tenantId = '',
    this.workspaceId,
    this.authToken,
    this.userJson,
    this.staffRoleJson,
    this.staffPermissions = const [],
  });
}
