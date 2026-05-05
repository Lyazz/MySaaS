import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../bootstrap.dart';
import '../models/app_mode.dart';
import '../services/api_service.dart';
import '../services/app_storage.dart';
import '../services/sync_service.dart';
import '../services/tenant_mode_service.dart';
import 'sync_provider.dart';

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
  final StaffRoleInfo? staffRole;
  final List<String> staffPermissions;
  final bool isLoading;
  final String? error;

  const AuthState({
    this.user,
    this.token,
    this.mode = AppMode.online,
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
    StaffRoleInfo? staffRole,
    List<String>? staffPermissions,
    bool? isLoading,
    String? error,
  }) {
    return AuthState(
      user: user ?? this.user,
      token: token ?? this.token,
      mode: mode ?? this.mode,
      staffRole: staffRole ?? this.staffRole,
      staffPermissions: staffPermissions ?? this.staffPermissions,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    final bootstrap = ref.read(bootstrapProvider);
    final apiService = ref.read(apiProvider);

    // Initialize mode service from persisted bootstrap — before any network call.
    TenantModeService().initialize(
      mode: bootstrap.mode,
      tenantId: bootstrap.tenantId,
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
      staffRole: staffRole,
      staffPermissions: bootstrap.staffPermissions,
    );

    if (token != null) {
      Future.microtask(() => refreshMe());
    }

    return initial;
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final apiService = ref.read(apiProvider);
      final response = await apiService.client.post(
        '/login',
        data: {'email': email, 'password': password},
      );

      await _applyAuthResponse(
        payload: (response.data as Map?)?.cast<String, dynamic>(),
        fallbackEmail: email,
        rejectSuperAdmin: true,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<String?> register({
    required String name,
    required String slug,
    required String email,
    required String password,
    required String phone,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final apiService = ref.read(apiProvider);
      final response = await apiService.client.post(
        '/register',
        data: {
          'name': name,
          'slug': slug,
          'email': email,
          'password': password,
          'phone': phone,
        },
      );

      final payload = (response.data as Map?)?.cast<String, dynamic>();
      await _applyAuthResponse(
        payload: payload,
        fallbackEmail: email,
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
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> _applyAuthResponse({
    required Map<String, dynamic>? payload,
    required String fallbackEmail,
    required bool rejectSuperAdmin,
  }) async {
    if (payload == null || payload['token'] == null) {
      throw Exception('Invalid response from server');
    }

    final apiService = ref.read(apiProvider);
    final token = payload['token'].toString();
    final rawUser = (payload['user'] as Map?)?.cast<String, dynamic>();
    final user = User.fromJson(rawUser ?? {'id': '', 'email': fallbackEmail});

    if (rejectSuperAdmin && user.isSuperAdmin) {
      apiService.setToken(null);
      state = state.copyWith(
        isLoading: false,
        token: null,
        user: null,
        staffRole: null,
        staffPermissions: const [],
        error: 'Super-admin accounts must use the web super-admin console.',
      );
      await AppStorage.clearAuthSession();
      throw Exception(state.error);
    }

    final rawStaffRole = (payload['staffRole'] as Map?)
        ?.cast<String, dynamic>();
    final staffRole = rawStaffRole != null
        ? StaffRoleInfo.fromJson(rawStaffRole)
        : null;
    final staffPermissionsRaw = payload['staffPermissions'];
    final staffPermissions = (staffPermissionsRaw is List)
        ? staffPermissionsRaw.map((e) => e.toString()).toList()
        : <String>[];

    // Derive mode from server response (tenant.isOffline flag).
    final tenantIsOffline = payload['tenant']?['isOffline'] == true;
    final mode = tenantIsOffline ? AppMode.offlineOnly : AppMode.online;

    apiService.setToken(token);
    TenantModeService().initialize(mode: mode, tenantId: user.tenantId);
    SyncService().initialize(apiService, mode: mode);

    await AppStorage.saveProvisioningState(mode: mode, tenantId: user.tenantId);
    await AppStorage.saveAuthSession(
      token: token,
      userJson: user.toJson(),
      staffRoleJson: staffRole?.toJson(),
      staffPermissions: staffPermissions,
    );

    state = state.copyWith(
      isLoading: false,
      token: token,
      user: user,
      mode: mode,
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
      final tenantIsOffline = response.data?['tenant']?['isOffline'] == true;
      final mode = tenantIsOffline ? AppMode.offlineOnly : AppMode.online;

      final rawStaffRole = (response.data?['staffRole'] as Map?)
          ?.cast<String, dynamic>();
      final staffRole = rawStaffRole != null
          ? StaffRoleInfo.fromJson(rawStaffRole)
          : null;
      final staffPermissionsRaw = response.data?['staffPermissions'];
      final staffPermissions = (staffPermissionsRaw is List)
          ? staffPermissionsRaw.map((e) => e.toString()).toList()
          : <String>[];

      TenantModeService().initialize(mode: mode, tenantId: user.tenantId);
      SyncService().initialize(apiService, mode: mode);

      await AppStorage.saveProvisioningState(
        mode: mode,
        tenantId: user.tenantId,
      );
      await AppStorage.saveAuthSession(
        token: token,
        userJson: user.toJson(),
        staffRoleJson: staffRole?.toJson(),
        staffPermissions: staffPermissions,
      );

      state = state.copyWith(
        user: user,
        mode: mode,
        staffRole: staffRole,
        staffPermissions: staffPermissions,
      );
    } catch (_) {
      // Avoid logout on transient network errors.
    }
  }

  Future<void> logout() async {
    final tenantId = TenantModeService().activeTenantId;
    final apiService = ref.read(apiProvider);
    apiService.setToken(null);
    TenantModeService().initialize(mode: AppMode.online, tenantId: '');
    SyncService().initialize(apiService, mode: AppMode.online);
    state = const AuthState();
    await AppStorage.clearAuthSession();
    await AppStorage.clearProvisioningState();
    // Clear local data for this tenant on explicit logout.
    if (tenantId.isNotEmpty) {
      final dbService = ref.read(databaseServiceProvider);
      await dbService.clearTenantData(tenantId);
    }
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(
  AuthNotifier.new,
);
