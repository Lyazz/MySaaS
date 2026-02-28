import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import '../models/order.dart';

class OrdersState {
  final List<Order> orders;
  final bool isLoading;
  final String? error;
  final int total;
  final int page;
  final int totalPages;
  final int limit;

  OrdersState({
    this.orders = const [],
    this.isLoading = false,
    this.error,
    this.total = 0,
    this.page = 1,
    this.totalPages = 1,
    this.limit = 25,
  });

  OrdersState copyWith({List<Order>? orders, bool? isLoading, String? error}) {
    return OrdersState(
      orders: orders ?? this.orders,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      total: total,
      page: page,
      totalPages: totalPages,
      limit: limit,
    );
  }

  OrdersState copyWithPagination({
    required List<Order> orders,
    required int total,
    required int page,
    required int totalPages,
    required int limit,
    bool? isLoading,
    String? error,
  }) {
    return OrdersState(
      orders: orders,
      total: total,
      page: page,
      totalPages: totalPages,
      limit: limit,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class OrdersNotifier extends Notifier<OrdersState> {
  @override
  OrdersState build() {
    return OrdersState();
  }

  Future<void> fetchOrders({
    String? search,
    String? status,
    DateTime? startDate,
    DateTime? endDate,
    int page = 1,
    int limit = 25,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final apiService = ref.read(apiProvider);

      final Map<String, dynamic> queryParameters = {};
      if (search != null && search.isNotEmpty) {
        queryParameters['search'] = search;
      }
      if (status != null && status.isNotEmpty) {
        queryParameters['status'] = status;
      }
      if (startDate != null) {
        queryParameters['startDate'] = startDate
            .toIso8601String()
            .split('T')
            .first;
      }
      if (endDate != null) {
        queryParameters['endDate'] = endDate.toIso8601String().split('T').first;
      }
      queryParameters['page'] = page;
      queryParameters['limit'] = limit;

      final response = await apiService.client.get(
        '/admin/orders',
        queryParameters: queryParameters,
      );

      final data = response.data;
      List<dynamic> items = const [];
      int total = 0;
      int resolvedPage = page;
      int resolvedTotalPages = 1;

      if (data is Map) {
        if (data['items'] is List) {
          items = data['items'] as List<dynamic>;
        }
        total = int.tryParse(data['total']?.toString() ?? '') ?? 0;
        resolvedPage =
            int.tryParse(data['page']?.toString() ?? '') ?? resolvedPage;
        resolvedTotalPages =
            int.tryParse(data['totalPages']?.toString() ?? '') ??
            resolvedTotalPages;
      } else if (data is List) {
        items = data;
        total = items.length;
        resolvedTotalPages = 1;
        resolvedPage = 1;
      }

      final orders = items.whereType<Map>().map((e) {
        final normalized = <String, dynamic>{};
        for (final entry in e.entries) {
          normalized[entry.key.toString()] = entry.value;
        }
        return Order.fromJson(normalized);
      }).toList();

      state = state.copyWithPagination(
        isLoading: false,
        orders: orders,
        total: total == 0 ? orders.length : total,
        page: resolvedPage,
        totalPages: resolvedTotalPages,
        limit: limit,
        error: null,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }
}

final ordersProvider = NotifierProvider<OrdersNotifier, OrdersState>(
  OrdersNotifier.new,
);
