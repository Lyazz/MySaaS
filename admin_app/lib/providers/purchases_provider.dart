import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import '../models/purchase.dart';
import '../repositories/purchase_repository.dart';

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
      final repo = PurchaseRepository(apiService);

      final purchases = await repo.getPurchases(
        startDate: startDate,
        endDate: endDate,
      );
      state = state.copyWith(isLoading: false, purchases: purchases);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<Purchase?> fetchPurchase(String id) async {
    try {
      final apiService = ref.read(apiProvider);
      final repo = PurchaseRepository(apiService);

      final purchase = await repo.getPurchase(id);
      if (purchase == null) return null;

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
      final repo = PurchaseRepository(apiService);

      final newPurchase = await repo.createDraftPurchase(
        supplierId,
        supplierName,
      );

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
      final repo = PurchaseRepository(apiService);
      await repo.addPurchaseItem(purchaseId, item);
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
      final repo = PurchaseRepository(apiService);
      await repo.receiveItem(
        purchaseId,
        itemId,
        quantityReceived,
        salePriceMode: salePriceMode,
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
      final repo = PurchaseRepository(apiService);
      await repo.updatePurchaseItem(
        purchaseId,
        itemId,
        quantity: quantity,
        cost: cost,
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
      final repo = PurchaseRepository(apiService);
      await repo.removePurchaseItem(purchaseId, itemId);
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
      final repo = PurchaseRepository(apiService);
      await repo.deletePurchase(id);

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
      final repo = PurchaseRepository(apiService);
      await repo.updateStatus(id, status);
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
