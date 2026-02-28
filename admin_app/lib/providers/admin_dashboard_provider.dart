import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/admin_dashboard.dart';
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
  @override
  AdminDashboardState build() {
    return const AdminDashboardState(data: AdminDashboardData.empty, isLoading: false);
  }

  Future<void> fetchDashboard() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final api = ref.read(apiProvider);
      final response = await api.client.get('/admin/dashboard');
      final raw = (response.data as Map?)?.cast<String, dynamic>() ?? const {};
      final data = AdminDashboardData.fromJson(raw);
      state = state.copyWith(data: data, isLoading: false, error: null);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }
}

final adminDashboardProvider =
    NotifierProvider<AdminDashboardNotifier, AdminDashboardState>(
      AdminDashboardNotifier.new,
    );

