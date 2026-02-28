import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/staff_role.dart';
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

  StaffRolesNotifier([this._initialState]);

  @override
  StaffRolesState build() {
    return _initialState ?? StaffRolesState();
  }

  Future<void> fetchRoles() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final api = ref.read(apiProvider);
      final res = await api.client.get('/admin/staff-roles');
      final data = res.data;
      final rows = (data is List) ? data : const [];
      final roles = rows
          .whereType<Map>()
          .map((e) => StaffRole.fromJson(e.cast<String, dynamic>()))
          .toList();
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
      final api = ref.read(apiProvider);
      final res = await api.client.post(
        '/admin/staff-roles',
        data: {
          'name': name.trim(),
          'permissions': permissions.map((p) => p.toJson()).toList(),
        },
      );
      if (res.data is Map) {
        final role = StaffRole.fromJson(
          (res.data as Map).cast<String, dynamic>(),
        );
        await fetchRoles();
        return role;
      }
      await fetchRoles();
      return null;
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
      final api = ref.read(apiProvider);
      final res = await api.client.patch(
        '/admin/staff-roles/$id',
        data: {
          'name': name.trim(),
          'permissions': permissions.map((p) => p.toJson()).toList(),
        },
      );
      if (res.data is Map) {
        final role = StaffRole.fromJson(
          (res.data as Map).cast<String, dynamic>(),
        );
        await fetchRoles();
        return role;
      }
      await fetchRoles();
      return null;
    } catch (e) {
      state = state.copyWith(error: _formatApiError(e));
      rethrow;
    }
  }

  Future<void> deleteRole(String id) async {
    try {
      final api = ref.read(apiProvider);
      await api.client.delete('/admin/staff-roles/$id');
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
