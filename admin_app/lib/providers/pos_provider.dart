import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/pos_models.dart';
import '../models/customer.dart';
import '../models/product.dart';
import '../services/api_service.dart';

enum ProductSortType { name, priceAsc, priceDesc, recent }

class PosSession {
  final List<CartItem> cart;
  final String? selectedCustomerId;
  final Customer? selectedCustomer;

  const PosSession({
    this.cart = const [],
    this.selectedCustomerId,
    this.selectedCustomer,
  });

  double get total =>
      cart.fold(0, (sum, item) => sum + (item.price * item.quantity));

  PosSession copyWith({
    List<CartItem>? cart,
    String? selectedCustomerId,
    Customer? selectedCustomer,
    bool clearCustomer = false,
  }) {
    return PosSession(
      cart: cart ?? this.cart,
      selectedCustomerId: clearCustomer
          ? null
          : (selectedCustomerId ?? this.selectedCustomerId),
      selectedCustomer: clearCustomer
          ? null
          : (selectedCustomer ?? this.selectedCustomer),
    );
  }
}

class PosState {
  static const Object _unset = Object();

  final List<Category> categories;
  final List<Product> products;
  final bool isLoading;
  final String? error;

  // Multi-session support
  final List<PosSession> sessions;
  final int currentSessionIndex;

  // View modes
  final bool isProductListView;
  final bool isCartSimpleView;
  final int crossAxisCount; // Dynamic grid columns
  final String? selectedCategoryId;
  final ProductSortType sortType; // Product sorting
  final String? debugInfo; // Debugging field

  // Helper getters for active session
  PosSession get currentSession => sessions[currentSessionIndex];
  List<CartItem> get cart => currentSession.cart;
  double get total => currentSession.total;
  Customer? get selectedCustomer => currentSession.selectedCustomer;
  String? get selectedCustomerId => currentSession.selectedCustomerId;

  PosState({
    this.categories = const [],
    this.products = const [],
    this.isLoading = false,
    this.error,
    this.sessions = const [PosSession(), PosSession(), PosSession()],
    this.currentSessionIndex = 0,
    this.isProductListView = false,
    this.isCartSimpleView = false,
    this.crossAxisCount = 4, // Default to 4 columns
    this.selectedCategoryId,
    this.sortType = ProductSortType.name, // Default to name sort
    this.debugInfo,
  }) {
    // print('Debug: PosState created. Products: ${products.length}');
  }

  PosState copyWith({
    List<Category>? categories,
    List<Product>? products,
    bool? isLoading,
    Object? error = _unset,
    List<PosSession>? sessions,
    int? currentSessionIndex,
    bool? isProductListView,
    bool? isCartSimpleView,
    int? crossAxisCount,
    ProductSortType? sortType,
    Object? selectedCategoryId = _unset,
    String? debugInfo,
  }) {
    return PosState(
      categories: categories ?? this.categories,
      products: products ?? this.products,
      isLoading: isLoading ?? this.isLoading,
      error: identical(error, _unset) ? this.error : error as String?,
      sessions: sessions ?? this.sessions,
      currentSessionIndex: currentSessionIndex ?? this.currentSessionIndex,
      isProductListView: isProductListView ?? this.isProductListView,
      isCartSimpleView: isCartSimpleView ?? this.isCartSimpleView,
      crossAxisCount: crossAxisCount ?? this.crossAxisCount,
      sortType: sortType ?? this.sortType,
      selectedCategoryId: identical(selectedCategoryId, _unset)
          ? this.selectedCategoryId
          : selectedCategoryId as String?,
      debugInfo: debugInfo ?? this.debugInfo,
    );
  }
}

class PosNotifier extends Notifier<PosState> {
  final Map<String, Product> _productDetailsCache = {};

  @override
  PosState build() {
    // print('Debug: PosNotifier.build() called');
    // We rely on the UI to trigger active fetching (PosScreen.initState)
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
    print('Debug: fetchProducts called');
    state = state.copyWith(isLoading: true, error: null);
    try {
      final apiService = ref.read(apiProvider);
      print('Debug: making API call to /admin/products');
      final response = await apiService.client.get('/admin/products');

      print('Debug: API Response status: ${response.statusCode}');
      final List<dynamic> data = response.data;
      print('Debug: API Data length: ${data.length}');

      final products = data
          .map((e) => Product.fromJson(e))
          // .where((p) => p.isActive) // Temporarily disabled for debugging
          .toList();

      print('Debug: Parsed products count: ${products.length}');

      state = state.copyWith(
        products: products,
        isLoading: false,
        debugInfo:
            'Success. API returned ${data.length} items. Parsed ${products.length} products.',
      );
      print(
        'Debug: State updated with products. Count: ${state.products.length}',
      );
    } catch (e, stack) {
      print('Debug: Error fetching products: $e');
      print(stack);
      state = state.copyWith(
        error: 'Failed to load products: $e',
        isLoading: false,
        debugInfo: 'Error caught: $e',
      );
    }
  }

  Future<Product?> fetchProductDetails(String productId) async {
    final cached = _productDetailsCache[productId];
    if (cached != null) return cached;

    try {
      final apiService = ref.read(apiProvider);
      final response = await apiService.client.get(
        '/admin/products/$productId',
      );
      final product = Product.fromJson(
        Map<String, dynamic>.from(response.data),
      );
      _productDetailsCache[productId] = product;
      return product;
    } catch (e) {
      state = state.copyWith(error: 'Failed to load product details: $e');
      return null;
    }
  }

  void switchSession(int index) {
    if (index >= 0 && index < state.sessions.length) {
      state = state.copyWith(currentSessionIndex: index);
    }
  }

  void toggleProductView() {
    state = state.copyWith(isProductListView: !state.isProductListView);
  }

  void toggleCartView() {
    state = state.copyWith(isCartSimpleView: !state.isCartSimpleView);
    saveSettings();
  }

  void setCrossAxisCount(int count) {
    if (count >= 2 && count <= 8) {
      state = state.copyWith(crossAxisCount: count);
      saveSettings();
    }
  }

  void selectCategory(String? categoryId) {
    state = state.copyWith(selectedCategoryId: categoryId, error: null);
  }

  void _updateCurrentSession(PosSession newSession) {
    final newSessions = [...state.sessions];
    newSessions[state.currentSessionIndex] = newSession;
    state = state.copyWith(sessions: newSessions);
  }

  void selectCustomer(Customer? customer) {
    final current = state.currentSession;
    _updateCurrentSession(
      current.copyWith(
        selectedCustomer: customer,
        selectedCustomerId: customer?.id,
        clearCustomer: customer == null,
      ),
    );
  }

  void addToCart(
    Product product, {
    ProductVariant? variant,
    int quantity = 1,
    double? customPrice,
  }) {
    final current = state.currentSession;
    final price = customPrice ?? (variant?.price ?? product.price);

    final existingIndex = current.cart.indexWhere(
      (item) =>
          item.productId == product.id &&
          item.variantId == (variant?.id) &&
          item.price == price,
    );

    List<CartItem> newCart;
    if (existingIndex >= 0) {
      final existingItem = current.cart[existingIndex];
      final updatedItem = existingItem.copyWith(
        quantity: existingItem.quantity + quantity,
      );
      newCart = [...current.cart];
      newCart[existingIndex] = updatedItem;
    } else {
      final newItem = CartItem(
        productId: product.id,
        variantId: variant?.id,
        name: product.title,
        variantTitle: variant == null || variant.title == 'Default'
            ? null
            : variant.title,
        price: price,
        quantity: quantity,
        imageUrl: product.images.isNotEmpty ? product.images.first : null,
      );
      newCart = [...current.cart, newItem];
    }
    _updateCurrentSession(current.copyWith(cart: newCart));
  }

  void addCustomItem({
    required String name,
    required double price,
    int quantity = 1,
  }) {
    final current = state.currentSession;
    final newItem = CartItem(
      productId: 'custom_${DateTime.now().millisecondsSinceEpoch}',
      variantId: null,
      name: name,
      variantTitle: null,
      price: price,
      quantity: quantity,
      imageUrl: null,
    );
    _updateCurrentSession(current.copyWith(cart: [...current.cart, newItem]));
  }

  void updateQuantity(String productId, String? variantId, int quantity) {
    if (quantity <= 0) {
      removeFromCart(productId, variantId);
      return;
    }
    final current = state.currentSession;
    final newCart = current.cart.map((item) {
      if (item.productId == productId && item.variantId == variantId) {
        return item.copyWith(quantity: quantity);
      }
      return item;
    }).toList();
    _updateCurrentSession(current.copyWith(cart: newCart));
  }

  void updateQuantityAtIndex(int index, int quantity) {
    if (index < 0 || index >= state.cart.length) return;
    if (quantity <= 0) {
      // Remove item at index
      final current = state.currentSession;
      final newCart = [...current.cart]..removeAt(index);
      _updateCurrentSession(current.copyWith(cart: newCart));
      return;
    }

    final current = state.currentSession;
    final item = current.cart[index];
    final newCart = [...current.cart];
    newCart[index] = item.copyWith(quantity: quantity);
    _updateCurrentSession(current.copyWith(cart: newCart));
  }

  void removeFromCart(String productId, String? variantId) {
    final current = state.currentSession;
    final newCart = current.cart
        .where(
          (item) =>
              !(item.productId == productId && item.variantId == variantId),
        )
        .toList();
    _updateCurrentSession(current.copyWith(cart: newCart));
  }

  void clearCart() {
    final current = state.currentSession;
    _updateCurrentSession(current.copyWith(cart: []));
  }

  Future<void> checkout() async {
    if (state.cart.isEmpty) return;

    state = state.copyWith(isLoading: true);
    try {
      final apiService = ref.read(apiProvider);
      final current = state.currentSession;

      final payload = {
        'items': current.cart
            .map(
              (item) => {
                'productId': item.productId,
                'variantId': item.variantId,
                'quantity': item.quantity,
                'price': item.price,
              },
            )
            .toList(),
        'customerId': current.selectedCustomerId,
      };

      await apiService.client.post('/admin/pos/sales', data: payload);

      // Clear the current session after successful checkout
      _updateCurrentSession(PosSession());

      state = state.copyWith(isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to create sale: $e',
      );
    }
  }

  // Persistence methods
  Future<void> loadSettings() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // Load sort type
      final sortTypeIndex = prefs.getInt('pos_sort_type');
      final sortType = sortTypeIndex != null
          ? ProductSortType.values[sortTypeIndex]
          : ProductSortType.name;

      // Load grid density
      final crossAxisCount = prefs.getInt('pos_cross_axis_count') ?? 4;

      // Load cart view preference
      final isCartSimpleView =
          prefs.getBool('pos_is_cart_simple_view') ?? false;

      state = state.copyWith(
        sortType: sortType,
        crossAxisCount: crossAxisCount,
        isCartSimpleView: isCartSimpleView,
      );
    } catch (e) {
      print('Error loading POS settings: $e');
    }
  }

  Future<void> saveSettings() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt('pos_sort_type', state.sortType.index);
      await prefs.setInt('pos_cross_axis_count', state.crossAxisCount);
      await prefs.setBool('pos_is_cart_simple_view', state.isCartSimpleView);
    } catch (e) {
      print('Error saving POS settings: $e');
    }
  }

  void setSortType(ProductSortType sortType) {
    state = state.copyWith(sortType: sortType);
    saveSettings();
  }

  // Sorted products getter
  List<Product> get sortedProducts {
    final products = [...state.products];
    switch (state.sortType) {
      case ProductSortType.name:
        products.sort(
          (a, b) => a.title.toLowerCase().compareTo(b.title.toLowerCase()),
        );
      case ProductSortType.priceAsc:
        products.sort((a, b) => a.price.compareTo(b.price));
      case ProductSortType.priceDesc:
        products.sort((a, b) => b.price.compareTo(a.price));
      case ProductSortType.recent:
        // Sort by ID descending (assuming higher ID = more recent)
        products.sort((a, b) => b.id.compareTo(a.id));
    }
    return products;
  }
}

final posProvider = NotifierProvider<PosNotifier, PosState>(PosNotifier.new);
