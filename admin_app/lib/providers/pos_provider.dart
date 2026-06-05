import 'package:flutter/foundation.dart' hide Category;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/pos_models.dart';
import '../models/customer.dart';
import '../models/product.dart';
import '../services/api_service.dart';
import '../services/print_service.dart';
import '../repositories/product_repository.dart'; // NEW
import '../repositories/category_repository.dart'; // NEW
import '../repositories/pos_sale_repository.dart'; // NEW
import '../providers/printer_profiles_provider.dart'; // NEW - Assuming this path
import '../providers/store_settings_provider.dart';
import '../utils/pos_payment.dart';
import '../utils/tenant_currency.dart';
import '../services/sync_service.dart';

enum ProductSortType { name, priceAsc, priceDesc, recent }

class PosLookupItem {
  final String productId;
  final String? variantId;
  final String title;
  final String? variantLabel;
  final String? sku;
  final double price;
  final String? imageUrl;
  final bool needsVariantSelection;

  const PosLookupItem({
    required this.productId,
    required this.variantId,
    required this.title,
    required this.variantLabel,
    required this.sku,
    required this.price,
    required this.imageUrl,
    this.needsVariantSelection = false,
  });

  factory PosLookupItem.fromJson(Map<String, dynamic> json) {
    return PosLookupItem(
      productId: json['productId']?.toString() ?? '',
      variantId: json['variantId']?.toString(),
      sku: json['sku']?.toString(),
      title: json['title']?.toString() ?? '',
      variantLabel: json['variantLabel']?.toString(),
      price: (json['price'] is num) ? (json['price'] as num).toDouble() : 0.0,
      imageUrl: json['imageUrl']?.toString(),
      needsVariantSelection: json['needsVariantSelection'] == true,
    );
  }
}

class PosSession {
  final List<CartItem> cart;
  final String? selectedCustomerId;
  final Customer? selectedCustomer;
  final PosDiscount? discount;
  final int? lastInteractedItemIndex;

  const PosSession({
    this.cart = const [],
    this.selectedCustomerId,
    this.selectedCustomer,
    this.discount,
    this.lastInteractedItemIndex,
  });

  double get subtotal =>
      cart.fold(0, (sum, item) => sum + (item.price * item.quantity));

  double get discountAmount => discount?.amountFor(subtotal) ?? 0;

  double get total {
    final value = subtotal - discountAmount;
    return value > 0 ? value : 0;
  }

  PosSession copyWith({
    List<CartItem>? cart,
    String? selectedCustomerId,
    Customer? selectedCustomer,
    PosDiscount? discount,
    bool clearCustomer = false,
    bool clearDiscount = false,
    bool clearLastInteracted = false,
    int? lastInteractedItemIndex,
  }) {
    return PosSession(
      cart: cart ?? this.cart,
      selectedCustomerId: clearCustomer
          ? null
          : (selectedCustomerId ?? this.selectedCustomerId),
      selectedCustomer: clearCustomer
          ? null
          : (selectedCustomer ?? this.selectedCustomer),
      discount: clearDiscount ? null : (discount ?? this.discount),
      lastInteractedItemIndex: clearLastInteracted ? null : (lastInteractedItemIndex ?? this.lastInteractedItemIndex),
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
  final String? lastSaleId;
  final bool showNumpadOnDesktop; // New Persistent Setting

  // Last Order Details for Reprinting
  final List<CartItem> lastOrderItems;
  final Customer? lastOrderCustomer;
  final double lastOrderDiscountAmount;
  final double lastOrderTotal;

  // Helper getters for active session
  PosSession get currentSession => sessions[currentSessionIndex];
  List<CartItem> get cart => currentSession.cart;
  double get subtotal => currentSession.subtotal;
  double get discountAmount => currentSession.discountAmount;
  PosDiscount? get discount => currentSession.discount;
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
    this.lastSaleId,
    this.showNumpadOnDesktop = true,
    this.lastOrderItems = const [],
    this.lastOrderCustomer,
    this.lastOrderDiscountAmount = 0.0,
    this.lastOrderTotal = 0.0,
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
    Object? lastSaleId = _unset,
    bool? showNumpadOnDesktop,
    List<CartItem>? lastOrderItems,
    Customer? lastOrderCustomer,
    double? lastOrderDiscountAmount,
    double? lastOrderTotal,
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
      lastSaleId: identical(lastSaleId, _unset)
          ? this.lastSaleId
          : lastSaleId as String?,
      showNumpadOnDesktop: showNumpadOnDesktop ?? this.showNumpadOnDesktop,
      lastOrderItems: lastOrderItems ?? this.lastOrderItems,
      lastOrderCustomer: lastOrderCustomer ?? this.lastOrderCustomer,
      lastOrderDiscountAmount:
          lastOrderDiscountAmount ?? this.lastOrderDiscountAmount,
      lastOrderTotal: lastOrderTotal ?? this.lastOrderTotal,
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
      final repository = CategoryRepository(apiService);
      final categories = await repository.getCategories();

      state = state.copyWith(categories: categories);
    } catch (e) {
      state = state.copyWith(error: 'Failed to load categories: $e');
    }
  }

  Future<void> fetchProducts() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final apiService = ref.read(apiProvider);
      final repository = ProductRepository(apiService);
      final products = await repository.getProducts();

      state = state.copyWith(
        products: products,
        isLoading: false,
        debugInfo:
            'Success. Parsed ${products.length} products (from cache or API).',
      );
    } catch (e) {
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
      final repository = ProductRepository(apiService);
      final product = await repository.getProductById(productId);
      if (product == null) return null;
      _productDetailsCache[productId] = product;
      return product;
    } catch (e) {
      state = state.copyWith(error: 'Failed to load product details: $e');
      return null;
    }
  }

  Future<PosLookupItem?> lookupByCode(String code) async {
    final normalized = code.trim();
    if (normalized.isEmpty) return null;

    try {
      final apiService = ref.read(apiProvider);
      final sync = SyncService();
      if (await sync.isOnline) {
        final response = await apiService.client.get(
          '/admin/pos/lookup',
          queryParameters: {'code': normalized},
        );
        return PosLookupItem.fromJson(Map<String, dynamic>.from(response.data));
      }

      // Offline lookup: search locally cached products/variants by SKU or barcode.
      final repository = ProductRepository(apiService);
      final products = await repository.getProducts();

      String variantLabelFrom(ProductVariant v) {
        final labels = v.optionValues
            .map((ov) => ov.optionValue?.label)
            .whereType<String>()
            .where((s) => s.trim().isNotEmpty)
            .toList();
        if (labels.isNotEmpty) return labels.join(' / ');
        return v.sku;
      }

      for (final p in products) {
        for (final v in p.variants) {
          final matchesSku = v.sku.trim().isNotEmpty && v.sku == normalized;
          final matchesBarcode =
              (v.barcode != null && v.barcode!.trim() == normalized);
          if (matchesSku || matchesBarcode) {
            final bool isMainProductVariant = v.optionValues.isEmpty;
            final bool needsVariantSelection = isMainProductVariant && p.options.isNotEmpty;
            return PosLookupItem(
              productId: p.id,
              variantId: v.id,
              title: p.title,
              variantLabel: variantLabelFrom(v),
              sku: v.sku,
              price: v.price,
              imageUrl: p.mainImageUrl,
              needsVariantSelection: needsVariantSelection,
            );
          }
        }
      }

      return null;
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      throw Exception('POS lookup failed: ${e.message}');
    } catch (e) {
      throw Exception('POS lookup failed: $e');
    }
  }

  Future<PosLookupItem?> addByCode(String code, {int quantity = 1}) async {
    final item = await lookupByCode(code);
    if (item == null) return null;

    bool needsSelection = item.needsVariantSelection;
    if (!needsSelection) {
      final product = state.products.where((p) => p.id == item.productId).firstOrNull;
      if (product != null && product.options.isNotEmpty && (item.variantLabel == null || item.variantLabel == 'Default' || item.variantLabel!.isEmpty)) {
        needsSelection = true;
      }
    }

    if (needsSelection) {
      return PosLookupItem(
        productId: item.productId,
        variantId: item.variantId,
        title: item.title,
        variantLabel: item.variantLabel,
        sku: item.sku,
        price: item.price,
        imageUrl: item.imageUrl,
        needsVariantSelection: true,
      );
    }

    final current = state.currentSession;
    final existingIndex = current.cart.indexWhere(
      (ci) =>
          ci.productId == item.productId &&
          ci.variantId == item.variantId &&
          ci.price == item.price,
    );

    List<CartItem> newCart;
    if (existingIndex >= 0) {
      final existingItem = current.cart[existingIndex];
      newCart = [...current.cart];
      newCart[existingIndex] = existingItem.copyWith(
        quantity: existingItem.quantity + quantity,
      );
    } else {
      newCart = [
        ...current.cart,
        CartItem(
          productId: item.productId,
          variantId: item.variantId,
          name: item.title,
          variantTitle: item.variantLabel,
          price: item.price,
          quantity: quantity,
          imageUrl: item.imageUrl,
        ),
      ];
    }

    _updateCurrentSession(current.copyWith(
      cart: newCart,
      lastInteractedItemIndex: existingIndex >= 0 ? existingIndex : newCart.length - 1,
    ));
    return item;
  }

  void switchSession(int index) {
    if (index >= 0 && index < state.sessions.length) {
      state = state.copyWith(currentSessionIndex: index);
    }
  }

  void toggleProductView() {
    state = state.copyWith(isProductListView: !state.isProductListView);
    saveSettings();
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

  void toggleNumpadVisibility() {
    state = state.copyWith(showNumpadOnDesktop: !state.showNumpadOnDesktop);
    saveSettings();
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
        imageUrl: product.mainImageUrl,
      );
      newCart = [...current.cart, newItem];
    }
    _updateCurrentSession(current.copyWith(
      cart: newCart,
      lastInteractedItemIndex: existingIndex >= 0 ? existingIndex : newCart.length - 1,
    ));
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

  void applyDiscount(PosDiscount discount) {
    final current = state.currentSession;
    if (current.cart.isEmpty || discount.amountFor(current.subtotal) <= 0) {
      clearDiscount();
      return;
    }
    _updateCurrentSession(current.copyWith(discount: discount));
  }

  void clearDiscount() {
    final current = state.currentSession;
    _updateCurrentSession(current.copyWith(clearDiscount: true));
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
    
    final interactedIndex = newCart.indexWhere((item) => item.productId == productId && item.variantId == variantId);
    _updateCurrentSession(current.copyWith(
      cart: newCart,
      lastInteractedItemIndex: interactedIndex >= 0 ? interactedIndex : null,
    ));
  }

  void updateQuantityAtIndex(int index, int quantity) {
    if (index < 0 || index >= state.cart.length) return;
    if (quantity <= 0) {
      // Remove item at index
      final current = state.currentSession;
      final newCart = [...current.cart]..removeAt(index);
      _updateCurrentSession(
        current.copyWith(cart: newCart, clearDiscount: newCart.isEmpty),
      );
      return;
    }

    final current = state.currentSession;
    final item = current.cart[index];
    final newCart = [...current.cart];
    newCart[index] = item.copyWith(quantity: quantity);
    _updateCurrentSession(current.copyWith(
      cart: newCart,
      lastInteractedItemIndex: index,
    ));
  }

  void incrementLastInteractedItemQuantity() {
    final current = state.currentSession;
    final index = current.lastInteractedItemIndex;
    if (index == null || index < 0 || index >= current.cart.length) return;
    updateQuantityAtIndex(index, current.cart[index].quantity + 1);
  }

  void decrementLastInteractedItemQuantity() {
    final current = state.currentSession;
    final index = current.lastInteractedItemIndex;
    if (index == null || index < 0 || index >= current.cart.length) return;
    updateQuantityAtIndex(index, current.cart[index].quantity - 1);
  }

  void removeFromCart(String productId, String? variantId) {
    final current = state.currentSession;
    final newCart = current.cart
        .where(
          (item) =>
              !(item.productId == productId && item.variantId == variantId),
        )
        .toList();
    _updateCurrentSession(
      current.copyWith(cart: newCart, clearDiscount: newCart.isEmpty),
    );
  }

  void clearCart() {
    final current = state.currentSession;
    _updateCurrentSession(current.copyWith(cart: [], clearDiscount: true));
  }

  Future<bool> checkout({PosPaymentRequest? payment}) async {
    if (state.cart.isEmpty) return false;

    state = state.copyWith(isLoading: true);
    try {
      final apiService = ref.read(apiProvider);
      final saleRepository = PosSaleRepository(apiService);
      final current = state.currentSession;
      final subtotal = current.subtotal;
      final discountAmount = current.discountAmount;
      final total = current.total;

      final paymentBreakdown = payment?.breakdown(total);
      if (paymentBreakdown != null) {
        if (!paymentBreakdown.isValid) {
          state = state.copyWith(isLoading: false, error: 'Invalid payment');
          return false;
        }
        if (!paymentBreakdown.isSettled) {
          state = state.copyWith(
            isLoading: false,
            error: 'Payment not settled',
          );
          return false;
        }
      }

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
        'subtotal': subtotal,
        'discountAmount': discountAmount,
        'total': total,
        if (current.discount != null)
          'discount': current.discount!.toJson(subtotal),
        if (paymentBreakdown != null)
          'payment': {
            'total': total,
            'cardAmount': paymentBreakdown.cardAmount,
            'cashReceived': paymentBreakdown.cashReceived,
            'change': paymentBreakdown.change,
            'lines': paymentBreakdown.lines.map((l) => l.toJson()).toList(),
          },
      };

      // Create sale via Repository (handles SQLite + Sync Queue)
      final saleId = await saleRepository.createSale(payload);

      // Store cart details before clearing for potential printing
      final List<CartItem> itemsToPrint = List.from(current.cart);
      final Customer? customerToPrint = current.selectedCustomer;
      final double discountToPrint = discountAmount;
      final double orderTotal = total;

      // Clear the current session after successful checkout
      _updateCurrentSession(PosSession());

      state = state.copyWith(
        isLoading: false,
        lastSaleId: saleId,
        // Update last order details
        lastOrderItems: itemsToPrint,
        lastOrderCustomer: customerToPrint,
        lastOrderDiscountAmount: discountToPrint,
        lastOrderTotal: orderTotal,
      );

      // Auto-print receipt (Fire and forget to avoid delaying UI)
      final profilesState = ref.read(printerProfilesProvider);
      if (profilesState.defaultProfile != null) {
        final printService = ref.read(printServiceProvider);
        // Don't await printing, let it run in background
        printService
            .printReceipt(
              profile: profilesState.defaultProfile!,
              items: itemsToPrint,
              total: orderTotal,
              discountAmount: discountToPrint,
              customer: customerToPrint,
              orderId: saleId,
              layout: profilesState.receiptLayout,
              currencyCode: tenantCurrencyCode(
                ref.read(storeSettingsProvider).settings,
              ),
            )
            .catchError((e) {
              FlutterError.reportError(
                FlutterErrorDetails(
                  exception: e,
                  library: 'pos_provider',
                  context: ErrorDescription('auto-printing POS receipt'),
                ),
              );
            });
      }
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to create sale: $e',
      );
      return false;
    }
  }

  Future<String?> printLastOrder() async {
    if (state.lastOrderItems.isEmpty) return 'No last order to print';

    final profilesState = ref.read(printerProfilesProvider);
    if (profilesState.defaultProfile == null) {
      return 'No default printer profile selected';
    }

    try {
      final printService = ref.read(printServiceProvider);
      await printService.printReceipt(
        profile: profilesState.defaultProfile!,
        items: state.lastOrderItems,
        total: state.lastOrderTotal,
        discountAmount: state.lastOrderDiscountAmount,
        customer: state.lastOrderCustomer,
        orderId: state.lastSaleId,
        layout: profilesState.receiptLayout,
        currencyCode: tenantCurrencyCode(
          ref.read(storeSettingsProvider).settings,
        ),
      );
      return null;
    } catch (e) {
      return 'Failed to print last order: $e';
    }
  }

  Future<bool> checkoutFast() {
    return checkout(payment: PosPaymentRequest.fastCash(state.total));
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

      // Load product card/list preference
      final isProductListView =
          prefs.getBool('pos_is_product_list_view') ?? false;

      // Load numpad preference
      final showNumpadOnDesktop =
          prefs.getBool('pos_show_numpad_desktop') ?? true;

      state = state.copyWith(
        sortType: sortType,
        crossAxisCount: crossAxisCount,
        isCartSimpleView: isCartSimpleView,
        isProductListView: isProductListView,
        showNumpadOnDesktop: showNumpadOnDesktop,
      );
    } catch (e) {
      FlutterError.reportError(
        FlutterErrorDetails(
          exception: e,
          library: 'pos_provider',
          context: ErrorDescription('loading POS settings'),
        ),
      );
    }
  }

  Future<void> saveSettings() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt('pos_sort_type', state.sortType.index);
      await prefs.setInt('pos_cross_axis_count', state.crossAxisCount);
      await prefs.setBool('pos_is_cart_simple_view', state.isCartSimpleView);
      await prefs.setBool('pos_is_product_list_view', state.isProductListView);
      await prefs.setBool('pos_show_numpad_desktop', state.showNumpadOnDesktop);
    } catch (e) {
      FlutterError.reportError(
        FlutterErrorDetails(
          exception: e,
          library: 'pos_provider',
          context: ErrorDescription('saving POS settings'),
        ),
      );
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
