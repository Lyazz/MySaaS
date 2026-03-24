import 'dart:ui';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../providers/auth_provider.dart';
import '../providers/sidebar_provider.dart';
import '../providers/store_settings_provider.dart';
import '../providers/sync_provider.dart';
import '../providers/workspace_provider.dart';
import 'buttons/app_button.dart';
import 'language_switcher_button.dart';
import 'responsive_layout.dart';
import 'sidebar.dart';
import 'offline_banner.dart';
import 'package:url_launcher/url_launcher.dart';

class AppShell extends ConsumerStatefulWidget {
  final Widget child;

  const AppShell({super.key, required this.child});

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  Widget build(BuildContext context) {
    // Initialize background sync loop (online tenants only).
    ref.watch(syncServiceProvider);
    return ResponsiveLayout(
      mobile: _buildMobileLayout(),
      desktop: _buildDesktopLayout(),
    );
  }

  Widget _buildMobileLayout() {
    return Scaffold(
      key: _scaffoldKey,
      appBar: AppBar(
        title: Text(
          _getPageTitle(context),
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 1,
        shadowColor: Colors.black.withValues(alpha: 0.05),
        leading: IconButton(
          icon: const Icon(LucideIcons.menu),
          onPressed: () => _scaffoldKey.currentState?.openDrawer(),
        ),
        actions: const [LanguageSwitcherButton(compact: true)],
      ),
      drawer: const Sidebar(),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(child: widget.child),
        ],
      ),
    );
  }

  Widget _buildDesktopLayout() {
    return Scaffold(
      body: Row(
        children: [
          const Sidebar(),
          Expanded(
            child: Column(
              children: [
                const OfflineBanner(),
                _buildDesktopHeader(),
                Expanded(child: widget.child),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDesktopHeader() {
    final storeState = ref.watch(storeSettingsProvider);
    final storeSlug = storeState.settings.slug;
    final workspaceState = ref.watch(workspaceProvider);

    // Derive storefront URL: strip /api suffix and use slug-based path
    String storefrontUrl = workspaceState.apiBaseUrl.replaceFirst(
      RegExp(r'/api$'),
      '',
    );
    if (storeSlug.isNotEmpty) {
      storefrontUrl = '$storefrontUrl/shop/$storeSlug';
    }

    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          height: 64,
          padding: const EdgeInsets.symmetric(horizontal: 24),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.8),
            border: Border(bottom: BorderSide(color: Colors.grey[200]!)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  IconButton(
                    icon: const Icon(LucideIcons.menu, color: Colors.grey),
                    onPressed: () {
                      ref.read(sidebarProvider.notifier).toggle();
                    },
                  ),
                  const SizedBox(width: 16),
                  Text(
                    _getPageTitle(context),
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1E293B), // Slate-800
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  _buildHeaderAction(
                    LucideIcons.eye,
                    'admin.actions.viewStore'.tr(),
                    onPressed: () async {
                      final uri = Uri.tryParse(storefrontUrl);
                      if (uri != null) {
                        await launchUrl(
                          uri,
                          mode: LaunchMode.externalApplication,
                        );
                      }
                    },
                  ),
                  Container(
                    height: 32,
                    width: 1,
                    color: Colors.grey[200],
                    margin: const EdgeInsets.symmetric(horizontal: 16),
                  ),
                  const LanguageSwitcherButton(),
                  Container(
                    height: 32,
                    width: 1,
                    color: Colors.grey[200],
                    margin: const EdgeInsets.symmetric(horizontal: 16),
                  ),
                  _buildHeaderAction(
                    LucideIcons.logOut,
                    'admin.actions.logout'.tr(),
                    onPressed: () {
                      ref.read(authProvider.notifier).logout();
                      context.go('/login');
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeaderAction(
    IconData icon,
    String label, {
    VoidCallback? onPressed,
  }) {
    final resolvedOnPressed = onPressed ?? () {};
    if (icon == LucideIcons.eye) {
      return AppButton.secondary(
        label: label,
        icon: icon,
        size: AppButtonSize.sm,
        onPressed: resolvedOnPressed,
      );
    }

    return AppButton.secondary(
      label: label,
      icon: icon,
      size: AppButtonSize.sm,
      onPressed: resolvedOnPressed,
    );
  }

  String _getPageTitle(BuildContext context) {
    final String location = GoRouterState.of(context).uri.toString();
    if (location == '/' || location.startsWith('/dashboard')) {
      return 'admin.nav.dashboard'.tr();
    }
    if (location == '/products') return 'admin.nav.products'.tr();
    if (location == '/products/create') {
      return 'admin.pages.products.create.title'.tr();
    }
    if (location.startsWith('/products/')) {
      return 'admin.pages.products.edit.title'.tr();
    }
    if (location == '/orders') return 'admin.nav.orders'.tr();
    if (location.startsWith('/orders/')) {
      return 'admin.pages.orders.detail.metaTitle'.tr();
    }
    if (location == '/inventory') return 'admin.nav.inventory'.tr();
    if (location == '/sales') return 'admin.pages.sales.index.title'.tr();
    if (location.startsWith('/sales/')) {
      return 'admin.pages.sale.detail.metaTitle'.tr();
    }
    if (location == '/purchases')
      return 'admin.pages.purchases.index.title'.tr();
    if (location == '/purchases/create') {
      return 'admin.pages.purchases.create.title'.tr();
    }
    if (location.startsWith('/purchases/')) {
      return 'admin.pages.purchases.detail.metaTitle'.tr();
    }
    if (location == '/pos') return 'admin.nav.pos'.tr();
    if (location == '/delivery') return 'admin.nav.delivery'.tr();
    if (location == '/billing') return 'admin.nav.billing'.tr();
    if (location == '/cash') return 'admin.nav.cash'.tr();
    if (location.startsWith('/cash/')) {
      return 'admin.pages.cash.cashbox.titleFallback'.tr();
    }
    if (location == '/categories')
      return 'admin.pages.categories.index.title'.tr();
    if (location == '/categories/create') {
      return 'admin.pages.categories.create.title'.tr();
    }
    if (location.startsWith('/categories/')) {
      return 'admin.pages.categories.edit.title'.tr();
    }
    if (location == '/suppliers')
      return 'admin.pages.suppliers.index.title'.tr();
    if (location == '/suppliers/create') {
      return 'admin.pages.suppliers.create.title'.tr();
    }
    if (location.startsWith('/suppliers/')) {
      return 'admin.pages.suppliers.edit.title'.tr();
    }
    if (location == '/customers')
      return 'admin.pages.customers.index.title'.tr();
    if (location == '/customers/create') {
      return 'admin.pages.customers.create.title'.tr();
    }
    if (location.startsWith('/customers/edit/')) {
      return 'admin.pages.customers.edit.title'.tr();
    }
    if (location.startsWith('/customers/')) {
      return 'admin.pages.customers.detail.fallbackTitle'.tr();
    }
    if (location == '/users') return 'admin.nav.users'.tr();
    if (location == '/settings') return 'admin.nav.settings'.tr();
    if (location == '/settings/printers') return 'Printers';
    return 'admin.nav.dashboard'.tr();
  }
}
