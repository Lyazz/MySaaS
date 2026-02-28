import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/sale.dart';
import '../services/api_service.dart';

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
      final query = <String, dynamic>{
        'page': page,
        'limit': limit,
        if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
        if (startDate != null) 'startDate': startDate.toIso8601String(),
        if (endDate != null) 'endDate': endDate.toIso8601String(),
      };

      final res = await api.client.get('/admin/sales', queryParameters: query);
      final data = res.data;

      final items = (data is Map && data['items'] is List)
          ? (data['items'] as List)
          : const [];

      final sales = items
          .whereType<Map>()
          .map((e) => Sale.fromJson(e.cast<String, dynamic>()))
          .toList();

      state = state.copyWith(
        isLoading: false,
        sales: sales,
        page: (data is Map && data['page'] is num)
            ? (data['page'] as num).toInt()
            : page,
        totalPages: (data is Map && data['totalPages'] is num)
            ? (data['totalPages'] as num).toInt()
            : 1,
        total: (data is Map && data['total'] is num)
            ? (data['total'] as num).toInt()
            : sales.length,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _formatApiError(e));
    }
  }
}

final salesProvider = NotifierProvider<SalesNotifier, SalesState>(
  SalesNotifier.new,
);
