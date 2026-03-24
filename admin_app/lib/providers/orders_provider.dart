import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import '../models/order.dart';
import '../repositories/order_repository.dart';

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
  late OrderRepository _repo;

  @override
  OrdersState build() {
    final api = ref.watch(apiProvider);
    _repo = OrderRepository(api);
    Future.microtask(() => fetchOrders());
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
      final result = await _repo.getOrdersPage(
        search: search,
        status: status,
        startDate: startDate,
        endDate: endDate,
        page: page,
        limit: limit,
      );

      state = state.copyWithPagination(
        isLoading: false,
        orders: result.items,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: result.limit,
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
