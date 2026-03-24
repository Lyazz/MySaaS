class TenantModeService {
  static final TenantModeService _instance = TenantModeService._internal();
  factory TenantModeService() => _instance;
  TenantModeService._internal();

  bool _isOfflineTenant = false;

  bool get isOfflineTenant => _isOfflineTenant;

  void setOfflineTenant(bool isOfflineTenant) {
    _isOfflineTenant = isOfflineTenant;
  }

  bool isRequestAllowed(String path) {
    final trimmed = path.trim();
    if (!_isOfflineTenant) return true;

    // Always allow auth/session refresh so the tenant can upgrade and become online.
    if (trimmed == '/login' || trimmed == '/me') return true;

    // Optionally allow billing endpoints for upgrading from offline -> online.
    if (trimmed.startsWith('/admin/billing')) return true;

    // Block everything else (admin APIs, uploads, etc.) in offline-tenant mode.
    return false;
  }
}

