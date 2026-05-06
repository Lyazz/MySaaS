import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:easy_localization/easy_localization.dart';
import '../providers/auth_provider.dart';
import '../providers/sidebar_provider.dart';
import '../providers/store_settings_provider.dart';
import '../theme/app_theme.dart';

class Sidebar extends ConsumerWidget {
  const Sidebar({super.key});

  bool _canRead(AuthState auth, String resource) {
    final user = auth.user;
    if (user == null) return false;
    if (user.role != 'staff') return true;

    final perms = auth.staffPermissions;
    if (perms.isEmpty) return resource == 'orders';
    return perms.contains('$resource:read');
  }

  bool _isTenantAdmin(AuthState auth) {
    final user = auth.user;
    if (user == null) return false;
    return user.role == 'owner' || user.role == 'admin';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isCollapsed = ref.watch(sidebarProvider);
    final authState = ref.watch(authProvider);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      width: isCollapsed ? 64 : 220,
      color: AppColors.sidebarBg,
      child: Column(
        children: [
          _buildHeader(isCollapsed, ref),
          Expanded(
            child: SingleChildScrollView(
              padding: EdgeInsets.symmetric(
                vertical: 24,
                horizontal: isCollapsed ? 8 : 12,
              ),
              child: Column(
                children: [
                  _buildNavGroup(
                    title: 'admin.nav.overview'.tr(),
                    isCollapsed: isCollapsed,
                    items: [
                      if (_canRead(authState, 'dashboard'))
                        _NavItem(
                          route: '/',
                          label: 'admin.nav.dashboard'.tr(),
                          icon: LucideIcons.layoutDashboard,
                        ),
                    ],
                    context: context,
                  ),
                  const SizedBox(height: 24),
                  _buildNavGroup(
                    title: 'admin.nav.catalog'.tr(),
                    isCollapsed: isCollapsed,
                    items: [
                      if (_canRead(authState, 'products'))
                        _NavItem(
                          route: '/products',
                          label: 'admin.nav.products'.tr(),
                          icon: LucideIcons.package,
                        ),
                      if (_canRead(authState, 'inventory'))
                        _NavItem(
                          route: '/inventory',
                          label: 'admin.nav.inventory'.tr(),
                          icon: LucideIcons.warehouse,
                        ),
                      if (_canRead(authState, 'categories'))
                        _NavItem(
                          route: '/categories',
                          label: 'admin.nav.categories'.tr(),
                          icon: LucideIcons.tags,
                        ),
                      if (_canRead(authState, 'suppliers'))
                        _NavItem(
                          route: '/suppliers',
                          label: 'admin.nav.suppliers'.tr(),
                          icon: LucideIcons.truck,
                        ),
                    ],
                    context: context,
                  ),
                  const SizedBox(height: 24),
                  _buildNavGroup(
                    title: 'admin.nav.sales'.tr(),
                    isCollapsed: isCollapsed,
                    items: [
                      if (_canRead(authState, 'orders'))
                        _NavItem(
                          route: '/orders',
                          label: 'admin.nav.orders'.tr(),
                          icon: LucideIcons.shoppingBag,
                        ),
                      if (_canRead(authState, 'sales'))
                        _NavItem(
                          route: '/sales',
                          label: 'admin.nav.salesItem'.tr(),
                          icon: LucideIcons.barChart,
                        ),
                      if (_canRead(authState, 'pos'))
                        _NavItem(
                          route: '/pos',
                          label: 'admin.nav.pos'.tr(),
                          icon: LucideIcons.monitor,
                        ),
                      if (_canRead(authState, 'purchases'))
                        _NavItem(
                          route: '/purchases',
                          label: 'admin.nav.purchases'.tr(),
                          icon: LucideIcons.shoppingCart,
                        ),
                      if (_canRead(authState, 'customers'))
                        _NavItem(
                          route: '/customers',
                          label: 'admin.nav.customers'.tr(),
                          icon: LucideIcons.users,
                        ),
                      if (_canRead(authState, 'cash'))
                        _NavItem(
                          route: '/cash',
                          label: 'admin.nav.cash'.tr(),
                          icon: LucideIcons.wallet,
                        ),
                    ],
                    context: context,
                  ),
                  const SizedBox(height: 24),
                  _buildNavGroup(
                    title: 'admin.nav.settings'.tr(),
                    isCollapsed: isCollapsed,
                    items: [
                      _NavItem(
                        route: '/settings',
                        label: 'admin.nav.settings'.tr(),
                        icon: LucideIcons.palette,
                      ),
                      if (_isTenantAdmin(authState))
                        _NavItem(
                          route: '/users',
                          label: 'admin.nav.users'.tr(),
                          icon: LucideIcons.users,
                        ),
                      if (_canRead(authState, 'delivery'))
                        _NavItem(
                          route: '/delivery',
                          label: 'admin.nav.deliveryItem'.tr(),
                          icon: LucideIcons.truck,
                        ),
                      if (_canRead(authState, 'integrations'))
                        _NavItem(
                          route: '/integrations',
                          label: 'Integrations',
                          icon: LucideIcons.plug,
                        ),
                      if (_canRead(authState, 'billing'))
                        _NavItem(
                          route: '/billing',
                          label: 'admin.nav.billing'.tr(),
                          icon: LucideIcons.creditCard,
                        ),
                    ],
                    context: context,
                  ),
                ],
              ),
            ),
          ),
          _buildUserSection(context, ref, isCollapsed),
        ],
      ),
    );
  }

  Widget _buildHeader(bool isCollapsed, WidgetRef ref) {
    final storeState = ref.watch(storeSettingsProvider);
    final storeName = storeState.settings.name.isNotEmpty
        ? storeState.settings.name
        : 'Swekly';
    final storeSlug = storeState.settings.slug;
    final initial = storeName.isNotEmpty ? storeName[0].toUpperCase() : 'S';

    return Container(
      height: 52,
      padding: EdgeInsets.symmetric(horizontal: isCollapsed ? 0 : 12),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppColors.surfaceBorder)),
      ),
      child: Row(
        mainAxisAlignment: isCollapsed
            ? MainAxisAlignment.center
            : MainAxisAlignment.start,
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: AppColors.brand,
              borderRadius: BorderRadius.circular(7),
            ),
            alignment: Alignment.center,
            child: Text(
              initial,
              style: const TextStyle(
                color: AppColors.brandContrast,
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
          ),
          if (!isCollapsed) ...[
            const SizedBox(width: 10),
            Flexible(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    storeName,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                      height: 1.2,
                    ),
                  ),
                  if (storeSlug.isNotEmpty)
                    Text(
                      '$storeSlug.swekly.com',
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textTertiary,
                        fontSize: 10,
                        height: 1.3,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildNavGroup({
    required String title,
    required List<_NavItem> items,
    required bool isCollapsed,
    required BuildContext context,
  }) {
    return Column(
      crossAxisAlignment: isCollapsed
          ? CrossAxisAlignment.center
          : CrossAxisAlignment.start,
      children: [
        if (!isCollapsed)
          Padding(
            padding: const EdgeInsets.only(left: 10, bottom: 4, top: 4),
            child: Text(
              title.toUpperCase(),
              style: const TextStyle(
                color: AppColors.textTertiary,
                fontSize: 9,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.12,
              ),
            ),
          )
        else
          Container(
            margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
            height: 1,
            color: AppColors.surfaceBorder,
          ),
        ...items.map((item) => _buildNavItem(context, item, isCollapsed)),
      ],
    );
  }

  Widget _buildNavItem(BuildContext context, _NavItem item, bool isCollapsed) {
    final String location = GoRouterState.of(context).uri.toString();
    final bool isActive = item.route == '/'
        ? location == '/'
        : (location == item.route || location.startsWith('${item.route}/'));

    // Base content of the nav item
    Widget content = Container(
      height: 36,
      padding: EdgeInsets.symmetric(horizontal: isCollapsed ? 0 : 10),
      margin: const EdgeInsets.only(bottom: 1),
      decoration: BoxDecoration(
        color: isActive ? AppColors.brand.withValues(alpha: 0.12) : null,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Stack(
        alignment: isCollapsed ? Alignment.center : Alignment.centerLeft,
        children: [
          if (isActive)
            Positioned(
              left: isCollapsed ? 0 : -10,
              top: 6,
              bottom: 6,
              width: 3,
              child: Container(
                decoration: const BoxDecoration(
                  color: AppColors.brand,
                  borderRadius: BorderRadius.horizontal(
                    right: Radius.circular(99),
                  ),
                ),
              ),
            ),
          Row(
            mainAxisAlignment: isCollapsed
                ? MainAxisAlignment.center
                : MainAxisAlignment.start,
            children: [
              Icon(
                item.icon,
                size: 16,
                color: isActive ? AppColors.brand : AppColors.textMuted,
              ),
              if (!isCollapsed) ...[
                const SizedBox(width: 10),
                Text(
                  item.label,
                  style: TextStyle(
                    color: isActive
                        ? AppColors.textPrimary
                        : AppColors.textSecondary,
                    fontSize: 13,
                    fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );

    // Wrap with Tooltip if collapsed
    if (isCollapsed) {
      content = Tooltip(
        message: item.label,
        preferBelow: false,
        verticalOffset: 0,
        margin: const EdgeInsets.only(left: 16), // Show to the right
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B), // Slate-800
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: Colors.white10),
        ),
        textStyle: const TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
        child: content,
      );
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          // Close the drawer if it's open (mobile layout)
          if (Scaffold.of(context).hasDrawer &&
              Scaffold.of(context).isDrawerOpen) {
            Navigator.of(context).pop();
          }
          context.go(item.route);
        },
        hoverColor: Colors.white.withValues(alpha: 0.05), // hover:bg-white/5
        borderRadius: BorderRadius.circular(8),
        child: content,
      ),
    );
  }

  Widget _buildUserSection(
    BuildContext context,
    WidgetRef ref,
    bool isCollapsed,
  ) {
    final auth = ref.watch(authProvider);
    final user = auth.user;
    final email = user?.email ?? '—';
    final role = user?.role ?? '—';

    final emailInitial = (user?.email ?? 'A')[0].toUpperCase();

    return Container(
      padding: EdgeInsets.all(isCollapsed ? 8 : 12),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: AppColors.surfaceBorder)),
      ),
      child: Row(
        mainAxisAlignment: isCollapsed
            ? MainAxisAlignment.center
            : MainAxisAlignment.start,
        children: [
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: AppColors.surface3,
              borderRadius: BorderRadius.circular(99),
              border: Border.all(color: AppColors.surfaceBorder),
            ),
            alignment: Alignment.center,
            child: Text(
              emailInitial,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          if (!isCollapsed) ...[
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    email,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  Text(
                    role,
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(
                LucideIcons.logOut,
                color: AppColors.textMuted,
                size: 16,
              ),
              onPressed: () {
                ref.read(authProvider.notifier).logout();
                context.go('/login');
              },
              tooltip: 'admin.actions.logout'.tr(),
            ),
          ],
        ],
      ),
    );
  }
}

class _NavItem {
  final String route;
  final String label;
  final IconData icon;

  _NavItem({required this.route, required this.label, required this.icon});
}
