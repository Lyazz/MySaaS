class SubscriptionPlan {
  final String code;
  final String name;
  final double price;
  final String features;

  SubscriptionPlan({
    required this.code,
    required this.name,
    required this.price,
    required this.features,
  });
}

class Subscription {
  final String planCode;
  final String status;
  final DateTime nextBillingDate;

  Subscription({
    required this.planCode,
    required this.status,
    required this.nextBillingDate,
  });
}
