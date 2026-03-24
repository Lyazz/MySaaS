import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/admin_user.dart';
import '../services/api_service.dart';
import '../repositories/user_repository.dart';

class AdminUsersState {
  final List<AdminUser> users;
  final bool isLoading;
  final String? error;
  final bool includeInactive;

  AdminUsersState({
    this.users = const [],
    this.isLoading = false,
    this.error,
    this.includeInactive = false,
  });

  AdminUsersState copyWith({
    List<AdminUser>? users,
    bool? isLoading,
    String? error,
    bool? includeInactive,
  }) {
    return AdminUsersState(
      users: users ?? this.users,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      includeInactive: includeInactive ?? this.includeInactive,
    );
  }
}

String _formatApiError(Object error) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map && data['statusMessage'] != null) {
      return data['statusMessage'].toString();
    }
    return error.message ?? 'Request failed';
  }
  return error.toString();
}

class AdminUsersNotifier extends Notifier<AdminUsersState> {
  final AdminUsersState? _initialState;

  AdminUsersNotifier([this._initialState]);

  @override
  AdminUsersState build() {
    return _initialState ?? AdminUsersState();
  }

  Future<void> fetchUsers({bool? includeInactive}) async {
    final nextIncludeInactive = includeInactive ?? state.includeInactive;

    state = state.copyWith(
      isLoading: true,
      error: null,
      includeInactive: nextIncludeInactive,
    );

    try {
      final api = ref.read(apiProvider);
      final repo = UserRepository(api);

      final users = await repo.getUsers(includeInactive: nextIncludeInactive);

      state = state.copyWith(isLoading: false, users: users);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _formatApiError(e));
    }
  }

  Future<AdminUser?> createUser({
    required String email,
    required String password,
    required String role, // admin | staff
    String? staffRoleId,
  }) async {
    try {
      final api = ref.read(apiProvider);
      final repo = UserRepository(api);

      final created = await repo.createUser({
        'email': email.trim(),
        'password': password,
        'role': role,
        if (staffRoleId != null) 'staffRoleId': staffRoleId,
      });

      await fetchUsers();
      return created;
    } catch (e) {
      state = state.copyWith(error: _formatApiError(e));
      rethrow;
    }
  }

  Future<AdminUser?> updateUser(
    String id, {
    String? email,
    String? password,
    String? role,
    bool? isActive,
    String? staffRoleId,
  }) async {
    try {
      final api = ref.read(apiProvider);
      final repo = UserRepository(api);

      final data = <String, dynamic>{};
      if (email != null) data['email'] = email.trim();
      if (password != null && password.isNotEmpty) data['password'] = password;
      if (role != null) data['role'] = role;
      if (isActive != null) data['isActive'] = isActive;
      if (staffRoleId != null) data['staffRoleId'] = staffRoleId;

      final updated = await repo.updateUser(id, data);
      await fetchUsers();
      return updated;
    } catch (e) {
      state = state.copyWith(error: _formatApiError(e));
      rethrow;
    }
  }

  Future<void> deactivateUser(String id) async {
    try {
      final api = ref.read(apiProvider);
      final repo = UserRepository(api);

      // We still delete logically in the offline sync or delete physically
      // If we just deactivate, probably update user
      await repo.deleteUser(id);

      await fetchUsers();
    } catch (e) {
      state = state.copyWith(error: _formatApiError(e));
      rethrow;
    }
  }
}

final adminUsersProvider =
    NotifierProvider<AdminUsersNotifier, AdminUsersState>(
      AdminUsersNotifier.new,
    );
