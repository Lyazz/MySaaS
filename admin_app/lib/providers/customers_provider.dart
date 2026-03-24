import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/customer.dart';
import '../models/customer_detail.dart';
import '../services/api_service.dart';
import '../repositories/customer_repository.dart'; // NEW
import '../repositories/customer_detail_repository.dart';

class CustomersState {
  final List<Customer> customers;
  final bool isLoading;
  final String? error;
  final String search;
  final int total;
  final int page;
  final int totalPages;
  final int limit;
  final Map<String, CustomerDetail> detailsById;

  CustomersState({
    this.customers = const [],
    this.isLoading = false,
    this.error,
    this.search = '',
    this.total = 0,
    this.page = 1,
    this.totalPages = 1,
    this.limit = 25,
    this.detailsById = const {},
  });

  CustomersState copyWith({
    List<Customer>? customers,
    bool? isLoading,
    String? error,
    String? search,
    int? total,
    int? page,
    int? totalPages,
    int? limit,
    Map<String, CustomerDetail>? detailsById,
  }) {
    return CustomersState(
      customers: customers ?? this.customers,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      search: search ?? this.search,
      total: total ?? this.total,
      page: page ?? this.page,
      totalPages: totalPages ?? this.totalPages,
      limit: limit ?? this.limit,
      detailsById: detailsById ?? this.detailsById,
    );
  }

  CustomersState copyWithPagination({
    required List<Customer> customers,
    required int total,
    required int page,
    required int totalPages,
    required int limit,
    bool? isLoading,
    String? error,
    String? search,
  }) {
    return CustomersState(
      customers: customers,
      total: total,
      page: page,
      totalPages: totalPages,
      limit: limit,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      search: search ?? this.search,
      detailsById: detailsById,
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

class CustomersNotifier extends Notifier<CustomersState> {
  final CustomersState? _initialState;

  CustomersNotifier([this._initialState]);

  @override
  CustomersState build() {
    return _initialState ?? CustomersState();
  }

  Future<void> fetchCustomers({
    String? search,
    int page = 1,
    int limit = 25,
  }) async {
    final q = (search ?? state.search).trim();
    state = state.copyWith(isLoading: true, error: null, search: q);

    try {
      final api = ref.read(apiProvider);
      final repo = CustomerRepository(api);

      // Get local + background sync customers
      var allCustomers = await repo.getCustomers();

      // Basic local search filtering
      if (q.isNotEmpty) {
        final query = q.toLowerCase();
        allCustomers = allCustomers
            .where(
              (c) =>
                  c.name.toLowerCase().contains(query) ||
                  (c.phone.contains(query)) ||
                  (c.email?.toLowerCase().contains(query) ?? false),
            )
            .toList();
      }

      // Basic local pagination
      final total = allCustomers.length;
      final totalPages = (total / limit).ceil() > 0
          ? (total / limit).ceil()
          : 1;

      final startIndex = (page - 1) * limit;
      var paginatedCustomers = <Customer>[];

      if (startIndex < total) {
        final endIndex = startIndex + limit < total
            ? startIndex + limit
            : total;
        paginatedCustomers = allCustomers.sublist(startIndex, endIndex);
      }

      state = state.copyWithPagination(
        isLoading: false,
        customers: paginatedCustomers,
        total: total == 0 ? paginatedCustomers.length : total,
        page: page,
        totalPages: totalPages,
        limit: limit,
        error: null,
        search: q,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _formatApiError(e));
    }
  }

  Future<void> createCustomer({
    required String name,
    required String phone,
    String? email,
    String? address,
    double openingBalance = 0,
  }) async {
    final trimmedName = name.trim();
    final trimmedPhone = phone.trim();
    if (trimmedName.isEmpty) {
      state = state.copyWith(error: 'Name is required');
      throw ArgumentError('Name is required');
    }
    if (trimmedPhone.isEmpty) {
      state = state.copyWith(error: 'Phone is required');
      throw ArgumentError('Phone is required');
    }

    state = state.copyWith(isLoading: true, error: null);
    try {
      final api = ref.read(apiProvider);
      final repo = CustomerRepository(api);

      await repo.createCustomer({
        'name': trimmedName,
        'phone': trimmedPhone,
        'email': (email ?? '').trim().isEmpty ? null : email!.trim(),
        'address': (address ?? '').trim().isEmpty ? null : address!.trim(),
        'openingBalance': openingBalance,
      });

      await fetchCustomers(search: state.search, page: 1, limit: state.limit);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _formatApiError(e));
      rethrow;
    }
  }

  Future<CustomerDetail?> fetchCustomerDetail(
    String id, {
    bool force = false,
  }) async {
    if (id.trim().isEmpty) return null;
    if (!force) {
      final cached = state.detailsById[id];
      if (cached != null) return cached;
    }

    try {
      final api = ref.read(apiProvider);
      final repo = CustomerDetailRepository(api);
      final detail = await repo.getCustomerDetail(id, forceRefresh: force);
      if (detail == null) return null;
      state = state.copyWith(detailsById: {...state.detailsById, id: detail});
      return detail;
    } catch (e) {
      state = state.copyWith(error: _formatApiError(e));
      return null;
    }
  }

  Future<void> updateCustomer(
    String id, {
    required String name,
    required String phone,
    String? email,
    String? address,
  }) async {
    final trimmedId = id.trim();
    final trimmedName = name.trim();
    final trimmedPhone = phone.trim();
    if (trimmedId.isEmpty) throw ArgumentError('Customer ID is required');
    if (trimmedName.isEmpty) throw ArgumentError('Name is required');
    if (trimmedPhone.isEmpty) throw ArgumentError('Phone is required');

    state = state.copyWith(isLoading: true, error: null);
    try {
      final api = ref.read(apiProvider);
      final repo = CustomerRepository(api);
      await repo.updateCustomer(trimmedId, {
        'name': trimmedName,
        'phone': trimmedPhone,
        'email': (email ?? '').trim().isNotEmpty ? email!.trim() : null,
        'address': (address ?? '').trim().isNotEmpty ? address!.trim() : null,
      });

      final nextDetails = Map<String, CustomerDetail>.of(state.detailsById);
      nextDetails.remove(trimmedId);
      state = state.copyWith(isLoading: false, detailsById: nextDetails);

      await fetchCustomerDetail(trimmedId, force: true);
      await fetchCustomers(search: state.search, page: 1, limit: state.limit);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _formatApiError(e));
      rethrow;
    }
  }
}

final customersProvider = NotifierProvider<CustomersNotifier, CustomersState>(
  CustomersNotifier.new,
);
