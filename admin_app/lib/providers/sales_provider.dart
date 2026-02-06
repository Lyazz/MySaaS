import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/sale.dart';

class SalesState {
  final List<Sale> sales;
  final bool isLoading;
  final String? error;

  SalesState({this.sales = const [], this.isLoading = false, this.error});

  SalesState copyWith({List<Sale>? sales, bool? isLoading, String? error}) {
    return SalesState(
      sales: sales ?? this.sales,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class SalesNotifier extends Notifier<SalesState> {
  @override
  SalesState build() {
    return SalesState(
      sales: [
        Sale(
          id: 'ORD-5001',
          customerName: 'John Doe',
          customerPhone: '(555) 111-2222',
          totalAmount: 120.00,
          status: 'DELIVERED',
          updatedAt: DateTime.now().subtract(const Duration(hours: 2)),
          type: 'ORDER',
        ),
        Sale(
          id: 'POS-1001',
          customerName: 'Walk-in Customer',
          customerPhone: '',
          totalAmount: 45.50,
          status: 'COMPLETED',
          updatedAt: DateTime.now().subtract(const Duration(hours: 4)),
          type: 'POS',
        ),
        Sale(
          id: 'ORD-5002',
          customerName: 'Jane Smith',
          customerPhone: '(555) 333-4444',
          totalAmount: 250.00,
          status: 'SHIPPED',
          updatedAt: DateTime.now().subtract(const Duration(days: 1)),
          type: 'ORDER',
        ),
      ],
    );
  }

  Future<void> fetchSales() async {
    state = state.copyWith(isLoading: true, error: null);
    await Future.delayed(const Duration(milliseconds: 500));
    state = state.copyWith(isLoading: false);
  }
}

final salesProvider = NotifierProvider<SalesNotifier, SalesState>(
  SalesNotifier.new,
);
