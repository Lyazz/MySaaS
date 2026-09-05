import '../models/billing_models.dart';
import '../services/api_service.dart';

class BillingRepository {
  final ApiService _apiService;

  BillingRepository(this._apiService);

  Future<List<SubscriptionPlan>> listPlans() async {
    final res = await _apiService.client.get('/admin/billing/plans');
    final data = res.data is Map
        ? Map<String, dynamic>.from(res.data)
        : const {};
    final rawPlans = data['plans'] is List ? data['plans'] as List : const [];
    return rawPlans
        .whereType<Map>()
        .map(
          (item) => SubscriptionPlan.fromJson(Map<String, dynamic>.from(item)),
        )
        .toList();
  }

  Future<BillingSnapshot> getSnapshot() async {
    final res = await _apiService.client.get('/admin/billing/subscription');
    return BillingSnapshot.fromJson(
      res.data is Map ? Map<String, dynamic>.from(res.data) : const {},
    );
  }

  Future<List<BillingPayment>> listPayments() async {
    final res = await _apiService.client.get('/admin/billing/payments');
    final data = res.data is Map
        ? Map<String, dynamic>.from(res.data)
        : const {};
    final rawPayments = data['payments'] is List
        ? data['payments'] as List
        : const [];
    return rawPayments
        .whereType<Map>()
        .map((item) => BillingPayment.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }

  Future<BillingSnapshot> simulatePayment({
    required String planCode,
    required String interval,
  }) async {
    final res = await _apiService.client.post(
      '/admin/billing/payments/simulate',
      data: {'planCode': planCode, 'interval': interval},
    );
    return BillingSnapshot.fromJson(
      res.data is Map ? Map<String, dynamic>.from(res.data) : const {},
    );
  }

  Future<BillingPayment> submitPayment({
    required String planCode,
    required String interval,
    required String method,
    required int amountDzd,
    String? notes,
  }) async {
    final res = await _apiService.client.post(
      '/admin/billing/payments/submit',
      data: {
        'planCode': planCode,
        'interval': interval,
        'method': method,
        'amountDzd': amountDzd,
        if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
      },
    );
    return BillingPayment.fromJson(
      res.data is Map ? Map<String, dynamic>.from(res.data) : const {},
    );
  }
}
