import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/customer.dart';
import '../models/order.dart';

class CustomersState {
  final List<Customer> customers;
  final bool isLoading;
  final String? error;

  CustomersState({
    this.customers = const [],
    this.isLoading = false,
    this.error,
  });

  CustomersState copyWith({
    List<Customer>? customers,
    bool? isLoading,
    String? error,
  }) {
    return CustomersState(
      customers: customers ?? this.customers,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class CustomersNotifier extends Notifier<CustomersState> {
  @override
  CustomersState build() {
    return CustomersState(
      customers: [
        Customer(
          id: '1',
          name: 'Alice Johnson',
          phone: '(555) 123-4567',
          address: '123 Maple St, Springfield',
          ordersCount: 5,
          totalSpent: 450.00,
          lastOrderAt: DateTime.now().subtract(const Duration(days: 2)),
        ),
        Customer(
          id: '2',
          name: 'Bob Smith',
          phone: '(555) 987-6543',
          address: '456 Oak Ln, Springfield',
          ordersCount: 2,
          totalSpent: 120.50,
          lastOrderAt: DateTime.now().subtract(const Duration(days: 10)),
        ),
        Customer(
          id: '3',
          name: 'Charlie Davis',
          phone: '(555) 555-5555',
          ordersCount: 0,
          totalSpent: 0.00,
        ),
      ],
    );
  }

  Future<void> fetchCustomers() async {
    state = state.copyWith(isLoading: true, error: null);
    await Future.delayed(const Duration(milliseconds: 500));
    // In a real app, we would make an API call here
    state = state.copyWith(isLoading: false);
  }

  Future<Customer?> fetchCustomer(String id) async {
    // Simulate network delay
    await Future.delayed(const Duration(milliseconds: 300));
    try {
      return state.customers.firstWhere((c) => c.id == id);
    } catch (_) {
      return null;
    }
  }

  Future<List<Order>> fetchCustomerOrders(String customerId) async {
    await Future.delayed(const Duration(milliseconds: 300));
    // Mock orders for the customer
    return [
      Order(
        id: 'ORD-1001',
        customerName: 'Mock Customer',
        customerPhone: '',
        customerAddress: '',
        totalAmount: 150.00,
        status: 'COMPLETED',
        createdAt: DateTime.now().subtract(const Duration(days: 2)),
        items: [],
      ),
      Order(
        id: 'ORD-1002',
        customerName: 'Mock Customer',
        customerPhone: '',
        customerAddress: '',
        totalAmount: 75.50,
        status: 'SHIPPED',
        createdAt: DateTime.now().subtract(const Duration(days: 5)),
        items: [],
      ),
    ];
  }
}

final customersProvider = NotifierProvider<CustomersNotifier, CustomersState>(
  CustomersNotifier.new,
);
