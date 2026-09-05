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

  /// Paths that stay reachable even for an offline-only tenant.
  ///
  /// Licence traffic carries no business data -- only the device's own
  /// activation state -- and it is what lets an offline-only device renew its
  /// window and learn it has been revoked. Blocking it here would lock every
  /// offline-only tenant by construction, since the window would expire with no
  /// way to refresh it.
  static const Set<String> _alwaysAllowedPaths = {
    '/login',
    '/me',
    '/activation/heartbeat',
    '/activation/online',
  };

  bool isRequestAllowed(String path) {
    if (_mode != AppMode.offlineOnly) return true;
    return _alwaysAllowedPaths.contains(path.trim());
  }
}
