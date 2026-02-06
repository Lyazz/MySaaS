import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
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
        title: const Text(
          'Admin Dashboard',
          style: TextStyle(fontWeight: FontWeight.w600),
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
          const SizedBox(width: 280, child: Sidebar()),
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
                    onPressed: () {},
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
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeaderAction(IconData icon, String label, {Color? color}) {
    return TextButton.icon(
      onPressed: () {},
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
    if (GoRouterState.of(context).uri.toString() == '/') return 'Dashboard';
    if (GoRouterState.of(context).uri.toString() == '/products') {
      return 'Products';
    }
    if (GoRouterState.of(context).uri.toString() == '/products/create') {
      return 'Add Product';
    }
    if (GoRouterState.of(context).uri.toString().startsWith('/products/')) {
      return 'Edit Product';
    }
    if (GoRouterState.of(context).uri.toString() == '/orders') return 'Orders';
    if (GoRouterState.of(context).uri.toString() == '/inventory') {
      return 'Inventory';
    }
    if (GoRouterState.of(context).uri.toString() == '/sales') {
      return 'Sales';
    }
    if (GoRouterState.of(context).uri.toString() == '/purchases') {
      return 'Purchases';
    }
    if (GoRouterState.of(context).uri.toString() == '/purchases/create') {
      return 'Add Purchase';
    }
    if (GoRouterState.of(context).uri.toString().startsWith('/purchases/')) {
      return 'Purchase Details';
    }
    if (GoRouterState.of(context).uri.toString() == '/pos') {
      return 'POS';
    }
    if (GoRouterState.of(context).uri.toString() == '/delivery') {
      return 'Delivery Settings';
    }
    if (GoRouterState.of(context).uri.toString() == '/billing') {
      return 'Billing & Subscription';
    }
    if (GoRouterState.of(context).uri.toString() == '/categories') {
      return 'Categories';
    }
    if (GoRouterState.of(context).uri.toString() == '/suppliers') {
      return 'Suppliers';
    }
    if (GoRouterState.of(context).uri.toString() == '/suppliers/create') {
      return 'Add Supplier';
    }
    if (GoRouterState.of(context).uri.toString().startsWith('/suppliers/')) {
      return 'Supplier Details';
    }
    if (GoRouterState.of(context).uri.toString() == '/customers') {
      return 'Customers';
    }
    if (GoRouterState.of(context).uri.toString().startsWith('/customers/')) {
      return 'Customer Details';
    }
    if (GoRouterState.of(context).uri.toString() == '/settings') {
      return 'Settings';
    }
    return 'Admin Dashboard';
  }
}
