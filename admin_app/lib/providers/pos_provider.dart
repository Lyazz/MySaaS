import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/pos_models.dart';
import '../models/customer.dart';
import '../models/product.dart';
import '../services/api_service.dart';
import './auth_provider.dart';

class PosState {
  static const Object _unset = Object();

  final List<Category> categories;
  final List<Product> products;
  final List<CartItem> cart;
  final bool isLoading;
  final String? selectedCustomerId;
  final Customer? selectedCustomer;
  final String? selectedCategoryId;
  final String? error;

  PosState({
    this.categories = const [],
    this.products = const [],
    this.cart = const [],
    this.isLoading = false,
    this.selectedCustomerId,
    this.selectedCustomer,
    this.selectedCategoryId,
    this.error,
  });

  double get total =>
      cart.fold(0, (sum, item) => sum + (item.price * item.quantity));

  PosState copyWith({
    List<Category>? categories,
    List<Product>? products,
    List<CartItem>? cart,
    bool? isLoading,
    Object? selectedCustomerId = _unset,
    Object? selectedCustomer = _unset,
    Object? selectedCategoryId = _unset,
    Object? error = _unset,
  }) {
    return PosState(
      categories: categories ?? this.categories,
      products: products ?? this.products,
      cart: cart ?? this.cart,
      isLoading: isLoading ?? this.isLoading,
      selectedCustomerId: identical(selectedCustomerId, _unset)
          ? this.selectedCustomerId
          : selectedCustomerId as String?,
      selectedCustomer: identical(selectedCustomer, _unset)
          ? this.selectedCustomer
          : selectedCustomer as Customer?,
      selectedCategoryId: identical(selectedCategoryId, _unset)
          ? this.selectedCategoryId
          : selectedCategoryId as String?,
      error: identical(error, _unset) ? this.error : error as String?,
    );
  }
}

class PosNotifier extends Notifier<PosState> {
  final Map<String, Product> _productDetailsCache = {};

  @override
  PosState build() {
    final token = ref.watch(authProvider.select((s) => s.token));
    if (token != null) {
      fetchCategories();
      fetchProducts();
    }
    return PosState();
  }

  Future<void> fetchCategories() async {
    try {
      final apiService = ref.read(apiProvider);
      final response = await apiService.client.get('/admin/categories');

      final List<dynamic> data = response.data;
      final categories = data.map((e) => Category.fromJson(e)).toList();

      state = state.copyWith(categories: categories);
    } catch (e) {
      state = state.copyWith(error: 'Failed to load categories: $e');
    }
  }

  Future<void> fetchProducts() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final apiService = ref.read(apiProvider);
      final response = await apiService.client.get('/admin/products');

      final List<dynamic> data = response.data;
      final products = data
          .map((e) => Product.fromJson(e))
          .where(
            (p) =>
                p.isActive,
          )
          .toList();

      state = state.copyWith(products: products, isLoading: false);
    } catch (e) {
      state = state.copyWith(
        error: 'Failed to load products: $e',
        isLoading: false,
      );
    }
  }

  Future<Product?> fetchProductDetails(String productId) async {
    final cached = _productDetailsCache[productId];
    if (cached != null) return cached;

    try {
      final apiService = ref.read(apiProvider);
      final response = await apiService.client.get('/admin/products/$productId');
      final product = Product.fromJson(Map<String, dynamic>.from(response.data));
      _productDetailsCache[productId] = product;
      return product;
    } catch (e) {
      state = state.copyWith(error: 'Failed to load product details: $e');
      return null;
    }
  }

  void selectCategory(String? categoryId) {
    state = state.copyWith(selectedCategoryId: categoryId, error: null);
    if (categoryId != null && state.products.isEmpty && !state.isLoading) {
      fetchProducts();
    }
  }

  void selectCustomer(Customer? customer) {
    state = state.copyWith(
      selectedCustomer: customer,
      selectedCustomerId: customer?.id,
    );
  }

  void addToCart(Product product, {ProductVariant? variant}) {
    final existingIndex = state.cart.indexWhere(
      (item) =>
          item.productId == product.id && item.variantId == (variant?.id),
    );
    if (existingIndex >= 0) {
      final existingItem = state.cart[existingIndex];
      final updatedItem = existingItem.copyWith(
        quantity: existingItem.quantity + 1,
      );
      final newCart = [...state.cart];
      newCart[existingIndex] = updatedItem;
      state = state.copyWith(cart: newCart);
    } else {
      final newItem = CartItem(
        productId: product.id,
        variantId: variant?.id,
        name: product.title,
        variantTitle:
            variant == null || variant.title == 'Default' ? null : variant.title,
        price: variant?.price ?? product.price,
      );
      state = state.copyWith(cart: [...state.cart, newItem]);
    }
  }

  void updateQuantity(String productId, String? variantId, int quantity) {
    if (quantity <= 0) {
      removeFromCart(productId, variantId);
      return;
    }
    final newCart = state.cart.map((item) {
      if (item.productId == productId && item.variantId == variantId) {
        return item.copyWith(quantity: quantity);
      }
      return item;
    }).toList();
    state = state.copyWith(cart: newCart);
  }

  void removeFromCart(String productId, String? variantId) {
    final newCart = state.cart
        .where(
          (item) => !(item.productId == productId && item.variantId == variantId),
        )
        .toList();
    state = state.copyWith(cart: newCart);
  }

  void clearCart() {
    state = state.copyWith(cart: []);
  }

  Future<void> checkout() async {
    if (state.cart.isEmpty) return;

    state = state.copyWith(isLoading: true);
    try {
      final apiService = ref.read(apiProvider);

      final payload = {
        'items': state.cart
            .map(
              (item) => {
                'productId': item.productId,
                'variantId': item.variantId,
                'quantity': item.quantity,
              },
            )
            .toList(),
        'customerId': state.selectedCustomerId,
      };

      await apiService.client.post('/admin/pos/sales', data: payload);

      state = state.copyWith(
        isLoading: false,
        cart: [],
        selectedCustomer: null,
        selectedCustomerId: null,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to create sale: $e',
      );
    }
  }
}

final posProvider = NotifierProvider<PosNotifier, PosState>(PosNotifier.new);
