import '../models/workspace_binding.dart';
import '../models/app_mode.dart';

class TenantModeService {
  static final TenantModeService _instance = TenantModeService._internal();
  factory TenantModeService() => _instance;
  TenantModeService._internal();

  AppMode _mode = AppMode.online;
  String _tenantId = '';
  String? _workspaceId;

  AppMode get mode => _mode;
  String get activeTenantId => _tenantId;
  String? get activeWorkspaceId => _workspaceId;
  String get activeNamespaceKey => WorkspaceBinding(
    tenantId: _tenantId,
    workspaceId: _workspaceId,
  ).namespaceKey;
  bool get isOfflineOnly => _mode == AppMode.offlineOnly;
  bool get allowsNetwork => _mode != AppMode.offlineOnly;

  void initialize({
    required AppMode mode,
    required String tenantId,
    String? workspaceId,
  }) {
    _mode = mode;
    _tenantId = tenantId;
    _workspaceId = workspaceId?.trim().isNotEmpty == true
        ? workspaceId!.trim()
        : null;
  }

  bool isRequestAllowed(String path) {
    if (_mode != AppMode.offlineOnly) return true;
    final trimmed = path.trim();
    if (trimmed == '/login' || trimmed == '/me') return true;
    return false;
  }
}
