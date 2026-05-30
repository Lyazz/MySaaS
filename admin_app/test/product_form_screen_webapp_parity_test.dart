import 'package:admin_app/models/product.dart';
import 'package:admin_app/models/store_settings.dart';
import 'package:admin_app/providers/products_provider.dart';
import 'package:admin_app/providers/store_settings_provider.dart';
import 'package:admin_app/providers/workspace_provider.dart';
import 'package:admin_app/screens/product_form_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers/pump_localized_app.dart';

class _TestStoreSettingsNotifier extends StoreSettingsNotifier {
  _TestStoreSettingsNotifier(this._state);

  final StoreSettingsState _state;

  @override
  StoreSettingsState build() => _state;
}

class _TestWorkspaceNotifier extends WorkspaceNotifier {
  _TestWorkspaceNotifier(this._state);

  final WorkspaceState _state;

  @override
  WorkspaceState build() => _state;
}

class _RecordingProductsNotifier extends ProductsNotifier {
  _RecordingProductsNotifier({
    required ProductsState initialState,
    this.product,
    this.throwOnCreate = false,
  }) : super(initialState);

  final Product? product;
  final bool throwOnCreate;

  Map<String, dynamic>? lastCreatePayload;

  @override
  Future<void> fetchCategories({bool forceRefresh = false}) async {}

  @override
  Future<Product?> fetchProduct(String id) async => product;

  @override
  Future<void> createProduct(Map<String, dynamic> data) async {
    lastCreatePayload = Map<String, dynamic>.from(data);
    if (throwOnCreate) {
      throw Exception('create failed');
    }
  }
}

Finder _textFieldIn(String key) {
  return find.descendant(
    of: find.byKey(Key(key)),
    matching: find.byType(TextFormField),
  );
}

Finder _iconButtonFinder(String tooltip) {
  return find.byWidgetPredicate(
    (widget) => widget is IconButton && widget.tooltip == tooltip,
  );
}

void main() {
  final category = Category(id: 'c1', title: 'Shoes', slug: 'shoes');

  ProviderScope buildHarness({
    required Widget child,
    required _RecordingProductsNotifier productsNotifier,
  }) {
    return ProviderScope(
      overrides: [
        productsProvider.overrideWith(() => productsNotifier),
        storeSettingsProvider.overrideWith(
          () => _TestStoreSettingsNotifier(
            const StoreSettingsState(
              settings: StoreSettings(
                name: 'Demo',
                slug: 'demo',
                currencyCode: 'DZD',
                currencyCountry: 'DZ',
                isCompleted: true,
              ),
              isLoading: false,
            ),
          ),
        ),
        workspaceProvider.overrideWith(
          () => _TestWorkspaceNotifier(
            const WorkspaceState(apiBaseUrl: 'https://api.swekly.com/api'),
          ),
        ),
      ],
      child: buildLocalizedTestApp(home: child),
    );
  }

  testWidgets('create mode shows webapp-aligned tabs and no unsupported tabs', (
    WidgetTester tester,
  ) async {
    final notifier = _RecordingProductsNotifier(
      initialState: ProductsState(categories: [category]),
    );

    await tester.pumpWidget(
      buildHarness(
        child: const ProductFormScreen(),
        productsNotifier: notifier,
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Create product'), findsAtLeastNWidgets(1));
    expect(find.text('Create new product'), findsOneWidget);

    expect(find.widgetWithText(Tab, 'General'), findsOneWidget);
    expect(
      find.widgetWithText(Tab, 'Landing page description'),
      findsOneWidget,
    );
    expect(find.widgetWithText(Tab, 'Variants / Stock'), findsOneWidget);

    expect(find.widgetWithText(Tab, 'Images'), findsNothing);
    expect(find.widgetWithText(Tab, 'Bundles'), findsNothing);
    expect(find.widgetWithText(Tab, 'Promotions'), findsNothing);
    expect(find.widgetWithText(Tab, 'Tracking'), findsNothing);

    expect(find.text('Low stock alert threshold'), findsOneWidget);
    expect(find.text('Product images'), findsOneWidget);
  });

  testWidgets('edit mode shows webapp-aligned breadcrumb and actions', (
    WidgetTester tester,
  ) async {
    final product = Product(
      id: 'p1',
      title: 'Fancy Shoe',
      slug: 'fancy-shoe',
      price: 3200,
      stock: 5,
      lowStockThreshold: 2,
      isActive: true,
      category: category,
      categoryId: category.id,
      variants: const [],
    );

    final notifier = _RecordingProductsNotifier(
      initialState: ProductsState(categories: [category]),
      product: product,
    );

    await tester.pumpWidget(
      buildHarness(
        child: const ProductFormScreen(productId: 'p1'),
        productsNotifier: notifier,
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Edit Fancy Shoe'), findsOneWidget);
    expect(find.text('Edit product'), findsAtLeastNWidgets(1));
    expect(find.text('Update product'), findsAtLeastNWidgets(1));
    expect(find.text('Links:'), findsOneWidget);
  });

  testWidgets('link actions enable with slug and copy expected product URL', (
    WidgetTester tester,
  ) async {
    String? copiedText;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(SystemChannels.platform, (call) async {
          if (call.method == 'Clipboard.setData') {
            final args = Map<String, dynamic>.from(call.arguments as Map);
            copiedText = args['text']?.toString();
            return null;
          }
          if (call.method == 'Clipboard.getData') {
            return <String, dynamic>{'text': copiedText};
          }
          return null;
        });
    addTearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(SystemChannels.platform, null);
    });

    final notifier = _RecordingProductsNotifier(
      initialState: ProductsState(categories: [category]),
    );

    await tester.pumpWidget(
      buildHarness(
        child: const ProductFormScreen(),
        productsNotifier: notifier,
      ),
    );
    await tester.pumpAndSettle();

    final openBefore = tester.widget<IconButton>(
      _iconButtonFinder('Open product page'),
    );
    final copyBefore = tester.widget<IconButton>(
      _iconButtonFinder('Copy product link'),
    );
    expect(openBefore.onPressed, isNull);
    expect(copyBefore.onPressed, isNull);

    await tester.enterText(_textFieldIn('product-form-title'), 'Alpha One');
    await tester.pump(const Duration(milliseconds: 50));

    final openAfter = tester.widget<IconButton>(
      _iconButtonFinder('Open product page'),
    );
    final copyAfter = tester.widget<IconButton>(
      _iconButtonFinder('Copy product link'),
    );
    expect(openAfter.onPressed, isNotNull);
    expect(copyAfter.onPressed, isNotNull);

    await tester.tap(_iconButtonFinder('Copy product link'));
    await tester.pump();

    expect(copiedText, 'https://demo.swekly.com/product/alpha-one');
  });

  testWidgets('submit payload includes lowStockThreshold', (
    WidgetTester tester,
  ) async {
    final notifier = _RecordingProductsNotifier(
      initialState: ProductsState(categories: [category]),
      throwOnCreate: true,
    );

    await tester.pumpWidget(
      buildHarness(
        child: const ProductFormScreen(),
        productsNotifier: notifier,
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(_textFieldIn('product-form-title'), 'Runner Shoe');
    await tester.enterText(_textFieldIn('product-form-price'), '1900');
    await tester.enterText(_textFieldIn('product-form-stock'), '11');
    await tester.enterText(
      _textFieldIn('product-form-low-stock-threshold'),
      '9',
    );

    await tester.tap(find.byKey(const Key('product-form-footer-submit')));
    await tester.pumpAndSettle();

    final payload = notifier.lastCreatePayload;
    expect(payload, isNotNull);
    expect(payload!['slug'], 'runner-shoe');
    expect(payload['stock'], 11);
    expect(payload['lowStockThreshold'], 9);
  });
}
