import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/billing_models.dart';

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
  @override
  BillingState build() {
    return BillingState(
      currentSubscription: Subscription(
        planCode: 'pro',
        status: 'ACTIVE',
        nextBillingDate: DateTime.now().add(const Duration(days: 15)),
      ),
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

  Future<void> upgradePlan(String planCode) async {
    state = state.copyWith(isLoading: true);
    await Future.delayed(const Duration(seconds: 1));
    final newSub = Subscription(
      planCode: planCode,
      status: 'ACTIVE',
      nextBillingDate: DateTime.now().add(const Duration(days: 30)),
    );
    state = state.copyWith(currentSubscription: newSub, isLoading: false);
  }
}

final billingProvider = NotifierProvider<BillingNotifier, BillingState>(
  BillingNotifier.new,
);
