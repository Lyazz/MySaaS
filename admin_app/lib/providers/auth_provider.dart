import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../bootstrap.dart';
import '../services/api_service.dart';
import '../services/app_storage.dart';

// Simple user model for now
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
  final StaffRoleInfo? staffRole;
  final List<String> staffPermissions;
  final bool isLoading;
  final String? error;

  const AuthState({
    this.user,
    this.token,
    this.staffRole,
    this.staffPermissions = const [],
    this.isLoading = false,
    this.error,
  });

  bool get isAuthenticated => token != null;

  AuthState copyWith({
    User? user,
    String? token,
    StaffRoleInfo? staffRole,
    List<String>? staffPermissions,
    bool? isLoading,
    String? error,
  }) {
    return AuthState(
      user: user ?? this.user,
      token: token ?? this.token,
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

    final token = bootstrap.authToken;
    if (token != null && token.trim().isNotEmpty) {
      apiService.setToken(token);
    }

    final userJson = bootstrap.userJson;
    final staffRoleJson = bootstrap.staffRoleJson;
    final user = userJson != null ? User.fromJson(userJson) : null;
    final staffRole = staffRoleJson != null
        ? StaffRoleInfo.fromJson(staffRoleJson)
        : null;

    final initial = AuthState(
      token: token,
      user: user,
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

      if (response.data != null && response.data['token'] != null) {
        final token = response.data['token']?.toString() ?? '';
        final rawUser = (response.data['user'] as Map?)
            ?.cast<String, dynamic>();
        final user = User.fromJson(rawUser ?? {'id': '', 'email': email});
        final rawStaffRole = (response.data['staffRole'] as Map?)
            ?.cast<String, dynamic>();
        final staffRole = rawStaffRole != null
            ? StaffRoleInfo.fromJson(rawStaffRole)
            : null;
        final staffPermissionsRaw = response.data['staffPermissions'];
        final staffPermissions = (staffPermissionsRaw is List)
            ? staffPermissionsRaw.map((e) => e.toString()).toList()
            : <String>[];

        if (user.isSuperAdmin) {
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

        apiService.setToken(token);
        state = state.copyWith(
          isLoading: false,
          token: token,
          user: user,
          staffRole: staffRole,
          staffPermissions: staffPermissions,
        );

        await AppStorage.saveAuthSession(
          token: token,
          userJson: user.toJson(),
          staffRoleJson: staffRole?.toJson(),
          staffPermissions: staffPermissions,
        );
      } else {
        throw Exception("Invalid response from server");
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> refreshMe() async {
    final token = state.token;
    if (token == null || token.trim().isEmpty) return;

    try {
      final apiService = ref.read(apiProvider);
      final response = await apiService.client.get('/me');
      final rawUser = (response.data?['user'] as Map?)?.cast<String, dynamic>();
      if (rawUser == null) return;

      final user = User.fromJson(rawUser);
      final rawStaffRole = (response.data?['staffRole'] as Map?)
          ?.cast<String, dynamic>();
      final staffRole = rawStaffRole != null
          ? StaffRoleInfo.fromJson(rawStaffRole)
          : null;
      final staffPermissionsRaw = response.data?['staffPermissions'];
      final staffPermissions = (staffPermissionsRaw is List)
          ? staffPermissionsRaw.map((e) => e.toString()).toList()
          : <String>[];

      state = state.copyWith(
        user: user,
        staffRole: staffRole,
        staffPermissions: staffPermissions,
      );

      await AppStorage.saveAuthSession(
        token: token,
        userJson: user.toJson(),
        staffRoleJson: staffRole?.toJson(),
        staffPermissions: staffPermissions,
      );
    } catch (_) {
      await logout();
    }
  }

  Future<void> logout() async {
    final apiService = ref.read(apiProvider);
    apiService.setToken(null);
    state = const AuthState();
    await AppStorage.clearAuthSession();
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(
  AuthNotifier.new,
);
