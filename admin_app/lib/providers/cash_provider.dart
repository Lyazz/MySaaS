import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/cash.dart';
import '../services/api_service.dart';

class CashState {
  final List<CashboxSummary> cashboxes;
  final List<CashSessionSummary> sessions;
  final List<CashTransactionSummary> transactions;
  final List<CashUserSummary> cashUsers;
  final bool isLoadingCashboxes;
  final bool isLoadingSessions;
  final bool isLoadingTransactions;
  final bool isLoadingUsers;
  final String? error;

  CashState({
    this.cashboxes = const [],
    this.sessions = const [],
    this.transactions = const [],
    this.cashUsers = const [],
    this.isLoadingCashboxes = false,
    this.isLoadingSessions = false,
    this.isLoadingTransactions = false,
    this.isLoadingUsers = false,
    this.error,
  });

  CashState copyWith({
    List<CashboxSummary>? cashboxes,
    List<CashSessionSummary>? sessions,
    List<CashTransactionSummary>? transactions,
    List<CashUserSummary>? cashUsers,
    bool? isLoadingCashboxes,
    bool? isLoadingSessions,
    bool? isLoadingTransactions,
    bool? isLoadingUsers,
    String? error,
  }) {
    return CashState(
      cashboxes: cashboxes ?? this.cashboxes,
      sessions: sessions ?? this.sessions,
      transactions: transactions ?? this.transactions,
      cashUsers: cashUsers ?? this.cashUsers,
      isLoadingCashboxes: isLoadingCashboxes ?? this.isLoadingCashboxes,
      isLoadingSessions: isLoadingSessions ?? this.isLoadingSessions,
      isLoadingTransactions:
          isLoadingTransactions ?? this.isLoadingTransactions,
      isLoadingUsers: isLoadingUsers ?? this.isLoadingUsers,
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

class CashNotifier extends Notifier<CashState> {
  final CashState? _initialState;

  CashNotifier([this._initialState]);

  @override
  CashState build() {
    return _initialState ?? CashState();
  }

  Future<void> fetchCashboxes() async {
    state = state.copyWith(isLoadingCashboxes: true, error: null);
    try {
      final api = ref.read(apiProvider);
      final res = await api.client.get('/admin/cashboxes');
      final data = res.data;
      final rows = (data is List) ? data : const [];
      final cashboxes = rows
          .whereType<Map>()
          .map((e) => CashboxSummary.fromJson(e.cast<String, dynamic>()))
          .toList();
      state = state.copyWith(isLoadingCashboxes: false, cashboxes: cashboxes);
    } catch (e) {
      state = state.copyWith(
        isLoadingCashboxes: false,
        error: _formatApiError(e),
      );
    }
  }

  Future<void> fetchSessions({
    String? cashboxId,
    String? status,
    DateTime? startDate,
    DateTime? endDate,
    String? userId,
  }) async {
    state = state.copyWith(isLoadingSessions: true, error: null);
    try {
      final api = ref.read(apiProvider);
      final query = <String, dynamic>{
        if (cashboxId != null && cashboxId.trim().isNotEmpty)
          'cashboxId': cashboxId.trim(),
        if (status != null && status.trim().isNotEmpty) 'status': status.trim(),
        if (userId != null && userId.trim().isNotEmpty) 'userId': userId.trim(),
        if (startDate != null) 'startDate': startDate.toIso8601String(),
        if (endDate != null) 'endDate': endDate.toIso8601String(),
      };
      final res = await api.client.get(
        '/admin/cash-sessions',
        queryParameters: query,
      );
      final data = res.data;
      final rows = (data is List) ? data : const [];
      final sessions = rows
          .whereType<Map>()
          .map((e) => CashSessionSummary.fromJson(e.cast<String, dynamic>()))
          .toList();
      state = state.copyWith(isLoadingSessions: false, sessions: sessions);
    } catch (e) {
      state = state.copyWith(
        isLoadingSessions: false,
        error: _formatApiError(e),
      );
    }
  }

  Future<void> fetchTransactions({
    String? cashboxId,
    String? sessionId,
    String? type,
    String? direction,
    String? method,
    String? userId,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    state = state.copyWith(isLoadingTransactions: true, error: null);
    try {
      final api = ref.read(apiProvider);
      final query = <String, dynamic>{
        if (cashboxId != null && cashboxId.trim().isNotEmpty)
          'cashboxId': cashboxId.trim(),
        if (sessionId != null && sessionId.trim().isNotEmpty)
          'sessionId': sessionId.trim(),
        if (type != null && type.trim().isNotEmpty) 'type': type.trim(),
        if (direction != null && direction.trim().isNotEmpty)
          'direction': direction.trim(),
        if (method != null && method.trim().isNotEmpty) 'method': method.trim(),
        if (userId != null && userId.trim().isNotEmpty) 'userId': userId.trim(),
        if (startDate != null) 'startDate': startDate.toIso8601String(),
        if (endDate != null) 'endDate': endDate.toIso8601String(),
      };
      final res = await api.client.get(
        '/admin/cash-transactions',
        queryParameters: query,
      );
      final data = res.data;
      final rows = (data is List) ? data : const [];
      final txs = rows
          .whereType<Map>()
          .map(
            (e) => CashTransactionSummary.fromJson(e.cast<String, dynamic>()),
          )
          .toList();
      state = state.copyWith(isLoadingTransactions: false, transactions: txs);
    } catch (e) {
      state = state.copyWith(
        isLoadingTransactions: false,
        error: _formatApiError(e),
      );
    }
  }

  Future<void> fetchCashUsers() async {
    state = state.copyWith(isLoadingUsers: true, error: null);
    try {
      final api = ref.read(apiProvider);
      final res = await api.client.get('/admin/cash-users');
      final data = res.data;
      final rows = (data is List) ? data : const [];
      final users = rows
          .whereType<Map>()
          .map((e) => CashUserSummary.fromJson(e.cast<String, dynamic>()))
          .toList();
      state = state.copyWith(isLoadingUsers: false, cashUsers: users);
    } catch (e) {
      state = state.copyWith(isLoadingUsers: false, error: _formatApiError(e));
    }
  }

  Future<CashboxSummary?> createCashbox({
    required String name,
    bool isActive = true,
  }) async {
    try {
      final api = ref.read(apiProvider);
      final res = await api.client.post(
        '/admin/cashboxes',
        data: {'name': name.trim(), 'isActive': isActive},
      );
      await fetchCashboxes();
      final data = res.data;
      if (data is Map) {
        return CashboxSummary.fromJson(data.cast<String, dynamic>());
      }
      return null;
    } catch (e) {
      state = state.copyWith(error: _formatApiError(e));
      rethrow;
    }
  }

  Future<CashboxSummary?> updateCashbox(
    String id, {
    String? name,
    bool? isActive,
  }) async {
    try {
      final api = ref.read(apiProvider);
      final payload = <String, dynamic>{};
      if (name != null) payload['name'] = name.trim();
      if (isActive != null) payload['isActive'] = isActive;
      final res = await api.client.patch('/admin/cashboxes/$id', data: payload);
      await fetchCashboxes();
      final data = res.data;
      if (data is Map) {
        return CashboxSummary.fromJson(data.cast<String, dynamic>());
      }
      return null;
    } catch (e) {
      state = state.copyWith(error: _formatApiError(e));
      rethrow;
    }
  }

  Future<CashSessionSummary?> openSession(
    String cashboxId, {
    double openingFloat = 0,
    String? note,
  }) async {
    try {
      final api = ref.read(apiProvider);
      final res = await api.client.post(
        '/admin/cashboxes/$cashboxId/sessions/open',
        data: {
          'openingFloat': openingFloat.toString(),
          if (note != null) 'note': note,
        },
      );
      await fetchCashboxes();
      await fetchSessions();
      final data = res.data;
      if (data is Map) {
        return CashSessionSummary.fromJson(data.cast<String, dynamic>());
      }
      return null;
    } catch (e) {
      state = state.copyWith(error: _formatApiError(e));
      rethrow;
    }
  }

  Future<CashSessionExpectedClosing?> getExpectedClosing(
    String sessionId,
  ) async {
    try {
      final api = ref.read(apiProvider);
      final res = await api.client.get(
        '/admin/cash-sessions/$sessionId/expected',
      );
      final data = res.data;
      if (data is Map) {
        return CashSessionExpectedClosing.fromJson(
          data.cast<String, dynamic>(),
        );
      }
      return null;
    } catch (e) {
      state = state.copyWith(error: _formatApiError(e));
      return null;
    }
  }

  Future<CashSessionSummary?> closeSession(
    String sessionId, {
    required double closingCount,
    String? note,
  }) async {
    try {
      final api = ref.read(apiProvider);
      final res = await api.client.post(
        '/admin/cash-sessions/$sessionId/close',
        data: {
          'closingCount': closingCount.toString(),
          if (note != null) 'note': note,
        },
      );
      await fetchCashboxes();
      await fetchSessions();
      final data = res.data;
      if (data is Map) {
        return CashSessionSummary.fromJson(data.cast<String, dynamic>());
      }
      return null;
    } catch (e) {
      state = state.copyWith(error: _formatApiError(e));
      rethrow;
    }
  }

  Future<CashTransactionSummary?> createTransaction({
    String? cashboxId,
    required String type,
    required String direction,
    required double amount,
    String currency = 'DZD',
    String method = 'CASH',
    String? customerId,
    String? supplierId,
    String? expenseCategory,
    String? reference,
    String? note,
  }) async {
    try {
      final api = ref.read(apiProvider);
      final payload = <String, dynamic>{
        'type': type,
        'direction': direction,
        'amount': amount.toString(),
        'currency': currency,
        'method': method,
        if (cashboxId != null) 'cashboxId': cashboxId,
        if (customerId != null) 'customerId': customerId,
        if (supplierId != null) 'supplierId': supplierId,
        if (expenseCategory != null) 'expenseCategory': expenseCategory,
        if (reference != null) 'reference': reference,
        if (note != null) 'note': note,
      };
      final res = await api.client.post(
        '/admin/cash-transactions',
        data: payload,
      );
      await fetchTransactions();
      final data = res.data;
      if (data is Map) {
        return CashTransactionSummary.fromJson(data.cast<String, dynamic>());
      }
      return null;
    } catch (e) {
      state = state.copyWith(error: _formatApiError(e));
      rethrow;
    }
  }

  Future<void> transfer({
    required String fromCashboxId,
    required String toCashboxId,
    required double amount,
    String currency = 'DZD',
    String? reference,
    String? note,
  }) async {
    try {
      final api = ref.read(apiProvider);
      await api.client.post(
        '/admin/cash-transfers',
        data: {
          'fromCashboxId': fromCashboxId,
          'toCashboxId': toCashboxId,
          'amount': amount.toString(),
          'currency': currency,
          if (reference != null) 'reference': reference,
          if (note != null) 'note': note,
        },
      );
      await fetchTransactions();
    } catch (e) {
      state = state.copyWith(error: _formatApiError(e));
      rethrow;
    }
  }
}

final cashProvider = NotifierProvider<CashNotifier, CashState>(
  CashNotifier.new,
);
