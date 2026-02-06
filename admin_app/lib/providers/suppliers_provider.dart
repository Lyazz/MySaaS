import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/supplier.dart';

class SuppliersState {
  final List<Supplier> suppliers;
  final bool isLoading;
  final String? error;

  SuppliersState({
    this.suppliers = const [],
    this.isLoading = false,
    this.error,
  });

  SuppliersState copyWith({
    List<Supplier>? suppliers,
    bool? isLoading,
    String? error,
  }) {
    return SuppliersState(
      suppliers: suppliers ?? this.suppliers,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class SuppliersNotifier extends Notifier<SuppliersState> {
  @override
  SuppliersState build() {
    // Mock data
    return SuppliersState(
      suppliers: [
        Supplier(
          id: '1',
          name: 'Acme Corp',
          email: 'contact@acme.com',
          phone: '(555) 123-4567',
          address: '123 Industrial Way',
        ),
        Supplier(
          id: '2',
          name: 'Global Supplies Inc',
          email: 'sales@globalsupplies.com',
          phone: '(555) 987-6543',
          address: '456 Commerce Blvd',
        ),
      ],
    );
  }

  Future<void> fetchSuppliers() async {
    state = state.copyWith(isLoading: true, error: null);
    await Future.delayed(const Duration(milliseconds: 500));
    state = state.copyWith(isLoading: false);
  }

  Future<Supplier?> fetchSupplier(String id) async {
    await Future.delayed(const Duration(milliseconds: 300));
    try {
      return state.suppliers.firstWhere((s) => s.id == id);
    } catch (_) {
      return null;
    }
  }

  Future<void> addSupplier(Supplier supplier) async {
    state = state.copyWith(isLoading: true, error: null);
    await Future.delayed(const Duration(milliseconds: 500));
    final newSupplier = Supplier(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      notes: supplier.notes,
    );
    state = state.copyWith(
      isLoading: false,
      suppliers: [...state.suppliers, newSupplier],
    );
  }

  Future<void> updateSupplier(Supplier supplier) async {
    state = state.copyWith(isLoading: true, error: null);
    await Future.delayed(const Duration(milliseconds: 500));
    final updatedSuppliers = state.suppliers.map((s) {
      if (s.id == supplier.id) {
        return supplier;
      }
      return s;
    }).toList();
    state = state.copyWith(isLoading: false, suppliers: updatedSuppliers);
  }

  Future<void> deleteSupplier(String id) async {
    state = state.copyWith(isLoading: true, error: null);
    await Future.delayed(const Duration(milliseconds: 500));
    final updatedSuppliers = state.suppliers.where((s) => s.id != id).toList();
    state = state.copyWith(isLoading: false, suppliers: updatedSuppliers);
  }
}

final suppliersProvider = NotifierProvider<SuppliersNotifier, SuppliersState>(
  SuppliersNotifier.new,
);
