import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import '../models/app_mode.dart';
import '../models/product.dart';
import '../providers/auth_provider.dart';
import '../repositories/category_repository.dart';
import '../repositories/product_repository.dart';

class ProductsState {
  final List<Product> products;
  final List<Category> categories;
  final bool isLoading;
  final String? error;

  ProductsState({
    this.products = const [],
    this.categories = const [],
    this.isLoading = false,
    this.error,
  });

  ProductsState copyWith({
    List<Product>? products,
    List<Category>? categories,
    bool? isLoading,
    String? error,
  }) {
    return ProductsState(
      products: products ?? this.products,
      categories: categories ?? this.categories,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class ProductsNotifier extends Notifier<ProductsState> {
  final ProductsState? _initialState;

  ProductsNotifier([this._initialState]);

  @override
  ProductsState build() {
    return _initialState ?? ProductsState();
  }

  bool get _isOfflineTenant =>
      ref.read(authProvider).mode == AppMode.offlineOnly;

  void _requireOnlineTenantFeature() {
    if (_isOfflineTenant) {
      throw Exception('This feature is not available for offline tenants.');
    }
  }

  Future<void> fetchProducts({bool forceRefresh = false}) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final apiService = ref.read(apiProvider);
      final repo = ProductRepository(apiService);
      final products = await repo.getProducts(forceRefresh: forceRefresh);

      state = state.copyWith(isLoading: false, products: products);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> fetchCategories({bool forceRefresh = false}) async {
    try {
      final apiService = ref.read(apiProvider);
      final repo = CategoryRepository(apiService);
      final categories = await repo.getCategories();

      state = state.copyWith(categories: categories);
      // Silently fail for categories or handle differently
    } catch (e) {
      // Silently fail for categories or handle differently
    }
  }

  Future<Product?> fetchProduct(String id) async {
    try {
      final apiService = ref.read(apiProvider);
      final repo = ProductRepository(apiService);
      return await repo.getProductById(id);
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return null;
    }
  }

  Future<void> createProduct(Map<String, dynamic> data) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      _requireOnlineTenantFeature();
      final apiService = ref.read(apiProvider);
      await apiService.client.post('/admin/products', data: data);
      await fetchProducts(); // Refresh list
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> updateProduct(String id, Map<String, dynamic> data) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      _requireOnlineTenantFeature();
      final apiService = ref.read(apiProvider);
      await apiService.client.put('/admin/products/$id', data: data);
      await fetchProducts(); // Refresh list
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> deleteProduct(String id) async {
    try {
      _requireOnlineTenantFeature();
      final apiService = ref.read(apiProvider);
      await apiService.client.delete('/admin/products/$id');

      // Remove from local state
      final updatedProducts = state.products.where((p) => p.id != id).toList();
      state = state.copyWith(products: updatedProducts);
    } catch (e) {
      throw Exception('Failed to delete product: $e');
    }
  }

  // --- Options Management ---

  Future<void> createOption(String productId, Map<String, dynamic> data) async {
    try {
      _requireOnlineTenantFeature();
      final apiService = ref.read(apiProvider);
      await apiService.client.post(
        '/admin/products/$productId/options',
        data: data,
      );
      await fetchProduct(productId); // Refresh product to get new options
    } catch (e) {
      throw Exception('Failed to create option: $e');
    }
  }

  Future<void> updateOption(
    String productId,
    String optionId,
    Map<String, dynamic> data,
  ) async {
    try {
      _requireOnlineTenantFeature();
      final apiService = ref.read(apiProvider);
      await apiService.client.put(
        '/admin/products/$productId/options/$optionId',
        data: data,
      );
      await fetchProduct(productId);
    } catch (e) {
      throw Exception('Failed to update option: $e');
    }
  }

  Future<void> deleteOption(String productId, String optionId) async {
    try {
      _requireOnlineTenantFeature();
      final apiService = ref.read(apiProvider);
      await apiService.client.delete(
        '/admin/products/$productId/options/$optionId',
      );
      await fetchProduct(productId);
    } catch (e) {
      throw Exception('Failed to delete option: $e');
    }
  }

  Future<void> addOptionValue(
    String productId,
    String optionId,
    String label,
  ) async {
    try {
      _requireOnlineTenantFeature();
      final apiService = ref.read(apiProvider);
      await apiService.client.post(
        '/admin/products/$productId/options/$optionId/values',
        data: {'label': label},
      );
      await fetchProduct(productId);
    } catch (e) {
      throw Exception('Failed to add option value: $e');
    }
  }

  Future<void> deleteOptionValue(
    String productId,
    String optionId,
    String valueId,
  ) async {
    try {
      _requireOnlineTenantFeature();
      final apiService = ref.read(apiProvider);
      await apiService.client.delete(
        '/admin/products/$productId/options/$optionId/values/$valueId',
      );
      await fetchProduct(productId);
    } catch (e) {
      throw Exception('Failed to delete option value: $e');
    }
  }

  Future<void> updateOptionValue(
    String productId,
    String optionId,
    String valueId,
    Map<String, dynamic> data,
  ) async {
    try {
      _requireOnlineTenantFeature();
      final apiService = ref.read(apiProvider);
      await apiService.client.put(
        '/admin/products/$productId/options/$optionId/values/$valueId',
        data: data,
      );
      await fetchProduct(productId);
    } catch (e) {
      throw Exception('Failed to update option value: $e');
    }
  }

  // --- Variant Management ---

  Future<void> updateVariant(
    String variantId,
    Map<String, dynamic> data,
  ) async {
    try {
      _requireOnlineTenantFeature();
      final apiService = ref.read(apiProvider);
      await apiService.client.put('/admin/variants/$variantId', data: data);
      // Note: We might need to refresh the product here, but usually updating a variant relies on the caller refetching if needed.
      // However, for consistency, if we had the productId we could refresh.
      // For now, let the caller handle refresh if critical.
    } catch (e) {
      // Try catching the error and rethrowing with message
      rethrow;
    }
  }

  Future<void> lockVariantSku(String variantId) async {
    try {
      _requireOnlineTenantFeature();
      final apiService = ref.read(apiProvider);
      await apiService.client.post('/admin/variants/$variantId/sku/lock');
    } catch (e) {
      rethrow;
    }
  }

  Future<String> suggestVariantSku(String variantId) async {
    try {
      _requireOnlineTenantFeature();
      final apiService = ref.read(apiProvider);
      final res = await apiService.client.get(
        '/admin/variants/$variantId/sku/suggest',
      );
      final sku = res.data?['sku']?.toString() ?? '';
      return sku;
    } catch (e) {
      rethrow;
    }
  }

  Future<void> updateVariantInventory(
    String variantId,
    Map<String, dynamic> data,
  ) async {
    try {
      _requireOnlineTenantFeature();
      final apiService = ref.read(apiProvider);
      await apiService.client.patch(
        '/admin/inventory/variants/$variantId',
        data: {...data, 'reason': 'admin_product_variants_flutter'},
      );
    } catch (e) {
      rethrow;
    }
  }

  Future<void> updateVariantImages(
    String variantId,
    List<String> imageUrls,
  ) async {
    try {
      _requireOnlineTenantFeature();
      final apiService = ref.read(apiProvider);
      await apiService.client.post(
        '/admin/variants/$variantId/images',
        data: {'imageUrls': imageUrls},
      );
    } catch (e) {
      rethrow;
    }
  }
}

final productsProvider = NotifierProvider<ProductsNotifier, ProductsState>(
  ProductsNotifier.new,
);
