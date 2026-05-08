import 'package:admin_app/models/pos_models.dart';
import 'package:admin_app/models/product.dart';
import 'package:admin_app/providers/pos_provider.dart';
import 'package:admin_app/screens/pos_screen.dart';
import 'package:admin_app/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'helpers/pump_localized_app.dart';

class _FakePosNotifier extends PosNotifier {
  @override
  PosState build() {
    final categories = List.generate(
      5,
      (index) => Category(
        id: 'cat_$index',
        title: index == 0
            ? 'Very long accessories category name'
            : 'Category $index',
        slug: 'category-$index',
      ),
    );

    final products = List.generate(
      18,
      (index) => Product(
        id: 'product_$index',
        title:
            'Premium checkout product with a very long display name ${index + 1}',
        slug: 'premium-checkout-product-${index + 1}',
        price: 1200 + (index * 175),
        stock: index % 6 == 0 ? 0 : 8 + index,
        isActive: true,
        categoryId: categories[index % categories.length].id,
        category: categories[index % categories.length],
      ),
    );

    return PosState(
      categories: categories,
      products: products,
      sessions: [
        PosSession(
          cart: [
            CartItem(
              productId: 'product_1',
              name: 'Premium checkout product with a very long cart line name',
              price: 2450,
              quantity: 2,
              variantTitle: 'Large / Matte black / Extended warranty',
            ),
            CartItem(
              productId: 'custom_1',
              name: 'Custom counter sale',
              price: 900,
              quantity: 1,
            ),
          ],
        ),
        const PosSession(),
        const PosSession(),
      ],
    );
  }

  @override
  Future<void> loadSettings() async {}

  @override
  Future<void> fetchCategories() async {}

  @override
  Future<void> fetchProducts() async {}
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  for (final size in const [Size(1440, 900), Size(1024, 760), Size(390, 844)]) {
    testWidgets('POS layout has no overflow at ${size.width}px', (
      WidgetTester tester,
    ) async {
      await tester.binding.setSurfaceSize(size);
      addTearDown(() async {
        await tester.binding.setSurfaceSize(null);
      });

      await tester.pumpWidget(
        ProviderScope(
          overrides: [posProvider.overrideWith(_FakePosNotifier.new)],
          child: buildLocalizedTestApp(
            home: Theme(data: AppTheme.dark, child: const PosScreen()),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 250));

      expect(tester.takeException(), isNull);
    });
  }
}
