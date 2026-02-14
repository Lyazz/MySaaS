import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/supplier.dart';
import '../services/api_service.dart';

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
    return SuppliersState();
  }

  Future<void> fetchSuppliers() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final apiService = ref.read(apiProvider);
      final response = await apiService.client.get('/admin/suppliers');
      final List<dynamic> data = response.data;
      final suppliers = data.map((e) => Supplier.fromJson(e)).toList();
      state = state.copyWith(isLoading: false, suppliers: suppliers);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<Supplier?> fetchSupplier(String id) async {
    try {
      final apiService = ref.read(apiProvider);
      final response = await apiService.client.get('/admin/suppliers/$id');
      return Supplier.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  Future<void> addSupplier(Supplier supplier) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final apiService = ref.read(apiProvider);
      final data = supplier.toJson()..remove('id');
      await apiService.client.post('/admin/suppliers', data: data);
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
      await apiService.client.put(
        '/admin/suppliers/${supplier.id}',
        data: supplier.toJson(),
      );
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
      await apiService.client.delete('/admin/suppliers/$id');
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
