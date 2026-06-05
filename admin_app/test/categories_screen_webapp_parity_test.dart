import 'package:admin_app/models/product.dart';
import 'package:admin_app/providers/categories_provider.dart';
import 'package:admin_app/screens/categories_screen.dart';
import 'package:admin_app/widgets/category_workspace.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'helpers/pump_localized_app.dart';

class _TestCategoriesNotifier extends CategoriesNotifier {
  final CategoriesState _initialState;

  _TestCategoriesNotifier(this._initialState);

  @override
  CategoriesState build() => _initialState;

  @override
  Future<void> fetchCategories({String? sortBy, String? sortOrder}) async {}
}

void main() {
  group('CategoriesScreen Webapp Parity Tests', () {
    final parentCategory1 = Category(
      id: 'cat-1',
      title: 'Electronics',
      slug: 'electronics',
      productCount: 10,
      subcategoriesCount: 2,
    );
    final parentCategory2 = Category(
      id: 'cat-2',
      title: 'Clothing',
      slug: 'clothing',
      productCount: 5,
      subcategoriesCount: 0,
    );
    final subcategory1 = Category(
      id: 'cat-3',
      title: 'Phones',
      slug: 'phones',
      parentId: 'cat-1',
    );
    final subcategory2 = Category(
      id: 'cat-4',
      title: 'Laptops',
      slug: 'laptops',
      parentId: 'cat-1',
    );

    final mockCategories = [
      parentCategory1,
      parentCategory2,
      subcategory1,
      subcategory2,
    ];

    testWidgets('renders CategoriesScreen with workspace layout', (tester) async {
      await tester.pumpWidget(
        buildLocalizedTestApp(
          home: ProviderScope(
            overrides: [
              categoriesProvider.overrideWith(
                () => _TestCategoriesNotifier(
                  CategoriesState(categories: mockCategories, isLoading: false),
                ),
              ),
            ],
            child: const CategoriesScreen(),
          ),
        )
      );
      await tester.pumpAndSettle();

      // Check for CategoryWorkspace widget
      expect(find.byType(CategoryWorkspace), findsOneWidget);

      // Parent categories should be visible in the list
      expect(find.text('Electronics'), findsWidgets); // Found in left pane (and right pane if active)
      expect(find.text('Clothing'), findsWidgets); // Left pane
    });

    testWidgets('clicking a parent category shows its subcategories', (tester) async {
      await tester.pumpWidget(
        buildLocalizedTestApp(
          home: ProviderScope(
            overrides: [
              categoriesProvider.overrideWith(
                () => _TestCategoriesNotifier(
                  CategoriesState(categories: mockCategories, isLoading: false),
                ),
              ),
            ],
            child: const Scaffold(body: CategoriesScreen()), // Wrapped in scaffold to support snackbar
          ),
        )
      );
      await tester.pumpAndSettle();

      // Electronics might be active by default if it's first
      expect(find.text('Phones'), findsOneWidget);
      expect(find.text('Laptops'), findsOneWidget);

      // Switch to Clothing
      await tester.tap(find.text('Clothing').first);
      await tester.pumpAndSettle();

      // Subcategories of Electronics should disappear
      expect(find.text('Phones'), findsNothing);
      expect(find.text('Laptops'), findsNothing);

      // Should show empty state for Clothing subcategories
      expect(find.text('No subcategories for this category yet.'), findsWidgets);
    });
  });
}
