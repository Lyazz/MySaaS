import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/sale.dart';
import '../services/api_service.dart';
import '../repositories/sale_repository.dart';

class SalesState {
  final List<Sale> sales;
  final bool isLoading;
  final String? error;
  final int page;
  final int totalPages;
  final int total;

  SalesState({
    this.sales = const [],
    this.isLoading = false,
    this.error,
    this.page = 1,
    this.totalPages = 1,
    this.total = 0,
  });

  SalesState copyWith({
    List<Sale>? sales,
    bool? isLoading,
    String? error,
    int? page,
    int? totalPages,
    int? total,
  }) {
    return SalesState(
      sales: sales ?? this.sales,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      page: page ?? this.page,
      totalPages: totalPages ?? this.totalPages,
      total: total ?? this.total,
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

class SalesNotifier extends Notifier<SalesState> {
  final SalesState? _initialState;

  SalesNotifier([this._initialState]);

  @override
  SalesState build() {
    return _initialState ?? SalesState();
  }

  Future<void> fetchSales({
    String? search,
    DateTime? startDate,
    DateTime? endDate,
    int page = 1,
    int limit = 25,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final api = ref.read(apiProvider);
      final repo = SaleRepository(api);
      final result = await repo.listSales(
        search: search,
        startDate: startDate,
        endDate: endDate,
        page: page,
        limit: limit,
      );

      state = state.copyWith(
        isLoading: false,
        sales: result.items,
        page: result.page,
        totalPages: result.totalPages,
        total: result.total,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _formatApiError(e));
    }
  }
}

final salesProvider = NotifierProvider<SalesNotifier, SalesState>(
  SalesNotifier.new,
);
