import 'package:admin_app/models/product.dart';
import 'package:admin_app/providers/products_provider.dart';
import 'package:admin_app/screens/products_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers/pump_localized_app.dart';

void main() {
  testWidgets('ProductsScreen product rows do not overflow', (
    WidgetTester tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(900, 800));
    addTearDown(() async {
      await tester.binding.setSurfaceSize(null);
    });

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
    ];

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
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
        ],
        child: buildLocalizedTestApp(home: const ProductsScreen(autoFetch: false)),
      ),
    );
    await tester.pumpAndSettle();
    await tester.pump(const Duration(milliseconds: 50));
    await tester.pumpAndSettle();

    expect(
      find.text('Very long product title that should ellipsize nicely'),
      findsOneWidget,
    );
    expect(find.text('Edit'), findsOneWidget);
    expect(find.text('Delete'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
