import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/cash.dart';
import '../repositories/cash_repository.dart';
import '../repositories/user_repository.dart';
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
  late CashRepository _repo;

  CashNotifier([this._initialState]);

  @override
  CashState build() {
    final api = ref.watch(apiProvider);
    _repo = CashRepository(api);
    return _initialState ?? CashState();
  }

  Future<void> fetchCashboxes({bool forceRefresh = false}) async {
    state = state.copyWith(isLoadingCashboxes: true, error: null);
    try {
      final cashboxes = await _repo.getCashboxes(forceRefresh: forceRefresh);
      state = state.copyWith(isLoadingCashboxes: false, cashboxes: cashboxes);
    } catch (e) {
      state = state.copyWith(isLoadingCashboxes: false, error: e.toString());
    }
  }

  Future<void> fetchSessions({
    String? cashboxId,
    String? status,
    DateTime? startDate,
    DateTime? endDate,
    String? userId,
    bool forceRefresh = false,
  }) async {
    state = state.copyWith(isLoadingSessions: true, error: null);
    try {
      final sessions = await _repo.getSessions(
        cashboxId: cashboxId,
        status: status,
        userId: userId,
        startDate: startDate,
        endDate: endDate,
        forceRefresh: forceRefresh,
      );
      state = state.copyWith(isLoadingSessions: false, sessions: sessions);
    } catch (e) {
      state = state.copyWith(isLoadingSessions: false, error: e.toString());
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
    bool forceRefresh = false,
  }) async {
    state = state.copyWith(isLoadingTransactions: true, error: null);
    try {
      final txs = await _repo.getTransactions(
        cashboxId: cashboxId,
        sessionId: sessionId,
        type: type,
        direction: direction,
        method: method,
        userId: userId,
        startDate: startDate,
        endDate: endDate,
        forceRefresh: forceRefresh,
      );
      state = state.copyWith(isLoadingTransactions: false, transactions: txs);
    } catch (e) {
      state = state.copyWith(isLoadingTransactions: false, error: e.toString());
    }
  }

  Future<void> fetchCashUsers() async {
    state = state.copyWith(isLoadingUsers: true, error: null);
    try {
      final api = ref.read(apiProvider);
      final repo = UserRepository(api);
      final usersRaw = await repo.getUsers(includeInactive: true);
      final users = usersRaw
          .map(
            (u) => CashUserSummary(
              id: u.id,
              email: u.email,
              role: u.role,
              isActive: u.isActive,
            ),
          )
          .toList();
      state = state.copyWith(isLoadingUsers: false, cashUsers: users);
    } catch (e) {
      state = state.copyWith(isLoadingUsers: false, error: e.toString());
    }
  }

  Future<CashboxSummary?> createCashbox({
    required String name,
    bool isActive = true,
  }) async {
    try {
      // NOTE: Not all apps allow POS to create cashboxes offline, typically a manager function.
      // Here we assume CashRepository doesn't actively support offline Cashbox CREATION yet,
      // but if it did, we would call it.
      // For now, we will leave API pass-through for config creation, or we can mock it.
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
      state = state.copyWith(error: e.toString());
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
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }

  Future<CashSessionSummary?> openSession(
    String cashboxId, {
    double openingFloat = 0,
    String? note,
  }) async {
    try {
      final sessionSummary = await _repo.openSession(
        cashboxId: cashboxId,
        openingFloat: openingFloat,
        note: note,
      );
      await fetchCashboxes();
      await fetchSessions();
      return sessionSummary;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }

  Future<CashSessionExpectedClosing?> getExpectedClosing(
    String sessionId,
  ) async {
    try {
      // Offline fallback: we might need to compute this manually by aggregating transactions
      // from the CashRepository. The API currently provides this. If offline, the UI might need
      // to calculate expected closing.
      return await _repo.getExpectedClosing(sessionId);
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return null;
    }
  }

  Future<CashSessionSummary?> closeSession(
    String sessionId, {
    required double closingCount,
    String? note,
  }) async {
    try {
      final summary = await _repo.closeSession(
        sessionId: sessionId,
        closingCount: closingCount,
        note: note,
      );
      await fetchCashboxes();
      await fetchSessions();
      return summary;
    } catch (e) {
      state = state.copyWith(error: e.toString());
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
      // Resolve sessionId if not provided via some lookup, or CashRepo handles it
      String sessionIdStr = '';
      if (cashboxId != null) {
        final openSessions = await _repo.getSessions(
          cashboxId: cashboxId,
          status: 'OPEN',
        );
        if (openSessions.isNotEmpty) sessionIdStr = openSessions.first.id;
      }

      final summary = await _repo.addTransaction(
        sessionId: sessionIdStr,
        type: type,
        direction: direction,
        amount: amount,
        note: note,
        expenseCategory: expenseCategory,
        reference: reference,
      );
      await fetchTransactions();
      return summary;
    } catch (e) {
      state = state.copyWith(error: e.toString());
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
