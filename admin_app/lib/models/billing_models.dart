class SubscriptionPlan {
  final String code;
  final String name;
  final String description;
  final String currency;
  final int monthlyAmountDzd;
  final int annualAmountDzd;
  final int ordersPerMonth;
  final int maxProducts;
  final int maxPixels;
  final bool popular;
  final bool highlight;

  const SubscriptionPlan({
    required this.code,
    required this.name,
    required this.description,
    required this.currency,
    required this.monthlyAmountDzd,
    required this.annualAmountDzd,
    required this.ordersPerMonth,
    required this.maxProducts,
    required this.maxPixels,
    this.popular = false,
    this.highlight = false,
  });

  factory SubscriptionPlan.fromJson(Map<String, dynamic> json) {
    final pricing = json['pricing'] is Map
        ? Map<String, dynamic>.from(json['pricing'] as Map)
        : const {};
    final flags = json['flags'] is Map
        ? Map<String, dynamic>.from(json['flags'] as Map)
        : const {};
    return SubscriptionPlan(
      code: json['code']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      currency: pricing['currency']?.toString() ?? 'DA',
      monthlyAmountDzd:
          int.tryParse(pricing['monthlyAmountDzd']?.toString() ?? '0') ?? 0,
      annualAmountDzd:
          int.tryParse(pricing['annualAmountDzd']?.toString() ?? '0') ?? 0,
      ordersPerMonth:
          int.tryParse(json['ordersPerMonth']?.toString() ?? '0') ?? 0,
      maxProducts: int.tryParse(json['maxProducts']?.toString() ?? '0') ?? 0,
      maxPixels: int.tryParse(json['maxPixels']?.toString() ?? '0') ?? 0,
      popular: flags['popular'] == true,
      highlight: flags['highlight'] == true,
    );
  }
}

class Subscription {
  final String planCode;
  final String status;
  final String interval;
  final DateTime currentPeriodStart;
  final DateTime currentPeriodEnd;
  final bool cancelAtPeriodEnd;

  const Subscription({
    required this.planCode,
    required this.status,
    required this.interval,
    required this.currentPeriodStart,
    required this.currentPeriodEnd,
    required this.cancelAtPeriodEnd,
  });

  factory Subscription.fromJson(Map<String, dynamic> json) {
    return Subscription(
      planCode: json['planCode']?.toString() ?? '',
      status: json['status']?.toString() ?? 'ACTIVE',
      interval: json['interval']?.toString() ?? 'month',
      currentPeriodStart:
          DateTime.tryParse(json['currentPeriodStart']?.toString() ?? '') ??
          DateTime.now(),
      currentPeriodEnd:
          DateTime.tryParse(json['currentPeriodEnd']?.toString() ?? '') ??
          DateTime.now(),
      cancelAtPeriodEnd: json['cancelAtPeriodEnd'] == true,
    );
  }
}

class BillingUsage {
  final int ordersInPeriod;
  final int ordersLimit;
  final DateTime periodStart;
  final DateTime periodEnd;

  const BillingUsage({
    required this.ordersInPeriod,
    required this.ordersLimit,
    required this.periodStart,
    required this.periodEnd,
  });

  factory BillingUsage.fromJson(Map<String, dynamic> json) {
    return BillingUsage(
      ordersInPeriod:
          int.tryParse(json['ordersInPeriod']?.toString() ?? '0') ?? 0,
      ordersLimit: int.tryParse(json['ordersLimit']?.toString() ?? '0') ?? 0,
      periodStart:
          DateTime.tryParse(json['periodStart']?.toString() ?? '') ??
          DateTime.now(),
      periodEnd:
          DateTime.tryParse(json['periodEnd']?.toString() ?? '') ??
          DateTime.now(),
    );
  }
}

class BillingSnapshot {
  final Subscription subscription;
  final SubscriptionPlan plan;
  final BillingUsage usage;

  const BillingSnapshot({
    required this.subscription,
    required this.plan,
    required this.usage,
  });

  factory BillingSnapshot.fromJson(Map<String, dynamic> json) {
    return BillingSnapshot(
      subscription: Subscription.fromJson(
        json['subscription'] is Map
            ? Map<String, dynamic>.from(json['subscription'] as Map)
            : const {},
      ),
      plan: SubscriptionPlan.fromJson(
        json['plan'] is Map
            ? Map<String, dynamic>.from(json['plan'] as Map)
            : const {},
      ),
      usage: BillingUsage.fromJson(
        json['usage'] is Map
            ? Map<String, dynamic>.from(json['usage'] as Map)
            : const {},
      ),
    );
  }
}

class BillingPayment {
  final String id;
  final String status;
  final String planCode;
  final String interval;
  final String method;
  final int amountDzd;
  final String currency;
  final String? proofUrl;
  final String? notes;
  final DateTime? createdAt;

  const BillingPayment({
    required this.id,
    required this.status,
    required this.planCode,
    required this.interval,
    required this.method,
    required this.amountDzd,
    required this.currency,
    this.proofUrl,
    this.notes,
    this.createdAt,
  });

  factory BillingPayment.fromJson(Map<String, dynamic> json) {
    return BillingPayment(
      id: json['id']?.toString() ?? '',
      status: json['status']?.toString() ?? 'PENDING',
      planCode: json['planCode']?.toString() ?? '',
      interval: json['interval']?.toString() ?? 'month',
      method: json['method']?.toString() ?? '',
      amountDzd: int.tryParse(json['amountDzd']?.toString() ?? '0') ?? 0,
      currency: json['currency']?.toString() ?? 'DA',
      proofUrl: json['proofUrl']?.toString(),
      notes: json['notes']?.toString(),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? ''),
    );
  }
}

class Invoice {
  final String id;
  final double amount;
  final String status;
  final DateTime? dueDate;
  final String? pdfUrl;

  const Invoice({
    required this.id,
    required this.amount,
    required this.status,
    this.dueDate,
    this.pdfUrl,
  });

  factory Invoice.fromJson(Map<String, dynamic> json) {
    return Invoice(
      id: json['id']?.toString() ?? '',
      amount: double.tryParse(json['amount']?.toString() ?? '0') ?? 0.0,
      status: json['status']?.toString() ?? 'PENDING',
      dueDate: DateTime.tryParse(json['dueDate']?.toString() ?? ''),
      pdfUrl: json['pdfUrl']?.toString(),
    );
  }
}
