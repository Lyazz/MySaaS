import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/billing_models.dart';
import '../repositories/billing_repository.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

class BillingState {
  final BillingSnapshot? snapshot;
  final List<SubscriptionPlan> availablePlans;
  final List<BillingPayment> payments;
  final bool isLoading;
  final String interval;
  final String? error;

  const BillingState({
    this.snapshot,
    this.availablePlans = const [],
    this.payments = const [],
    this.isLoading = false,
    this.interval = 'month',
    this.error,
  });

  BillingState copyWith({
    BillingSnapshot? snapshot,
    List<SubscriptionPlan>? availablePlans,
    List<BillingPayment>? payments,
    bool? isLoading,
    String? interval,
    String? error,
  }) {
    return BillingState(
      snapshot: snapshot ?? this.snapshot,
      availablePlans: availablePlans ?? this.availablePlans,
      payments: payments ?? this.payments,
      isLoading: isLoading ?? this.isLoading,
      interval: interval ?? this.interval,
      error: error,
    );
  }
}

class BillingNotifier extends Notifier<BillingState> {
  late BillingRepository _repo;

  @override
  BillingState build() {
    final api = ref.watch(apiProvider);
    _repo = BillingRepository(api);
    Future.microtask(load);
    return const BillingState();
  }

  Future<void> load() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final plans = await _repo.listPlans();
      final snapshot = await _repo.getSnapshot();
      final payments = await _repo.listPayments();
      state = state.copyWith(
        availablePlans: plans,
        snapshot: snapshot,
        payments: payments,
        interval: snapshot.subscription.interval,
        isLoading: false,
      );
      ref.read(authProvider.notifier).refreshMe();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void setInterval(String interval) {
    state = state.copyWith(interval: interval);
  }

  Future<void> simulatePayment(String planCode) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final snapshot = await _repo.simulatePayment(
        planCode: planCode,
        interval: state.interval,
      );
      final payments = await _repo.listPayments();
      state = state.copyWith(
        snapshot: snapshot,
        payments: payments,
        interval: snapshot.subscription.interval,
        isLoading: false,
      );
      ref.read(authProvider.notifier).refreshMe();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> submitPayment({
    required String planCode,
    required String method,
    String? notes,
  }) async {
    SubscriptionPlan? plan;
    for (final item in state.availablePlans) {
      if (item.code == planCode) {
        plan = item;
        break;
      }
    }
    if (plan == null) {
      throw Exception('Unknown plan selected');
    }

    state = state.copyWith(isLoading: true, error: null);
    try {
      await _repo.submitPayment(
        planCode: planCode,
        interval: state.interval,
        method: method,
        amountDzd: state.interval == 'year'
            ? plan.annualAmountDzd * 12
            : plan.monthlyAmountDzd,
        notes: notes,
      );
      await load();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }
}

final billingProvider = NotifierProvider<BillingNotifier, BillingState>(
  BillingNotifier.new,
);
