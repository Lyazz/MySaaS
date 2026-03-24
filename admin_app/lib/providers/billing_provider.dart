import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/billing_models.dart';
import '../repositories/billing_repository.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

class BillingState {
  final Subscription? currentSubscription;
  final List<SubscriptionPlan> availablePlans;
  final bool isLoading;

  BillingState({
    this.currentSubscription,
    this.availablePlans = const [],
    this.isLoading = false,
  });

  BillingState copyWith({
    Subscription? currentSubscription,
    List<SubscriptionPlan>? availablePlans,
    bool? isLoading,
  }) {
    return BillingState(
      currentSubscription: currentSubscription ?? this.currentSubscription,
      availablePlans: availablePlans ?? this.availablePlans,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

class BillingNotifier extends Notifier<BillingState> {
  late BillingRepository _repo;

  @override
  BillingState build() {
    final api = ref.watch(apiProvider);
    _repo = BillingRepository(api);
    Future.microtask(() => loadSubscription());
    return BillingState(
      availablePlans: [
        SubscriptionPlan(
          code: 'basic',
          name: 'Basic',
          price: 29.0,
          features: 'Up to 100 orders/mo',
        ),
        SubscriptionPlan(
          code: 'pro',
          name: 'Pro',
          price: 79.0,
          features: 'Unlimited orders, POS included',
        ),
        SubscriptionPlan(
          code: 'enterprise',
          name: 'Enterprise',
          price: 199.0,
          features: 'Dedicated support, API access',
        ),
      ],
    );
  }

  Future<void> loadSubscription({bool forceRefresh = false}) async {
    state = state.copyWith(isLoading: true);
    try {
      final sub = await _repo.getSubscription(forceRefresh: forceRefresh);
      state = state.copyWith(currentSubscription: sub, isLoading: false);
      // If a payment/upgrade happened outside the app, refresh tenant flags (e.g. isOffline).
      ref.read(authProvider.notifier).refreshMe();
    } catch (e) {
      state = state.copyWith(isLoading: false);
    }
  }

  Future<void> upgradePlan(String planCode) async {
    state = state.copyWith(isLoading: true);
    await Future.delayed(const Duration(seconds: 1));
    final newSub = Subscription(
      planCode: planCode,
      status: 'ACTIVE',
      nextBillingDate: DateTime.now().add(const Duration(days: 30)),
    );
    state = state.copyWith(currentSubscription: newSub, isLoading: false);
    ref.read(authProvider.notifier).refreshMe();
  }
}

final billingProvider = NotifierProvider<BillingNotifier, BillingState>(
  BillingNotifier.new,
);
