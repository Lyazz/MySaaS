import 'customer.dart';
import 'customer_payment.dart';
import 'customer_sale.dart';

class CustomerDetail {
  final Customer? summary;
  final List<CustomerSale> sales;
  final List<CustomerPayment> payments;

  CustomerDetail({
    required this.summary,
    required this.sales,
    required this.payments,
  });

  factory CustomerDetail.fromJson(Map<String, dynamic> json) {
    final summaryRaw = json['summary'];
    final summary = summaryRaw is Map
        ? Customer.fromJson(summaryRaw.cast<String, dynamic>())
        : null;

    final salesRaw = json['sales'];
    final sales = (salesRaw is List)
        ? salesRaw
              .whereType<Map>()
              .map((e) => CustomerSale.fromJson(e.cast<String, dynamic>()))
              .toList()
        : <CustomerSale>[];

    final paymentsRaw = json['payments'];
    final payments = (paymentsRaw is List)
        ? paymentsRaw
              .whereType<Map>()
              .map((e) => CustomerPayment.fromJson(e.cast<String, dynamic>()))
              .toList()
        : <CustomerPayment>[];

    return CustomerDetail(summary: summary, sales: sales, payments: payments);
  }
}
