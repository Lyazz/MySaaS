class BootstrapConfig {
  final String apiBaseUrl;
  final String? authToken;
  final Map<String, dynamic>? userJson;
  final Map<String, dynamic>? staffRoleJson;
  final List<String> staffPermissions;

  const BootstrapConfig({
    required this.apiBaseUrl,
    this.authToken,
    this.userJson,
    this.staffRoleJson,
    this.staffPermissions = const [],
  });
}
