import 'package:easy_localization/easy_localization.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../app_config.dart';
import '../bootstrap.dart';
import '../models/app_mode.dart';
import '../models/bootstrap_config.dart';
import '../models/subscription_tier.dart';
import '../services/api_service.dart';
import '../services/app_storage.dart';
import '../services/device_info_service.dart';
import '../services/sync_service.dart';
import '../services/tenant_mode_service.dart';
import '../services/workspace_data_cleaner.dart';
import '../utils/algerian_phone.dart';
import '../utils/auth_error.dart';

class User {
  final String id;
  final String email;
  final String? name;
  final String role;
  final bool isSuperAdmin;
  final String tenantId;
  final String? staffRoleId;

  User({
    required this.id,
    required this.email,
    required this.role,
    required this.isSuperAdmin,
    required this.tenantId,
    this.name,
    this.staffRoleId,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? '',
      email: json['email'] ?? '',
      name: json['name'],
      role: json['role'] ?? 'staff',
      isSuperAdmin: json['isSuperAdmin'] == true,
      tenantId: json['tenantId'] ?? '',
      staffRoleId: json['staffRoleId'],
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'email': email,
    'name': name,
    'role': role,
    'isSuperAdmin': isSuperAdmin,
    'tenantId': tenantId,
    'staffRoleId': staffRoleId,
  };
}

class StaffRoleInfo {
  final String id;
  final String name;

  StaffRoleInfo({required this.id, required this.name});

  factory StaffRoleInfo.fromJson(Map<String, dynamic> json) {
    return StaffRoleInfo(id: json['id'] ?? '', name: json['name'] ?? '');
  }

  Map<String, dynamic> toJson() => {'id': id, 'name': name};
}

class AuthState {
  final User? user;
  final String? token;
  final AppMode mode;
  final SubscriptionTier subscriptionTier;
  final StaffRoleInfo? staffRole;
  final List<String> staffPermissions;
  final bool isLoading;
  final String? error;

  const AuthState({
    this.user,
    this.token,
    this.mode = AppMode.online,
    this.subscriptionTier = SubscriptionTier.online,
    this.staffRole,
    this.staffPermissions = const [],
    this.isLoading = false,
    this.error,
  });

  bool get isAuthenticated => token != null;

  AuthState copyWith({
    User? user,
    String? token,
    AppMode? mode,
    SubscriptionTier? subscriptionTier,
    StaffRoleInfo? staffRole,
    List<String>? staffPermissions,
    bool? isLoading,
    String? error,
    bool clearUser = false,
    bool clearToken = false,
    bool clearStaffRole = false,
  }) {
    // `error` is intentionally not `??`-merged: every state transition states
    // its own error, so a successful step clears the previous failure.
    return AuthState(
      user: clearUser ? null : (user ?? this.user),
      token: clearToken ? null : (token ?? this.token),
      mode: mode ?? this.mode,
      subscriptionTier: subscriptionTier ?? this.subscriptionTier,
      staffRole: clearStaffRole ? null : (staffRole ?? this.staffRole),
      staffPermissions: staffPermissions ?? this.staffPermissions,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    final bootstrap = ref.watch(bootstrapProvider);
    final apiService = ref.read(apiProvider);

    // Initialize mode service from persisted bootstrap — before any network call.
    TenantModeService().initialize(
      mode: bootstrap.mode,
      tenantId: bootstrap.tenantId,
      workspaceId: bootstrap.workspaceId,
    );
    SyncService().initialize(ref.read(apiProvider), mode: bootstrap.mode);

    final token = bootstrap.authToken;
    if (token != null && token.trim().isNotEmpty) {
      apiService.setToken(token);
    }

    final user = bootstrap.userJson != null
        ? User.fromJson(bootstrap.userJson!)
        : null;
    final staffRole = bootstrap.staffRoleJson != null
        ? StaffRoleInfo.fromJson(bootstrap.staffRoleJson!)
        : null;

    final initial = AuthState(
      token: token,
      user: user,
      mode: bootstrap.mode,
      subscriptionTier: bootstrap.subscriptionTier,
      staffRole: staffRole,
      staffPermissions: bootstrap.staffPermissions,
    );

    if (token != null) {
      Future.microtask(() => refreshMe());
    }

    return initial;
  }

  /// Signs in with email + password.
  ///
  /// Throws an [AuthFailure] carrying a message that is safe to render as-is.
  Future<void> login(String email, String password) async {
    final normalizedEmail = email.trim().toLowerCase();
    state = state.copyWith(isLoading: true, error: null);

    try {
      _assertNetworkAllowed();

      final apiService = ref.read(apiProvider);
      final deviceInfo = DeviceInfoService();

      String? hardwareId;
      String? deviceName;
      String? devicePlatform;
      try {
        hardwareId = await deviceInfo.getHardwareId();
        deviceName = deviceInfo.getDeviceDisplayName();
        devicePlatform = deviceInfo.getPlatformType();
      } catch (_) {
        // Device identity is optional — it only drives POS auto-activation.
        hardwareId = null;
        deviceName = null;
        devicePlatform = null;
      }

      final response = await apiService.client.post(
        '/login',
        data: {
          'email': normalizedEmail,
          'password': password,
          if (hardwareId != null) 'hardwareId': hardwareId,
          if (deviceName != null) 'deviceName': deviceName,
          if (devicePlatform != null) 'devicePlatform': devicePlatform,
        },
      );

      await _applyAuthResponse(
        payload: (response.data as Map?)?.cast<String, dynamic>(),
        fallbackEmail: normalizedEmail,
        rejectSuperAdmin: true,
      );
    } catch (error) {
      throw _fail(error);
    }
  }

  /// Creates a tenant + owner account and signs the new owner in.
  ///
  /// Returns the created tenant name when the API reports one. Throws an
  /// [AuthFailure] on any failure.
  Future<String?> register({
    required String name,
    required String slug,
    required String email,
    required String password,
    required String phone,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      _assertNetworkAllowed();

      final apiService = ref.read(apiProvider);
      // Send the same shape the backend normalizes to, so a number typed as
      // `05 40 80 14 36` is not rejected for formatting reasons.
      final normalizedPhone = AlgerianPhone.tryNormalize(phone) ?? phone.trim();

      final response = await apiService.client.post(
        '/register',
        data: {
          'name': name.trim(),
          'slug': slug.trim().toLowerCase(),
          'email': email.trim().toLowerCase(),
          'password': password,
          'phone': normalizedPhone,
        },
      );

      final payload = (response.data as Map?)?.cast<String, dynamic>();
      await _applyAuthResponse(
        payload: payload,
        fallbackEmail: email.trim().toLowerCase(),
        rejectSuperAdmin: false,
      );
      final tenantRaw = payload?['tenant'];
      if (tenantRaw is Map) {
        final tenant = tenantRaw.cast<String, dynamic>();
        final tenantName = tenant['name'];
        if (tenantName is String && tenantName.trim().isNotEmpty) {
          return tenantName.trim();
        }
      }
      return null;
    } catch (error) {
      throw _fail(error);
    }
  }

  /// Local-only installs never reach the API, so fail fast with an explanation
  /// instead of letting the offline guard surface a cancelled request.
  void _assertNetworkAllowed() {
    if (state.mode.allowsNetworkRequests) return;
    throw AuthFailure(
      AuthErrorKind.offlineMode,
      'auth.errors.offlineMode'.tr(),
    );
  }

  /// Records [error] on the state and returns the failure to rethrow.
  AuthFailure _fail(Object error) {
    final failure = AuthErrorMapper.toFailure(error);
    state = state.copyWith(isLoading: false, error: failure.message);
    return failure;
  }

  Future<void> _applyAuthResponse({
    required Map<String, dynamic>? payload,
    required String fallbackEmail,
    required bool rejectSuperAdmin,
  }) async {
    final body = payload ?? const <String, dynamic>{};
    final token = body['token']?.toString().trim() ?? '';
    if (token.isEmpty) {
      throw AuthFailure(
        AuthErrorKind.unknown,
        'auth.errors.invalidResponse'.tr(),
      );
    }

    final apiService = ref.read(apiProvider);
    final activationToken = body['activationToken']?.toString();
    final rawUser = (body['user'] as Map?)?.cast<String, dynamic>();
    final user = User.fromJson(rawUser ?? {'id': '', 'email': fallbackEmail});

    if (rejectSuperAdmin && user.isSuperAdmin) {
      apiService.setToken(null);
      final message = 'auth.errors.superAdmin'.tr();
      // clearToken/clearUser are required here: the `??` merge in copyWith
      // would otherwise keep the rejected session on the state.
      state = state.copyWith(
        isLoading: false,
        clearToken: true,
        clearUser: true,
        clearStaffRole: true,
        staffPermissions: const [],
        error: message,
      );
      await AppStorage.clearAuthSession();
      throw AuthFailure(AuthErrorKind.forbidden, message, statusCode: 403);
    }

    final rawStaffRole = (body['staffRole'] as Map?)
        ?.cast<String, dynamic>();
    final staffRole = rawStaffRole != null
        ? StaffRoleInfo.fromJson(rawStaffRole)
        : null;
    final staffPermissionsRaw = body['staffPermissions'];
    final staffPermissions = (staffPermissionsRaw is List)
        ? staffPermissionsRaw.map((e) => e.toString()).toList()
        : <String>[];

    final runtime = _resolveTenantRuntime(
      body['tenant'],
      fallbackMode: state.mode,
      fallbackTier: state.subscriptionTier,
    );
    final bootstrap = ref.read(bootstrapProvider);

    apiService.setToken(token);
    TenantModeService().initialize(
      mode: runtime.mode,
      tenantId: user.tenantId,
      workspaceId: bootstrap.workspaceId,
    );
    SyncService().initialize(apiService, mode: runtime.mode);

    await AppStorage.saveProvisioningState(
      mode: runtime.mode,
      subscriptionTier: runtime.subscriptionTier,
      tenantId: user.tenantId,
      workspaceId: bootstrap.workspaceId,
    );
    await AppStorage.saveAuthSession(
      token: token,
      userJson: user.toJson(),
      staffRoleJson: staffRole?.toJson(),
      staffPermissions: staffPermissions,
    );

    // Save activation token if it was returned by auto-registration
    if (activationToken != null && activationToken.isNotEmpty) {
      await AppStorage.saveActivationToken(activationToken);
    }
    ref
        .read(bootstrapProvider.notifier)
        .replace(
          bootstrap.copyWith(
            apiBaseUrl: apiService.baseUrl,
            mode: runtime.mode,
            subscriptionTier: runtime.subscriptionTier,
            tenantId: user.tenantId,
            authToken: token,
            userJson: user.toJson(),
            staffRoleJson: staffRole?.toJson(),
            staffPermissions: staffPermissions,
          ),
        );

    state = state.copyWith(
      isLoading: false,
      token: token,
      user: user,
      mode: runtime.mode,
      subscriptionTier: runtime.subscriptionTier,
      staffRole: staffRole,
      staffPermissions: staffPermissions,
    );
  }

  Future<void> refreshMe() async {
    final token = state.token;
    if (token == null || token.trim().isEmpty) return;

    try {
      final apiService = ref.read(apiProvider);
      final response = await apiService.client.get('/me');
      final rawUser = (response.data?['user'] as Map?)?.cast<String, dynamic>();
      if (rawUser == null) return;

      if (response.data?['tenant'] != null) {
        rawUser['tenant'] = response.data?['tenant'];
      }

      final user = User.fromJson(rawUser);
      final runtime = _resolveTenantRuntime(
        response.data?['tenant'],
        fallbackMode: state.mode,
        fallbackTier: state.subscriptionTier,
      );

      final rawStaffRole = (response.data?['staffRole'] as Map?)
          ?.cast<String, dynamic>();
      final staffRole = rawStaffRole != null
          ? StaffRoleInfo.fromJson(rawStaffRole)
          : null;
      final staffPermissionsRaw = response.data?['staffPermissions'];
      final staffPermissions = (staffPermissionsRaw is List)
          ? staffPermissionsRaw.map((e) => e.toString()).toList()
          : <String>[];
      final bootstrap = ref.read(bootstrapProvider);

      TenantModeService().initialize(
        mode: runtime.mode,
        tenantId: user.tenantId,
        workspaceId: bootstrap.workspaceId,
      );
      SyncService().initialize(apiService, mode: runtime.mode);

      await AppStorage.saveProvisioningState(
        mode: runtime.mode,
        subscriptionTier: runtime.subscriptionTier,
        tenantId: user.tenantId,
        workspaceId: bootstrap.workspaceId,
      );
      await AppStorage.saveAuthSession(
        token: token,
        userJson: user.toJson(),
        staffRoleJson: staffRole?.toJson(),
        staffPermissions: staffPermissions,
      );
      ref
          .read(bootstrapProvider.notifier)
          .replace(
            bootstrap.copyWith(
              apiBaseUrl: apiService.baseUrl,
              mode: runtime.mode,
              subscriptionTier: runtime.subscriptionTier,
              tenantId: user.tenantId,
              authToken: token,
              userJson: user.toJson(),
              staffRoleJson: staffRole?.toJson(),
              staffPermissions: staffPermissions,
            ),
          );

      state = state.copyWith(
        user: user,
        mode: runtime.mode,
        subscriptionTier: runtime.subscriptionTier,
        staffRole: staffRole,
        staffPermissions: staffPermissions,
      );
    } catch (_) {
      // Avoid logout on transient network errors.
    }
  }

  void applyProvisioning({
    required AppMode mode,
    required SubscriptionTier subscriptionTier,
  }) {
    state = AuthState(mode: mode, subscriptionTier: subscriptionTier);
  }

  Future<void> logout({bool clearProvisioning = false}) async {
    final bootstrap = ref.read(bootstrapProvider);
    final apiService = ref.read(apiProvider);
    final dataCleaner = WorkspaceDataCleaner();

    try {
      if (state.token != null && bootstrap.mode.allowsNetworkRequests) {
        await apiService.client.post('/logout');
      }
    } catch (_) {}

    await dataCleaner.clearProvisionedWorkspace(bootstrap);
    apiService.setToken(null);
    SyncService().reset();
    await AppStorage.clearAuthSession();

    if (clearProvisioning) {
      await AppStorage.clearProvisioningState();
      TenantModeService().initialize(mode: AppMode.online, tenantId: '');
      ref
          .read(bootstrapProvider.notifier)
          .replace(const BootstrapConfig(apiBaseUrl: defaultApiBaseUrl));
      state = const AuthState();
      return;
    }

    TenantModeService().initialize(
      mode: bootstrap.mode,
      tenantId: bootstrap.tenantId,
      workspaceId: bootstrap.workspaceId,
    );
    ref
        .read(bootstrapProvider.notifier)
        .replace(
          bootstrap.copyWith(
            clearAuthToken: true,
            clearUserJson: true,
            clearStaffRoleJson: true,
            clearStaffPermissions: true,
          ),
        );
    state = AuthState(
      mode: bootstrap.mode,
      subscriptionTier: bootstrap.subscriptionTier,
    );
  }

  _TenantRuntime _resolveTenantRuntime(
    dynamic rawTenant, {
    required AppMode fallbackMode,
    required SubscriptionTier fallbackTier,
  }) {
    final tenant = rawTenant is Map
        ? Map<String, dynamic>.from(rawTenant)
        : const <String, dynamic>{};

    final runtimeMode = _parseRuntimeMode(tenant);
    final subscriptionTier = _parseSubscriptionTier(tenant);

    return _TenantRuntime(
      mode:
          runtimeMode ??
          (tenant['isOffline'] == true
              ? AppMode.offlineOnly
              : (fallbackMode == AppMode.online
                    ? AppMode.hybrid
                    : fallbackMode)),
      subscriptionTier:
          subscriptionTier ??
          (tenant['isOffline'] == true
              ? SubscriptionTier.offlineOnly
              : fallbackTier),
    );
  }

  AppMode? _parseRuntimeMode(Map<String, dynamic> tenant) {
    final raw = (tenant['runtimeMode'] ?? tenant['mode'] ?? tenant['appMode'])
        ?.toString()
        .trim();
    if (raw == null || raw.isEmpty) return null;
    for (final mode in AppMode.values) {
      if (mode.name == raw) return mode;
    }
    return null;
  }

  SubscriptionTier? _parseSubscriptionTier(Map<String, dynamic> tenant) {
    final raw = (tenant['subscriptionTier'] ?? tenant['tier'])
        ?.toString()
        .trim();
    if (raw == null || raw.isEmpty) return null;
    for (final tier in SubscriptionTier.values) {
      if (tier.name == raw) return tier;
    }
    return null;
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(
  AuthNotifier.new,
);

class _TenantRuntime {
  final AppMode mode;
  final SubscriptionTier subscriptionTier;

  const _TenantRuntime({required this.mode, required this.subscriptionTier});
}
