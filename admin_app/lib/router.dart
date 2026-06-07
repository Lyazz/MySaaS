import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'models/app_mode.dart';
import 'providers/auth_provider.dart';
import 'bootstrap.dart';
import 'screens/activation_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/upgrade_screen.dart';
import 'screens/products_screen.dart';
import 'screens/product_form_screen.dart';
import 'screens/orders_screen.dart';
import 'screens/order_detail_screen.dart';
import 'screens/order_create_screen.dart';
import 'screens/inventory_screen.dart';
import 'screens/categories_screen.dart';
import 'screens/category_form_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/settings/printers_settings_page.dart';
import 'screens/settings/store_settings_page.dart';
import 'screens/settings/contact_infos_page.dart';
import 'screens/settings/store_appearance_page.dart';
import 'screens/settings/homepage_settings_page.dart';
import 'screens/settings/legal_pages_page.dart';
import 'screens/settings/domain_settings_page.dart';
import 'screens/customers_screen.dart';
import 'screens/customer_detail_screen.dart';
import 'screens/customer_form_screen.dart';
import 'screens/suppliers_screen.dart';
import 'screens/supplier_form_screen.dart';
import 'screens/users_screen.dart';
import 'screens/cash_screen.dart';
import 'screens/cashbox_detail_screen.dart';

import 'screens/sales_screen.dart';
import 'screens/sale_detail_screen.dart';
import 'screens/purchases_screen.dart';
import 'screens/purchase_form_screen.dart';
import 'screens/purchase_detail_screen.dart';
import 'screens/pos_screen.dart';
import 'screens/delivery_screen.dart';
import 'screens/billing_screen.dart';
import 'screens/integrations_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/feature_locked_screen.dart';
import 'screens/storefront_tools_screen.dart';
import 'screens/notifications_screen.dart';
import 'widgets/app_shell.dart';
import 'utils/feature_access.dart';

// Custom transition that removes the slow overlay effect
class NoTransitionPage extends CustomTransitionPage<void> {
  const NoTransitionPage({required super.child, super.key})
    : super(
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

String? _pathToResource(String path) {
  if (path == '/' || path.startsWith('/dashboard')) return 'dashboard';
  if (path.startsWith('/products')) return 'products';
  if (path.startsWith('/inventory')) return 'inventory';
  if (path.startsWith('/categories')) return 'categories';
  if (path.startsWith('/suppliers')) return 'suppliers';
  if (path.startsWith('/purchases')) return 'purchases';
  if (path.startsWith('/orders')) return 'orders';
  if (path.startsWith('/sales')) return 'sales';
  if (path.startsWith('/pos')) return 'pos';
  if (path.startsWith('/customers')) return 'customers';
  if (path.startsWith('/users')) return 'users';
  if (path.startsWith('/cash')) return 'cash';
  if (path.startsWith('/delivery')) return 'delivery';
  if (path.startsWith('/billing')) return 'billing';
  if (path.startsWith('/integrations')) return 'integrations';
  if (path.startsWith('/settings/homepage')) return 'homepageSettings';
  if (path.startsWith('/settings/contact')) return 'contactInfos';
  if (path.startsWith('/storefront')) return 'storeSettings';
  if (path.startsWith('/settings')) return 'storeSettings';
  return null;
}

String _firstAllowedPath(List<String> permissions) {
  bool allow(String resource) => permissions.contains('$resource:read');
  if (allow('orders')) return '/orders';
  if (allow('dashboard')) return '/';
  if (allow('products')) return '/products';
  if (allow('inventory')) return '/inventory';
  if (allow('categories')) return '/categories';
  if (allow('customers')) return '/customers';
  if (allow('suppliers')) return '/suppliers';
  if (allow('purchases')) return '/purchases';
  if (allow('sales')) return '/sales';
  if (allow('pos')) return '/pos';
  if (allow('delivery')) return '/delivery';
  if (allow('cash')) return '/cash';
  if (allow('billing')) return '/billing';
  if (allow('integrations')) return '/integrations';
  if (allow('storeSettings')) return '/settings';
  if (allow('homepageSettings')) return '/settings/homepage';
  if (allow('contactInfos')) return '/settings/contact';
  return '/orders';
}

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);
  final bootstrap = ref.watch(bootstrapProvider);
  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final path = state.uri.path;
      final isLoggedIn = authState.isAuthenticated;
      final mode = authState.mode;
      final subscriptionTier = authState.subscriptionTier;
      final isActivateRoute = path == '/activate';
      final isLoginRoute = path == '/login';
      final isRegisterRoute = path == '/register';
      final isAuthRoute = isLoginRoute || isRegisterRoute || isActivateRoute;
      final lockedFeature = FeatureAccess.featureForRoute(state.uri.path);
      final isProvisioned = bootstrap.isProvisioned;

      if (!isProvisioned) {
        if (isActivateRoute || isLoginRoute || isRegisterRoute) {
          return null;
        }
        return '/login';
      }

      if (isActivateRoute) {
        if (isLoggedIn) return '/';
        return null;
      }

      // Local-only runtime skips auth, but hosted feature locks are tier-driven.
      if (mode.skipsAuthentication) {
        if (isLoginRoute || isRegisterRoute) return '/';
        if (lockedFeature != null &&
            FeatureAccess.isLockedForTier(subscriptionTier, lockedFeature)) {
          return '/locked/${lockedFeature.name}';
        }
        return null;
      }

      if (!isLoggedIn && !isAuthRoute) {
        return '/login';
      }

      if (isLoggedIn && isLoginRoute) {
        return '/';
      }

      if (isLoggedIn && authState.user?.isSuperAdmin == true) {
        return '/login';
      }

      if (isLoggedIn && authState.user?.role == 'staff') {
        final resource = _pathToResource(state.uri.path);
        if (resource != null) {
          final perms = authState.staffPermissions;
          if (perms.isEmpty) {
            if (resource != 'orders') return '/orders';
          } else if (!perms.contains('$resource:read')) {
            return _firstAllowedPath(perms);
          }
        }
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/activate',
        pageBuilder: (context, state) => NoTransitionPage(
          key: state.pageKey,
          child: ActivationScreen(
            offlineOnly: state.uri.queryParameters['mode'] == 'offline',
          ),
        ),
      ),
      GoRoute(
        path: '/login',
        pageBuilder: (context, state) =>
            NoTransitionPage(key: state.pageKey, child: const LoginScreen()),
      ),
      GoRoute(
        path: '/register',
        pageBuilder: (context, state) =>
            NoTransitionPage(key: state.pageKey, child: const RegisterScreen()),
      ),
      GoRoute(
        path: '/upgrade',
        pageBuilder: (context, state) =>
            NoTransitionPage(key: state.pageKey, child: const UpgradeScreen()),
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
              child: OrdersScreen(
                initialStatus: state.uri.queryParameters['status'],
              ),
            ),
          ),
          GoRoute(
            path: '/orders/create',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const OrderCreateScreen(),
            ),
          ),
          GoRoute(
            path: '/orders/:id',
            pageBuilder: (context, state) {
              final id = state.pathParameters['id'];
              return NoTransitionPage(
                key: state.pageKey,
                child: OrderDetailScreen(orderId: id ?? ''),
              );
            },
          ),
          GoRoute(
            path: '/sales',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const SalesScreen(),
            ),
          ),
          GoRoute(
            path: '/sales/:id',
            pageBuilder: (context, state) {
              final id = state.pathParameters['id'] ?? '';
              return NoTransitionPage(
                key: state.pageKey,
                child: SaleDetailScreen(saleId: id),
              );
            },
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
            path: '/customers/create',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const CustomerFormScreen(),
            ),
          ),
          GoRoute(
            path: '/customers/edit/:id',
            pageBuilder: (context, state) {
              final id = state.pathParameters['id'];
              return NoTransitionPage(
                key: state.pageKey,
                child: CustomerFormScreen(customerId: id),
              );
            },
          ),
          GoRoute(
            path: '/cash',
            pageBuilder: (context, state) =>
                NoTransitionPage(key: state.pageKey, child: const CashScreen()),
          ),
          GoRoute(
            path: '/cash/:id',
            pageBuilder: (context, state) {
              final id = state.pathParameters['id'] ?? '';
              return NoTransitionPage(
                key: state.pageKey,
                child: CashboxDetailScreen(cashboxId: id),
              );
            },
          ),
          GoRoute(
            path: '/users',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const UsersScreen(),
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
              GoRoute(
                path: 'store',
                pageBuilder: (context, state) => NoTransitionPage(
                  key: state.pageKey,
                  child: const StoreSettingsPage(),
                ),
              ),
              GoRoute(
                path: 'contact',
                pageBuilder: (context, state) => NoTransitionPage(
                  key: state.pageKey,
                  child: const ContactInfosPage(),
                ),
              ),
              GoRoute(
                path: 'appearance',
                pageBuilder: (context, state) => NoTransitionPage(
                  key: state.pageKey,
                  child: const StoreAppearancePage(),
                ),
              ),
              GoRoute(
                path: 'homepage',
                pageBuilder: (context, state) => NoTransitionPage(
                  key: state.pageKey,
                  child: const HomepageSettingsPage(),
                ),
              ),
              GoRoute(
                path: 'legal',
                pageBuilder: (context, state) => NoTransitionPage(
                  key: state.pageKey,
                  child: const LegalPagesPage(),
                ),
              ),
              GoRoute(
                path: 'domains',
                pageBuilder: (context, state) => NoTransitionPage(
                  key: state.pageKey,
                  child: const DomainSettingsPage(),
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/storefront/preview',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const StorefrontToolsScreen(mode: 'preview'),
            ),
          ),
          GoRoute(
            path: '/storefront/builder',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const StorefrontToolsScreen(mode: 'builder'),
            ),
          ),
          GoRoute(
            path: '/storefront/landing-builder',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const StorefrontToolsScreen(mode: 'landing-builder'),
            ),
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
          GoRoute(
            path: '/locked/:feature',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: FeatureLockedScreen(
                featureName: state.pathParameters['feature'] ?? '',
              ),
            ),
          ),
          GoRoute(
            path: '/integrations',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const IntegrationsScreen(),
            ),
          ),
          GoRoute(
            path: '/onboarding',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const OnboardingScreen(),
            ),
          ),
          GoRoute(
            path: '/notifications',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const NotificationsScreen(),
            ),
          ),
        ],
      ),
    ],
  );
});
