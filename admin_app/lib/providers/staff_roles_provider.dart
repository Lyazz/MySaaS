import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/staff_role.dart';
import '../repositories/staff_role_repository.dart';
import '../services/api_service.dart';

class StaffRolesState {
  final List<StaffRole> roles;
  final bool isLoading;
  final String? error;

  StaffRolesState({this.roles = const [], this.isLoading = false, this.error});

  StaffRolesState copyWith({
    List<StaffRole>? roles,
    bool? isLoading,
    String? error,
  }) {
    return StaffRolesState(
      roles: roles ?? this.roles,
      isLoading: isLoading ?? this.isLoading,
      error: error,
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

class StaffRolesNotifier extends Notifier<StaffRolesState> {
  final StaffRolesState? _initialState;
  late StaffRoleRepository _repo;

  StaffRolesNotifier([this._initialState]);

  @override
  StaffRolesState build() {
    final api = ref.watch(apiProvider);
    _repo = StaffRoleRepository(api);
    Future.microtask(() => fetchRoles());
    return _initialState ?? StaffRolesState();
  }

  Future<void> fetchRoles({bool forceRefresh = false}) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final roles = await _repo.getRoles(forceRefresh: forceRefresh);
      state = state.copyWith(isLoading: false, roles: roles);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _formatApiError(e));
    }
  }

  Future<StaffRole?> createRole({
    required String name,
    required List<StaffRolePermissionGroup> permissions,
  }) async {
    try {
      final role = await _repo.createRole(name: name, permissions: permissions);
      await fetchRoles();
      return role;
    } catch (e) {
      state = state.copyWith(error: _formatApiError(e));
      rethrow;
    }
  }

  Future<StaffRole?> updateRole(
    String id, {
    required String name,
    required List<StaffRolePermissionGroup> permissions,
  }) async {
    try {
      final role = await _repo.updateRole(
        id,
        name: name,
        permissions: permissions,
      );
      await fetchRoles();
      return role;
    } catch (e) {
      state = state.copyWith(error: _formatApiError(e));
      rethrow;
    }
  }

  Future<void> deleteRole(String id) async {
    try {
      await _repo.deleteRole(id);
      await fetchRoles();
    } catch (e) {
      state = state.copyWith(error: _formatApiError(e));
      rethrow;
    }
  }
}

final staffRolesProvider =
    NotifierProvider<StaffRolesNotifier, StaffRolesState>(
      StaffRolesNotifier.new,
    );
