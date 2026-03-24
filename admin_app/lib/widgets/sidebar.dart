import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:easy_localization/easy_localization.dart';
import '../providers/auth_provider.dart';
import '../providers/sidebar_provider.dart';
import '../providers/store_settings_provider.dart';

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
      width: isCollapsed ? 72 : 280,
      color: const Color(0xFF020617), // Slate-950
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
    final initial = storeName.isNotEmpty ? storeName[0].toUpperCase() : 'S';

    return Container(
      height: 64,
      padding: EdgeInsets.symmetric(horizontal: isCollapsed ? 0 : 24),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.white10)),
      ),
      child: Row(
        mainAxisAlignment: isCollapsed
            ? MainAxisAlignment.center
            : MainAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: const Color(0xFF0D9488), // Teal-600
              borderRadius: BorderRadius.circular(8),
            ),
            alignment: Alignment.center,
            child: Text(
              initial,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          if (!isCollapsed) ...[
            const SizedBox(width: 12),
            Flexible(
              child: Text(
                storeName,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
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
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Text(
              title,
              style: const TextStyle(
                color: Colors.grey,
                fontSize: 11,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
              ),
            ),
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
      height: 44, // h-11
      padding: EdgeInsets.symmetric(horizontal: isCollapsed ? 0 : 12),
      margin: const EdgeInsets.only(bottom: 4),
      decoration: BoxDecoration(
        // Allow hover effect to be handled by wrapping widget or global theme if needed,
        // but here we manually handle active state background.
        // For hover, InkWell provides a splash, but we want a specific hover color.
        // Flutter's InkWell hoverColor can be set.
        color: isActive
            ? Colors.white.withValues(alpha: 0.1)
            : null, // Transparent by default, hover handled by InkWell
        borderRadius: BorderRadius.circular(8),
        border: isActive
            ? Border.all(color: Colors.white.withValues(alpha: 0.2), width: 1)
            : null,
      ),
      child: Stack(
        alignment: isCollapsed ? Alignment.center : Alignment.centerLeft,
        children: [
          if (isActive)
            Positioned(
              left: isCollapsed ? 0 : -12,
              top: 6,
              bottom: 6,
              width: 4,
              child: Container(
                decoration: const BoxDecoration(
                  color: Color(0xFF0D9488), // Teal-600
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
                size: 20,
                color: isActive
                    ? const Color(0xFF0D9488)
                    : const Color(0xFF94A3B8), // Slate-400
              ),
              if (!isCollapsed) ...[
                const SizedBox(width: 12),
                Text(
                  item.label,
                  style: TextStyle(
                    color: isActive
                        ? Colors.white
                        : const Color(0xFF94A3B8), // Slate-400
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
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

    return Container(
      padding: EdgeInsets.all(isCollapsed ? 8 : 16),
      decoration: const BoxDecoration(
        color: Colors.black26,
        border: Border(top: BorderSide(color: Colors.white10)),
      ),
      child: Row(
        mainAxisAlignment: isCollapsed
            ? MainAxisAlignment.center
            : MainAxisAlignment.start,
        children: [
          const CircleAvatar(
            backgroundColor: Color(0xFF1E293B),
            child: Text('A', style: TextStyle(color: Colors.white)),
          ),
          if (!isCollapsed) ...[
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    email,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Text(
                    role,
                    style: TextStyle(color: Colors.grey[400], fontSize: 12),
                  ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(
                LucideIcons.logOut,
                color: Colors.grey,
                size: 20,
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
