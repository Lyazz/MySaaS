import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import '../models/purchase.dart';

class PurchasesState {
  final List<Purchase> purchases;
  final bool isLoading;
  final String? error;

  PurchasesState({
    this.purchases = const [],
    this.isLoading = false,
    this.error,
  });

  PurchasesState copyWith({
    List<Purchase>? purchases,
    bool? isLoading,
    String? error,
  }) {
    return PurchasesState(
      purchases: purchases ?? this.purchases,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class PurchasesNotifier extends Notifier<PurchasesState> {
  @override
  PurchasesState build() {
    return PurchasesState();
  }

  Future<void> fetchPurchases({DateTime? startDate, DateTime? endDate}) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final apiService = ref.read(apiProvider);
      final queryParams = <String, dynamic>{};
      if (startDate != null) {
        queryParams['startDate'] = startDate.toIso8601String();
      }
      if (endDate != null) {
        queryParams['endDate'] = endDate.toIso8601String();
      }

      final response = await apiService.client.get(
        '/admin/purchases',
        queryParameters: queryParams,
      );
      final List<dynamic> data = response.data;
      final purchases = data.map((e) => Purchase.fromJson(e)).toList();
      state = state.copyWith(isLoading: false, purchases: purchases);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<Purchase?> fetchPurchase(String id) async {
    // Check if we already have it in state
    final existing = state.purchases.where((p) => p.id == id).firstOrNull;
    if (existing != null && existing.items.isNotEmpty) {
      // If we have items, it might be detailed enough, but let's refresh to be safe
      // or duplicate return for immediate UI then fetch background
    }

    try {
      final apiService = ref.read(apiProvider);
      final response = await apiService.client.get('/admin/purchases/$id');
      final purchase = Purchase.fromJson(response.data);

      // Update local state by replacing the purchase or adding it
      final updatedPurchases = [
        for (final p in state.purchases)
          if (p.id == id) purchase else p,
      ];
      if (!updatedPurchases.any((p) => p.id == id)) {
        updatedPurchases.add(purchase);
      }

      state = state.copyWith(purchases: updatedPurchases);
      return purchase;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return null;
    }
  }

  Future<Purchase> createDraftPurchase(
    String supplierId,
    String supplierName,
  ) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final apiService = ref.read(apiProvider);
      // We send supplierId. The backend should handle creating the draft.
      // supplierName is passed to this method because the UI has it,
      // but the backend likely looks it up or stores it.
      final response = await apiService.client.post(
        '/admin/purchases',
        data: {'supplierId': supplierId},
      );

      final newPurchase = Purchase.fromJson(response.data);
      state = state.copyWith(
        isLoading: false,
        purchases: [newPurchase, ...state.purchases],
      );
      return newPurchase;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> addPurchaseItem(String purchaseId, PurchaseItem item) async {
    try {
      final apiService = ref.read(apiProvider);
      await apiService.client.post(
        '/admin/purchases/$purchaseId/items',
        data: {
          'variantId': item
              .productId, // Using productId as variantId based on model update
          'quantityOrdered': item.quantityOrdered,
          'unitCost': item.unitCost,
        },
      );
      // Refresh the purchase to get updated items and totals
      await fetchPurchase(purchaseId);
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }

  Future<void> receiveItem(
    String purchaseId,
    String itemId,
    double quantityReceived, {
    String salePriceMode = 'replace',
  }) async {
    try {
      final apiService = ref.read(apiProvider);
      await apiService.client.post(
        '/admin/purchases/$purchaseId/receive',
        data: {
          'salePriceMode': salePriceMode,
          'items': [
            {'itemId': itemId, 'quantityReceived': quantityReceived},
          ],
        },
      );
      await fetchPurchase(purchaseId);
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }

  Future<void> updatePurchaseItem(
    String purchaseId,
    String itemId, {
    double? quantity,
    double? cost,
  }) async {
    try {
      final apiService = ref.read(apiProvider);
      final data = <String, dynamic>{};
      if (quantity != null) data['quantityOrdered'] = quantity;
      if (cost != null) data['unitCost'] = cost;

      await apiService.client.put(
        '/admin/purchases/$purchaseId/items/$itemId',
        data: data,
      );
      await fetchPurchase(purchaseId);
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }

  Future<void> removePurchaseItem(String purchaseId, String itemId) async {
    try {
      final apiService = ref.read(apiProvider);
      await apiService.client.delete(
        '/admin/purchases/$purchaseId/items/$itemId',
      );
      await fetchPurchase(purchaseId);
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }

  Future<void> deletePurchase(String id) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final apiService = ref.read(apiProvider);
      await apiService.client.delete('/admin/purchases/$id');

      final updatedPurchases = state.purchases
          .where((p) => p.id != id)
          .toList();
      state = state.copyWith(isLoading: false, purchases: updatedPurchases);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> updateStatus(String id, String status) async {
    try {
      final apiService = ref.read(apiProvider);
      await apiService.client.patch(
        '/admin/purchases/$id/status',
        data: {'status': status},
      );
      await fetchPurchase(id);
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }
}

final purchasesProvider = NotifierProvider<PurchasesNotifier, PurchasesState>(
  PurchasesNotifier.new,
);
