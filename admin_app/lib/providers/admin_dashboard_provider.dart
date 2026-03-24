import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/admin_dashboard.dart';
import '../repositories/dashboard_repository.dart';
import '../services/api_service.dart';

class AdminDashboardState {
  final AdminDashboardData data;
  final bool isLoading;
  final String? error;

  const AdminDashboardState({
    required this.data,
    required this.isLoading,
    this.error,
  });

  AdminDashboardState copyWith({
    AdminDashboardData? data,
    bool? isLoading,
    String? error,
  }) {
    return AdminDashboardState(
      data: data ?? this.data,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class AdminDashboardNotifier extends Notifier<AdminDashboardState> {
  late DashboardRepository _repo;

  @override
  AdminDashboardState build() {
    final api = ref.watch(apiProvider);
    _repo = DashboardRepository(api);
    Future.microtask(() => fetchDashboard());
    return const AdminDashboardState(
      data: AdminDashboardData.empty,
      isLoading: false,
    );
  }

  Future<void> fetchDashboard({
    String period = '30d',
    bool forceRefresh = false,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final raw = await _repo.getDashboardStats(
        period,
        forceRefresh: forceRefresh,
      );
      if (raw != null) {
        final data = AdminDashboardData.fromJson(raw);
        state = state.copyWith(data: data, isLoading: false, error: null);
      } else {
        state = state.copyWith(
          isLoading: false,
          error: 'No offline data available for \$period',
        );
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }
}

final adminDashboardProvider =
    NotifierProvider<AdminDashboardNotifier, AdminDashboardState>(
      AdminDashboardNotifier.new,
    );
