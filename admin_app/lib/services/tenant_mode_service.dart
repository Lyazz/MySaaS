import '../models/app_mode.dart';

class TenantModeService {
  static final TenantModeService _instance = TenantModeService._internal();
  factory TenantModeService() => _instance;
  TenantModeService._internal();

  AppMode _mode = AppMode.online;
  String _tenantId = '';

  AppMode get mode => _mode;
  String get activeTenantId => _tenantId;
  bool get isOfflineOnly => _mode == AppMode.offlineOnly;
  bool get allowsNetwork => _mode != AppMode.offlineOnly;

  void initialize({required AppMode mode, required String tenantId}) {
    _mode = mode;
    _tenantId = tenantId;
  }

  bool isRequestAllowed(String path) {
    if (_mode != AppMode.offlineOnly) return true;
    final trimmed = path.trim();
    if (trimmed == '/login' || trimmed == '/me') return true;
    if (trimmed.startsWith('/admin/billing')) return true;
    return false;
  }
}
