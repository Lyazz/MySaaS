import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import '../widgets/admin_stat_card.dart';
import '../providers/orders_provider.dart';
import '../models/order.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(ordersProvider.notifier).fetchOrders());
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildWelcomeSection(),
          const SizedBox(height: 24),
          LayoutBuilder(
            builder: (context, constraints) {
              return _buildStatsGrid(context, constraints);
            },
          ),
          const SizedBox(height: 24),
          _buildRecentOrdersSection(context),
        ],
      ),
    );
  }

  Widget _buildWelcomeSection() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Welcome back, SuperStore',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w600,
                letterSpacing: -0.5,
                color: Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'A quick snapshot of your store.',
              style: TextStyle(fontSize: 14, color: Colors.grey[500]),
            ),
          ],
        ),
        Row(
          children: [
            OutlinedButton.icon(
              onPressed: () {
                ref.read(ordersProvider.notifier).fetchOrders();
              },
              icon: const Icon(LucideIcons.refreshCw, size: 16),
              label: const Text('Refresh'),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.grey[700],
                side: BorderSide(color: Colors.grey[200]!),
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 16,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStatsGrid(BuildContext context, BoxConstraints constraints) {
    // Responsive grid
    final width = constraints.maxWidth;

    // Calculate columns based on width
    int crossAxisCount = 1;
    if (width > 600) crossAxisCount = 2;
    if (width > 1200) crossAxisCount = 4;

    final double spacing = 16;
    final double itemWidth =
        (width - (crossAxisCount - 1) * spacing) / crossAxisCount;

    return Wrap(
      spacing: spacing,
      runSpacing: spacing,
      children: [
        SizedBox(
          width: itemWidth,
          child: const AdminStatCard(
            label: 'Orders (7 days)',
            value: '124',
            icon: LucideIcons.clipboardList,
            tone: 'blue',
          ),
        ),
        SizedBox(
          width: itemWidth,
          child: const AdminStatCard(
            label: 'Revenue (7 days)',
            value: '\$12,450',
            icon: LucideIcons.banknote,
            tone: 'teal',
          ),
        ),
        SizedBox(
          width: itemWidth,
          child: const AdminStatCard(
            label: 'Products',
            value: '45',
            icon: LucideIcons.package,
            tone: 'blue',
          ),
        ),
        SizedBox(
          width: itemWidth,
          child: const AdminStatCard(
            label: 'Low stock',
            value: '3',
            icon: LucideIcons.alertCircle,
            tone: 'orange',
          ),
        ),
      ],
    );
  }

  Widget _buildRecentOrdersSection(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey[200]!),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Recent orders',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Latest orders for this tenant.',
                      style: TextStyle(fontSize: 14, color: Colors.grey[500]),
                    ),
                  ],
                ),
                OutlinedButton.icon(
                  onPressed: () => context.go('/orders'),
                  icon: const Icon(LucideIcons.arrowRight, size: 16),
                  label: const Text('View all'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.grey[700],
                    side: BorderSide(color: Colors.grey[200]!),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),
          _buildOrdersTable(context),
        ],
      ),
    );
  }

  Widget _buildOrdersTable(BuildContext context) {
    final ordersState = ref.watch(ordersProvider);
    final orders = ordersState.orders.take(5).toList();

    if (ordersState.isLoading && orders.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24.0),
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (orders.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24.0),
          child: Text('No orders found'),
        ),
      );
    }

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: orders.length,
      separatorBuilder: (context, index) =>
          const Divider(height: 1, color: Color(0xFFE2E8F0)),
      itemBuilder: (context, index) {
        final order = orders[index];
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Row(
            children: [
              Expanded(
                flex: 2,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '#${order.id.length > 8 ? order.id.substring(0, 8) : order.id}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                flex: 3,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Customer', // Ideally order.customerName if available
                      style: const TextStyle(
                        fontWeight: FontWeight.w500,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  NumberFormat.simpleCurrency().format(order.totalAmount),
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
              ),
              // Hide status on smaller screens if needed, or wrap
              if (MediaQuery.of(context).size.width > 600)
                Expanded(
                  flex: 2,
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.green.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        order.status,
                        style: const TextStyle(
                          color: Colors.green,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                ),
              if (MediaQuery.of(context).size.width > 800)
                Expanded(
                  flex: 2,
                  child: Text(
                    DateFormat.yMd().format(order.createdAt),
                    style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                  ),
                ),
              const SizedBox(width: 8),
              if (MediaQuery.of(context).size.width > 400)
                TextButton.icon(
                  onPressed: () => context.go('/orders/${order.id}'),
                  icon: const Icon(
                    LucideIcons.eye,
                    size: 16,
                    color: Color(0xFF4F46E5),
                  ),
                  label: const Text(
                    'View',
                    style: TextStyle(color: Color(0xFF4F46E5)),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}
