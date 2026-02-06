import 'package:flutter_riverpod/flutter_riverpod.dart';
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
    return PurchasesState(
      purchases: [
        Purchase(
          id: 'PUR-8001',
          supplierId: '1',
          supplierName: 'Acme Corp',
          totalAmount: 1500.00,
          status: 'COMPLETED',
          createdAt: DateTime.now().subtract(const Duration(days: 3)),
          notes: 'Initial stock order',
        ),
        Purchase(
          id: 'PUR-8002',
          supplierId: '2',
          supplierName: 'Global Supplies Inc',
          totalAmount: 850.00,
          status: 'PENDING',
          createdAt: DateTime.now().subtract(const Duration(hours: 5)),
        ),
      ],
    );
  }

  Future<void> fetchPurchases() async {
    state = state.copyWith(isLoading: true, error: null);
    await Future.delayed(const Duration(milliseconds: 500));
    state = state.copyWith(isLoading: false);
  }

  Future<Purchase?> fetchPurchase(String id) async {
    await Future.delayed(const Duration(milliseconds: 300));
    try {
      return state.purchases.firstWhere((p) => p.id == id);
    } catch (_) {
      return null;
    }
  }

  Future<void> addPurchase(Purchase purchase) async {
    state = state.copyWith(isLoading: true, error: null);
    await Future.delayed(const Duration(milliseconds: 500));
    final newPurchase = Purchase(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      supplierId: purchase.supplierId,
      supplierName: purchase.supplierName,
      totalAmount: purchase.totalAmount,
      status: purchase.status,
      createdAt: DateTime.now(),
      notes: purchase.notes,
    );
    state = state.copyWith(
      isLoading: false,
      purchases: [newPurchase, ...state.purchases],
    );
  }
}

final purchasesProvider = NotifierProvider<PurchasesNotifier, PurchasesState>(
  PurchasesNotifier.new,
);
