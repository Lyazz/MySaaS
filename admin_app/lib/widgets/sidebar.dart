import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../providers/auth_provider.dart';
import '../providers/sidebar_provider.dart';

class Sidebar extends ConsumerWidget {
  const Sidebar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isCollapsed = ref.watch(sidebarProvider);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      width: isCollapsed ? 72 : 280,
      color: const Color(0xFF020617), // Slate-950
      child: Column(
        children: [
          _buildHeader(isCollapsed),
          Expanded(
            child: SingleChildScrollView(
              padding: EdgeInsets.symmetric(
                vertical: 24,
                horizontal: isCollapsed ? 8 : 12,
              ),
              child: Column(
                children: [
                  _buildNavGroup(
                    title: 'Overview',
                    isCollapsed: isCollapsed,
                    items: [
                      _NavItem(
                        route: '/',
                        label: 'Dashboard',
                        icon: LucideIcons.layoutDashboard,
                      ),
                    ],
                    context: context,
                  ),
                  const SizedBox(height: 24),
                  _buildNavGroup(
                    title: 'Catalog',
                    isCollapsed: isCollapsed,
                    items: [
                      _NavItem(
                        route: '/products',
                        label: 'Products',
                        icon: LucideIcons.package,
                      ),
                      _NavItem(
                        route: '/inventory',
                        label: 'Inventory',
                        icon: LucideIcons.warehouse,
                      ),
                      _NavItem(
                        route: '/categories',
                        label: 'Categories',
                        icon: LucideIcons.tags,
                      ),
                      _NavItem(
                        route: '/suppliers',
                        label: 'Suppliers',
                        icon: LucideIcons.truck,
                      ),
                    ],
                    context: context,
                  ),
                  const SizedBox(height: 24),
                  _buildNavGroup(
                    title: 'Sales',
                    isCollapsed: isCollapsed,
                    items: [
                      _NavItem(
                        route: '/orders',
                        label: 'Orders',
                        icon: LucideIcons.shoppingBag,
                      ),
                      _NavItem(
                        route: '/sales',
                        label: 'Sales',
                        icon: LucideIcons.barChart,
                      ),
                      _NavItem(
                        route: '/pos',
                        label: 'Point of Sale',
                        icon: LucideIcons.monitor,
                      ),
                      _NavItem(
                        route: '/purchases',
                        label: 'Purchases',
                        icon: LucideIcons.shoppingCart,
                      ),
                      _NavItem(
                        route: '/customers',
                        label: 'Customers',
                        icon: LucideIcons.users,
                      ),
                    ],
                    context: context,
                  ),
                  const SizedBox(height: 24),
                  _buildNavGroup(
                    title: 'Settings',
                    isCollapsed: isCollapsed,
                    items: [
                      _NavItem(
                        route: '/settings',
                        label: 'Appearance',
                        icon: LucideIcons.palette,
                      ),
                      _NavItem(
                        route: '/delivery',
                        label: 'Delivery',
                        icon: LucideIcons.truck,
                      ),
                      _NavItem(
                        route: '/billing',
                        label: 'Billing',
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

  Widget _buildHeader(bool isCollapsed) {
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
            child: const Text(
              'S',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          if (!isCollapsed) ...[
            const SizedBox(width: 12),
            const Text(
              'Swekly',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w600,
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
              title.toUpperCase(),
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
    final bool isActive = location == item.route;

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
                  const Text(
                    'admin@swekly.com',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Text(
                    'Admin',
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
              tooltip: 'Logout',
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
