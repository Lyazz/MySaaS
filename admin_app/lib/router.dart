import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'providers/auth_provider.dart';
import 'screens/dashboard_screen.dart';
import 'screens/login_screen.dart';
import 'screens/products_screen.dart';
import 'screens/product_form_screen.dart';
import 'screens/orders_screen.dart';
import 'screens/inventory_screen.dart';
import 'screens/categories_screen.dart';
import 'screens/category_form_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/settings/printers_settings_page.dart';
import 'screens/customers_screen.dart';
import 'screens/customer_detail_screen.dart';
import 'screens/suppliers_screen.dart';
import 'screens/supplier_form_screen.dart';

import 'screens/sales_screen.dart';
import 'screens/purchases_screen.dart';
import 'screens/purchase_form_screen.dart';
import 'screens/purchase_detail_screen.dart';
import 'screens/pos_screen.dart';
import 'screens/delivery_screen.dart';
import 'screens/billing_screen.dart';
import 'widgets/app_shell.dart';

// Custom transition that removes the slow overlay effect
class NoTransitionPage extends CustomTransitionPage<void> {
  const NoTransitionPage({required Widget child, LocalKey? key})
    : super(
        key: key,
        child: child,
        transitionsBuilder: _transitionsBuilder,
        transitionDuration: Duration.zero,
      );

  static Widget _transitionsBuilder(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    return child;
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);
  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final isLoggedIn = authState.isAuthenticated;
      final isLoginRoute = state.uri.toString() == '/login';

      if (!isLoggedIn && !isLoginRoute) {
        return '/login';
      }

      if (isLoggedIn && isLoginRoute) {
        return '/';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        pageBuilder: (context, state) =>
            NoTransitionPage(key: state.pageKey, child: const LoginScreen()),
      ),
      ShellRoute(
        builder: (context, state, child) {
          return AppShell(child: child);
        },
        routes: [
          GoRoute(
            path: '/',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const DashboardScreen(),
            ),
          ),
          GoRoute(
            path: '/products',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const ProductsScreen(),
            ),
          ),
          GoRoute(
            path: '/products/create',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const ProductFormScreen(),
            ),
          ),
          GoRoute(
            path: '/products/:id',
            pageBuilder: (context, state) {
              final id = state.pathParameters['id'];
              return NoTransitionPage(
                key: state.pageKey,
                child: ProductFormScreen(productId: id),
              );
            },
          ),
          GoRoute(
            path: '/orders',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const OrdersScreen(),
            ),
          ),
          GoRoute(
            path: '/sales',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const SalesScreen(),
            ),
          ),
          GoRoute(
            path: '/purchases',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const PurchasesScreen(),
            ),
          ),
          GoRoute(
            path: '/purchases/create',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const PurchaseFormScreen(),
            ),
          ),
          GoRoute(
            path: '/purchases/:id',
            pageBuilder: (context, state) {
              final id = state.pathParameters['id'];
              return NoTransitionPage(
                key: state.pageKey,
                child: PurchaseDetailScreen(purchaseId: id!),
              );
            },
          ),
          GoRoute(
            path: '/inventory',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const InventoryScreen(),
            ),
          ),
          GoRoute(
            path: '/categories',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const CategoriesScreen(),
            ),
          ),
          GoRoute(
            path: '/categories/create',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const CategoryFormScreen(),
            ),
          ),
          GoRoute(
            path: '/categories/:id',
            pageBuilder: (context, state) {
              final id = state.pathParameters['id'];
              return NoTransitionPage(
                key: state.pageKey,
                child: CategoryFormScreen(categoryId: id),
              );
            },
          ),
          GoRoute(
            path: '/suppliers',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const SuppliersScreen(),
            ),
          ),
          GoRoute(
            path: '/suppliers/create',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const SupplierFormScreen(),
            ),
          ),
          GoRoute(
            path: '/suppliers/:id',
            pageBuilder: (context, state) {
              final id = state.pathParameters['id'];
              return NoTransitionPage(
                key: state.pageKey,
                child: SupplierFormScreen(supplierId: id!),
              );
            },
          ),
          GoRoute(
            path: '/customers',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const CustomersScreen(),
            ),
          ),
          GoRoute(
            path: '/customers/:id',
            pageBuilder: (context, state) {
              final id = state.pathParameters['id'];
              return NoTransitionPage(
                key: state.pageKey,
                child: CustomerDetailScreen(customerId: id!),
              );
            },
          ),
          GoRoute(
            path: '/settings',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const SettingsScreen(),
            ),
            routes: [
              GoRoute(
                path: 'printers',
                pageBuilder: (context, state) => NoTransitionPage(
                  key: state.pageKey,
                  child: const PrintersSettingsPage(),
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/pos',
            pageBuilder: (context, state) =>
                NoTransitionPage(key: state.pageKey, child: const PosScreen()),
          ),
          GoRoute(
            path: '/delivery',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const DeliveryScreen(),
            ),
          ),
          GoRoute(
            path: '/billing',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const BillingScreen(),
            ),
          ),
        ],
      ),
    ],
  );
});
