import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import '../models/product.dart';

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
  @override
  ProductsState build() {
    return ProductsState();
  }

  Future<void> fetchProducts() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final apiService = ref.read(apiProvider);
      final response = await apiService.client.get('/admin/products');

      final List<dynamic> data = response.data;
      final products = data.map((e) => Product.fromJson(e)).toList();

      state = state.copyWith(isLoading: false, products: products);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> fetchCategories() async {
    try {
      final apiService = ref.read(apiProvider);
      final response = await apiService.client.get('/admin/categories');

      final List<dynamic> data = response.data;
      final categories = data.map((e) => Category.fromJson(e)).toList();

      state = state.copyWith(categories: categories);
      // Silently fail for categories or handle differently
    } catch (e) {
      // Silently fail for categories or handle differently
    }
  }

  Future<Product?> fetchProduct(String id) async {
    try {
      final apiService = ref.read(apiProvider);
      final response = await apiService.client.get('/admin/products/$id');
      return Product.fromJson(response.data);
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return null;
    }
  }

  Future<void> createProduct(Map<String, dynamic> data) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
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

  Future<void> updateVariantInventory(
    String variantId,
    Map<String, dynamic> data,
  ) async {
    try {
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
