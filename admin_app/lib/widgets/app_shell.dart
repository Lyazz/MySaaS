import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../providers/auth_provider.dart';
import '../providers/sidebar_provider.dart';
import 'responsive_layout.dart';
import 'sidebar.dart';

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
      ),
      drawer: const Sidebar(),
      body: widget.child,
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
                  _buildHeaderAction(LucideIcons.externalLink, 'View Store'),
                  Container(
                    height: 32,
                    width: 1,
                    color: Colors.grey[200],
                    margin: const EdgeInsets.symmetric(horizontal: 16),
                  ),
                  _buildHeaderAction(
                    LucideIcons.logOut,
                    'Logout',
                    color: Colors.red,
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
    Color? color,
    VoidCallback? onPressed,
  }) {
    return TextButton.icon(
      onPressed: onPressed ?? () {},
      icon: Icon(icon, size: 16, color: color ?? Colors.grey[600]),
      label: Text(
        label,
        style: TextStyle(
          color: color ?? Colors.grey[600],
          fontWeight: FontWeight.w500,
        ),
      ),
      style: TextButton.styleFrom(
        backgroundColor: (color ?? Colors.grey[100])!.withValues(alpha: 0.1),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }

  String _getPageTitle(BuildContext context) {
    final String location = GoRouterState.of(context).uri.toString();
    if (location == '/') return 'Dashboard';
    if (location == '/products') return 'Products';
    if (location == '/products/create') return 'Add Product';
    if (location.startsWith('/products/')) return 'Edit Product';
    if (location == '/orders') return 'Orders';
    if (location == '/inventory') return 'Inventory';
    if (location == '/sales') return 'Sales';
    if (location == '/purchases') return 'Purchases';
    if (location == '/purchases/create') return 'Add Purchase';
    if (location.startsWith('/purchases/')) return 'Purchase Details';
    if (location == '/pos') return 'POS';
    if (location == '/delivery') return 'Delivery Settings';
    if (location == '/billing') return 'Billing & Subscription';
    if (location == '/categories') return 'Categories';
    if (location == '/suppliers') return 'Suppliers';
    if (location == '/suppliers/create') return 'Add Supplier';
    if (location.startsWith('/suppliers/')) return 'Supplier Details';
    if (location == '/customers') return 'Customers';
    if (location.startsWith('/customers/')) return 'Customer Details';
    if (location == '/settings') return 'App Settings';
    if (location == '/settings/printers') return 'Printer Settings';
    return 'Admin Dashboard';
  }
}
