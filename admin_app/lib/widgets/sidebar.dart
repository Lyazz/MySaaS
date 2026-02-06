import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';

class Sidebar extends StatelessWidget {
  const Sidebar({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF020617), // Slate-950
      child: Column(
        children: [
          _buildHeader(),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 12),
              child: Column(
                children: [
                  _buildNavGroup(
                    title: 'Overview',
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
          _buildUserSection(),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 24),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.white10)),
      ),
      child: Row(
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
      ),
    );
  }

  Widget _buildNavGroup({
    required String title,
    required List<_NavItem> items,
    required BuildContext context,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
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
        ...items.map((item) => _buildNavItem(context, item)),
      ],
    );
  }

  Widget _buildNavItem(BuildContext context, _NavItem item) {
    final String location = GoRouterState.of(context).uri.toString();
    final bool isActive = location == item.route;

    return InkWell(
      onTap: () {
        context.go(item.route);
      },
      borderRadius: BorderRadius.circular(8),
      child: Container(
        height: 44, // h-11
        padding: const EdgeInsets.symmetric(horizontal: 12),
        margin: const EdgeInsets.only(bottom: 4),
        decoration: BoxDecoration(
          color: isActive
              ? Colors.white.withValues(alpha: 0.1)
              : Colors.transparent, // hover:bg-white/5 handled by InkWell
          borderRadius: BorderRadius.circular(8),
          border: isActive
              ? Border.all(color: Colors.white.withValues(alpha: 0.2), width: 1)
              : null,
        ),
        child: Stack(
          children: [
            if (isActive)
              Positioned(
                left: -12,
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
              children: [
                Icon(
                  item.icon,
                  size: 20,
                  color: isActive
                      ? const Color(0xFF0D9488)
                      : const Color(0xFF94A3B8), // Slate-400
                ),
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
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUserSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: Colors.black26,
        border: Border(top: BorderSide(color: Colors.white10)),
      ),
      child: Row(
        children: [
          const CircleAvatar(
            backgroundColor: Color(0xFF1E293B),
            child: Text('A', style: TextStyle(color: Colors.white)),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'admin@swekly.com',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                'Admin',
                style: TextStyle(color: Colors.grey[400], fontSize: 12),
              ),
            ],
          ),
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
