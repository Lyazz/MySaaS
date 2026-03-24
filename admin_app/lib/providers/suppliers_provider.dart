import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/supplier.dart';
import '../services/api_service.dart';
import '../repositories/supplier_repository.dart';

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
  final SuppliersState? _initialState;

  SuppliersNotifier([this._initialState]);

  @override
  SuppliersState build() {
    return _initialState ?? SuppliersState();
  }

  Future<void> fetchSuppliers() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final apiService = ref.read(apiProvider);
      final repo = SupplierRepository(apiService);
      final suppliers = await repo.getSuppliers();
      state = state.copyWith(isLoading: false, suppliers: suppliers);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<Supplier?> fetchSupplier(String id) async {
    // A more localized fetch if needed, right now we just grab from state or reload list
    try {
      final existing = state.suppliers.where((s) => s.id == id).firstOrNull;
      if (existing != null) return existing;

      await fetchSuppliers();
      return state.suppliers.where((s) => s.id == id).firstOrNull;
    } catch (e) {
      return null;
    }
  }

  Future<void> addSupplier(Supplier supplier) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final apiService = ref.read(apiProvider);
      final repo = SupplierRepository(apiService);
      await repo.createSupplier(supplier);
      await fetchSuppliers();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> updateSupplier(Supplier supplier) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final apiService = ref.read(apiProvider);
      final repo = SupplierRepository(apiService);
      await repo.updateSupplier(supplier);
      await fetchSuppliers();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> deleteSupplier(String id) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final apiService = ref.read(apiProvider);
      final repo = SupplierRepository(apiService);
      await repo.deleteSupplier(id);

      final updatedSuppliers = state.suppliers
          .where((s) => s.id != id)
          .toList();
      state = state.copyWith(isLoading: false, suppliers: updatedSuppliers);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }
}

final suppliersProvider = NotifierProvider<SuppliersNotifier, SuppliersState>(
  SuppliersNotifier.new,
);
