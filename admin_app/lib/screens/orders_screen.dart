import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../models/order.dart';
import '../providers/orders_provider.dart';

class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key});

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen> {
  final TextEditingController _searchController = TextEditingController();
  final _debouncer = Debouncer(milliseconds: 500);
  String _selectedStatus = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchOrders();
    });
  }

  void _fetchOrders() {
    ref
        .read(ordersProvider.notifier)
        .fetchOrders(search: _searchController.text, status: _selectedStatus);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ordersState = ref.watch(ordersProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(),
            const SizedBox(height: 24),
            _buildFilters(),
            const SizedBox(height: 24),
            if (ordersState.isLoading)
              const Center(child: CircularProgressIndicator())
            else if (ordersState.error != null)
              Center(child: Text('Error: ${ordersState.error}'))
            else if (ordersState.orders.isEmpty)
              _buildEmptyState()
            else
              _buildOrdersTable(ordersState.orders),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Orders',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Color(0xFF1E293B),
          ),
        ),
        SizedBox(height: 4),
        Text(
          'Manage customer orders',
          style: TextStyle(color: Colors.grey, fontSize: 14),
        ),
      ],
    );
  }

  Widget _buildFilters() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Wrap(
        spacing: 16,
        runSpacing: 16,
        children: [
          // Search
          SizedBox(
            width: 300,
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search by customer name or phone...',
                prefixIcon: const Icon(
                  LucideIcons.search,
                  size: 16,
                  color: Colors.grey,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: Colors.grey[300]!),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
              ),
              onChanged: (value) {
                _debouncer.run(() {
                  _fetchOrders();
                });
              },
            ),
          ),
          // Status Select
          SizedBox(
            width: 200,
            child: InputDecorator(
              decoration: InputDecoration(
                labelText: 'Status Filter',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _selectedStatus,
                  isDense: true,
                  items: const [
                    DropdownMenuItem(value: '', child: Text('All Orders')),
                    DropdownMenuItem(value: 'PENDING', child: Text('Pending')),
                    DropdownMenuItem(
                      value: 'CONFIRMED',
                      child: Text('Confirmed'),
                    ),
                    DropdownMenuItem(value: 'SHIPPED', child: Text('Shipped')),
                    DropdownMenuItem(
                      value: 'DELIVERED',
                      child: Text('Delivered'),
                    ),
                    DropdownMenuItem(
                      value: 'CANCELLED',
                      child: Text('Cancelled'),
                    ),
                    DropdownMenuItem(
                      value: 'RETURNED',
                      child: Text('Returned'),
                    ),
                  ],
                  onChanged: (value) {
                    setState(() => _selectedStatus = value ?? '');
                    _fetchOrders();
                  },
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(LucideIcons.clipboardList, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text(
            'No orders found',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Colors.grey[800],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Try adjusting your filters or wait for new orders.',
            style: TextStyle(color: Colors.grey[500]),
          ),
        ],
      ),
    );
  }

  Widget _buildOrdersTable(List<Order> orders) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: orders.length,
        separatorBuilder: (context, index) =>
            const Divider(height: 1, color: Color(0xFFE2E8F0)),
        itemBuilder: (context, index) {
          final order = orders[index];
          return Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                // Order ID
                Expanded(
                  flex: 2,
                  child: Text(
                    '#${order.id.substring(0, 8)}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                ),
                // Customer
                Expanded(
                  flex: 3,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        order.customerName,
                        style: const TextStyle(
                          fontWeight: FontWeight.w500,
                          fontSize: 14,
                        ),
                      ),
                      Text(
                        order.customerPhone,
                        style: TextStyle(color: Colors.grey[500], fontSize: 12),
                      ),
                    ],
                  ),
                ),
                // Total
                Expanded(
                  flex: 2,
                  child: Text(
                    '\$${order.totalAmount.toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                ),
                // Status
                Expanded(flex: 2, child: _buildStatusBadge(order.status)),
                // Date
                Expanded(
                  flex: 2,
                  child: Text(
                    DateFormat('MMM d, yyyy HH:mm').format(order.createdAt),
                    style: TextStyle(color: Colors.grey[600], fontSize: 13),
                  ),
                ),
                // Actions
                Expanded(
                  flex: 1,
                  child: Align(
                    alignment: Alignment.centerRight,
                    child: IconButton(
                      icon: const Icon(
                        LucideIcons.eye,
                        size: 18,
                        color: Color(0xFF0D9488),
                      ),
                      onPressed: () {
                        // Navigate to order details
                      },
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color color;
    Color bgColor;

    switch (status.toUpperCase()) {
      case 'PENDING':
        color = Colors.orange;
        bgColor = Colors.orange.withValues(alpha: 0.1);
        break;
      case 'CONFIRMED':
        color = Colors.blue;
        bgColor = Colors.blue.withValues(alpha: 0.1);
        break;
      case 'SHIPPED':
        color = Colors.purple;
        bgColor = Colors.purple.withValues(alpha: 0.1);
        break;
      case 'DELIVERED':
        color = Colors.green;
        bgColor = Colors.green.withValues(alpha: 0.1);
        break;
      case 'CANCELLED':
        color = Colors.red;
        bgColor = Colors.red.withValues(alpha: 0.1);
        break;
      case 'RETURNED':
        color = Colors.grey;
        bgColor = Colors.grey.withValues(alpha: 0.1);
        break;
      default:
        color = Colors.grey;
        bgColor = Colors.grey.withValues(alpha: 0.1);
    }

    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          status[0].toUpperCase() + status.substring(1).toLowerCase(),
          style: TextStyle(
            color: color,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

class Debouncer {
  final int milliseconds;
  VoidCallback? action;
  Timer? _timer;

  Debouncer({required this.milliseconds});

  run(VoidCallback action) {
    if (_timer != null) {
      _timer!.cancel();
    }
    _timer = Timer(Duration(milliseconds: milliseconds), action);
  }
}
