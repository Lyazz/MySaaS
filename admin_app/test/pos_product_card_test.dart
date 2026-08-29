import 'package:admin_app/models/product.dart';
import 'package:admin_app/models/store_settings.dart';
import 'package:admin_app/providers/customers_provider.dart';
import 'package:admin_app/providers/pos_provider.dart';
import 'package:admin_app/providers/store_settings_provider.dart';
import 'package:admin_app/screens/pos_screen.dart';
import 'package:admin_app/utils/tenant_currency.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'helpers/pump_localized_app.dart';

class _FakePosProductCardNotifier extends PosNotifier {
  static final Category _category = Category(
    id: 'cat_1',
    title: 'Accessories premium longue categorie',
    slug: 'accessories',
  );

  static final Product product = Product(
    id: 'product_1',
    title: 'Premium countertop product with an extra long display name for POS',
    slug: 'premium-countertop-product',
    price: 9876543,
    stock: 4,
    lowStockThreshold: 5,
    isActive: true,
    categoryId: _category.id,
    category: _category,
  );

  @override
  PosState build() {
    return PosState(
      categories: [_category],
      products: [product],
      selectedCategoryId: _category.id,
    );
  }

  @override
  Future<void> loadSettings() async {}

  @override
  Future<void> fetchCategories() async {}

  @override
  Future<void> fetchProducts() async {}
}

class _FakeCustomersNotifier extends CustomersNotifier {
  @override
  CustomersState build() => CustomersState();

  @override
  Future<void> fetchCustomers({
    String? search,
    int page = 1,
    int limit = 25,
  }) async {}
}

class _FakeStoreSettingsNotifier extends StoreSettingsNotifier {
  @override
  StoreSettingsState build() {
    return const StoreSettingsState(
      settings: StoreSettings.empty,
      isLoading: false,
    );
  }

  @override
  Future<void> fetchStoreSettings({bool forceRefresh = false}) async {}
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  final priceLabel = tenantCurrencyFormatter(
    StoreSettings.empty,
  ).format(_FakePosProductCardNotifier.product.price);

  for (final theme in <({String name, ThemeData data})>[
    (name: 'dark', data: ThemeData.dark(useMaterial3: true)),
    (name: 'light', data: ThemeData.light(useMaterial3: true)),
  ]) {
    testWidgets(
      'POS product card shows the full price, with the plus affordance hidden, '
      'in ${theme.name} theme',
      (WidgetTester tester) async {
        await tester.binding.setSurfaceSize(const Size(360, 780));
        addTearDown(() async {
          await tester.binding.setSurfaceSize(null);
        });

        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              posProvider.overrideWith(_FakePosProductCardNotifier.new),
              customersProvider.overrideWith(_FakeCustomersNotifier.new),
              storeSettingsProvider.overrideWith(
                _FakeStoreSettingsNotifier.new,
              ),
            ],
            child: buildLocalizedTestApp(
              home: Theme(data: theme.data, child: const PosScreen()),
            ),
          ),
        );

        await tester.pump();
        await tester.pump(const Duration(milliseconds: 250));

        expect(tester.takeException(), isNull);

        final cardFinder = find.byKey(
          const ValueKey('pos-product-card-product_1'),
        );
        expect(cardFinder, findsOneWidget);

        // The plus is a desktop hover affordance, so it is in the tree at all
        // times and `findsNothing` can never hold. What the card must actually
        // guarantee is that nothing covers the price until the pointer is over
        // it — on a touch surface, that means never. Assert it is invisible
        // rather than absent, which is the same promise against the
        // implementation that exists.
        final plusFinder = find.descendant(
          of: cardFinder,
          matching: find.byIcon(LucideIcons.plus),
        );
        expect(plusFinder, findsOneWidget);
        expect(
          tester
              .widget<AnimatedOpacity>(
                find.ancestor(
                  of: plusFinder,
                  matching: find.byType(AnimatedOpacity),
                ),
              )
              .opacity,
          0.0,
        );
        expect(
          find.byKey(const ValueKey('pos-product-price-product_1')),
          findsOneWidget,
        );
        expect(find.text(priceLabel), findsOneWidget);
      },
    );
  }
}
