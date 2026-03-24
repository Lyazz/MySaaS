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

class Invoice {
  final String id;
  final double amount;
  final String status;
  final DateTime? dueDate;
  final String? pdfUrl;

  Invoice({
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
      dueDate: json['dueDate'] != null
          ? DateTime.tryParse(json['dueDate'])
          : null,
      pdfUrl: json['pdfUrl']?.toString(),
    );
  }
}
