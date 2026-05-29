import 'package:admin_app/models/app_mode.dart';
import 'package:admin_app/models/product.dart';
import 'package:admin_app/models/store_settings.dart';
import 'package:admin_app/models/subscription_tier.dart';
import 'package:admin_app/providers/auth_provider.dart';
import 'package:admin_app/providers/products_provider.dart';
import 'package:admin_app/providers/store_settings_provider.dart';
import 'package:admin_app/screens/products_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers/pump_localized_app.dart';

class _TestAuthNotifier extends AuthNotifier {
  _TestAuthNotifier(this._state);

  final AuthState _state;

  @override
  AuthState build() => _state;
}

class _TestStoreSettingsNotifier extends StoreSettingsNotifier {
  _TestStoreSettingsNotifier(this._state);

  final StoreSettingsState _state;

  @override
  StoreSettingsState build() => _state;
}

void main() {
  final category = Category(
    id: 'c1',
    title: 'Electronics',
    slug: 'electronics',
  );

  final products = [
    Product(
      id: 'p1',
      title: 'Very long product title that should ellipsize nicely',
      slug: 'very-long-product-title',
      price: 1999.99,
      stock: 12,
      isActive: true,
      category: category,
      categoryId: category.id,
    ),
    Product(
      id: 'p2',
      title: 'Compact thermal printer',
      slug: 'compact-thermal-printer',
      price: 12999.0,
      stock: 2,
      lowStockThreshold: 3,
      isActive: true,
      category: category,
      categoryId: category.id,
    ),
  ];

  testWidgets('ProductsScreen product rows do not overflow', (
    WidgetTester tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(900, 800));
    addTearDown(() async {
      await tester.binding.setSurfaceSize(null);
    });

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authProvider.overrideWith(
            () => _TestAuthNotifier(
              const AuthState(
                mode: AppMode.hybrid,
                subscriptionTier: SubscriptionTier.online,
              ),
            ),
          ),
          productsProvider.overrideWith(
            () => ProductsNotifier(
              ProductsState(
                products: products,
                categories: [category],
                isLoading: false,
                error: null,
              ),
            ),
          ),
          storeSettingsProvider.overrideWith(
            () => _TestStoreSettingsNotifier(
              const StoreSettingsState(
                settings: StoreSettings.empty,
                isLoading: false,
              ),
            ),
          ),
        ],
        child: buildLocalizedTestApp(
          home: const ProductsScreen(autoFetch: false),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.pump(const Duration(milliseconds: 50));
    await tester.pumpAndSettle();

    expect(
      find.text('Very long product title that should ellipsize nicely'),
      findsOneWidget,
    );
    expect(find.text('Edit'), findsNWidgets(products.length));
    expect(find.text('Delete'), findsNWidgets(products.length));
    expect(tester.takeException(), isNull);
  });

  testWidgets('ProductsScreen desktop layout matches golden', (
    WidgetTester tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1440, 1000));
    addTearDown(() async {
      await tester.binding.setSurfaceSize(null);
    });

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authProvider.overrideWith(
            () => _TestAuthNotifier(
              const AuthState(
                mode: AppMode.hybrid,
                subscriptionTier: SubscriptionTier.online,
              ),
            ),
          ),
          productsProvider.overrideWith(
            () => ProductsNotifier(
              ProductsState(
                products: products,
                categories: [category],
                isLoading: false,
                error: null,
              ),
            ),
          ),
          storeSettingsProvider.overrideWith(
            () => _TestStoreSettingsNotifier(
              const StoreSettingsState(
                settings: StoreSettings.empty,
                isLoading: false,
              ),
            ),
          ),
        ],
        child: buildLocalizedTestApp(
          home: const ProductsScreen(autoFetch: false),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await expectLater(
      find.byType(ProductsScreen),
      matchesGoldenFile('goldens/products_screen_desktop.png'),
    );
  });
}
