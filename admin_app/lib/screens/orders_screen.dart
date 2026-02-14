import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../models/order.dart';
import '../providers/orders_provider.dart';
import '../utils/debouncer.dart';
import '../widgets/responsive_paginated_table.dart';
// import '../widgets/responsive_filter_bar.dart';

class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key});

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen> {
  final TextEditingController _searchController = TextEditingController();
  final _debouncer = Debouncer(milliseconds: 500);
  String _selectedStatus = '';

  DateTimeRange? _selectedDateRange;

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
        .fetchOrders(
          search: _searchController.text,
          status: _selectedStatus,
          startDate: _selectedDateRange?.start,
          endDate: _selectedDateRange?.end,
        );
  }

  Future<void> _pickDateRange() async {
    final now = DateTime.now();
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2023),
      lastDate: now,
      initialDateRange: _selectedDateRange,
    );
    if (picked != null) {
      setState(() => _selectedDateRange = picked);
      _fetchOrders();
    }
  }

  @override
  void dispose() {
    _debouncer.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ordersState = ref.watch(ordersProvider);
    final isMobile = MediaQuery.of(context).size.width < 800;

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB), // Gray-50
      body: SingleChildScrollView(
        padding: EdgeInsets.all(isMobile ? 16 : 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!isMobile) ...[_buildHeader(), const SizedBox(height: 24)],
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
            color: Color(0xFF111827), // Gray-900
            letterSpacing: -0.5,
          ),
        ),
        SizedBox(height: 4),
        Text(
          'Manage customer orders',
          style: TextStyle(fontSize: 14, color: Color(0xFF6B7280)), // Gray-500
        ),
      ],
    );
  }

  Widget _buildFilters() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search orders...',
                    prefixIcon: const Icon(
                      LucideIcons.search,
                      size: 16,
                      color: Color(0xFF9CA3AF), // Gray-400
                    ),
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 0,
                    ),
                  ),
                  onChanged: (value) => _debouncer.run(() => _fetchOrders()),
                ),
              ),
              const SizedBox(width: 8),
              // Date Range Picker
              InkWell(
                onTap: _pickDateRange,
                borderRadius: BorderRadius.circular(6),
                child: Container(
                  height: 36,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        LucideIcons.calendar,
                        size: 14,
                        color: _selectedDateRange == null
                            ? const Color(0xFF6B7280)
                            : const Color(0xFF0F766E),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _selectedDateRange == null
                            ? 'Date Range'
                            : '${DateFormat('MMM d').format(_selectedDateRange!.start)} - ${DateFormat('MMM d').format(_selectedDateRange!.end)}',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: _selectedDateRange == null
                              ? const Color(0xFF374151)
                              : const Color(0xFF0F766E),
                        ),
                      ),
                      if (_selectedDateRange != null) ...[
                        const SizedBox(width: 8),
                        InkWell(
                          onTap: () {
                            setState(() => _selectedDateRange = null);
                            _fetchOrders();
                          },
                          child: const Icon(
                            LucideIcons.x,
                            size: 12,
                            color: Color(0xFF6B7280),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Status Dropdown
              Container(
                height: 36,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedStatus,
                    icon: const Icon(
                      LucideIcons.chevronDown,
                      size: 14,
                      color: Color(0xFF6B7280),
                    ),
                    items: const [
                      DropdownMenuItem(value: '', child: Text('All Status')),
                      DropdownMenuItem(
                        value: 'PENDING',
                        child: Text('Pending'),
                      ),
                      DropdownMenuItem(
                        value: 'CONFIRMED',
                        child: Text('Confirmed'),
                      ),
                      DropdownMenuItem(
                        value: 'SHIPPED',
                        child: Text('Shipped'),
                      ),
                      DropdownMenuItem(
                        value: 'DELIVERED',
                        child: Text('Delivered'),
                      ),
                      DropdownMenuItem(
                        value: 'CANCELLED',
                        child: Text('Cancelled'),
                      ),
                    ],
                    onChanged: (value) {
                      setState(() => _selectedStatus = value ?? '');
                      _fetchOrders();
                    },
                    style: const TextStyle(
                      color: Color(0xFF374151),
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ],
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
    return ResponsivePaginatedTable<Order>(
      items: orders,
      minWidth: 1000,
      header: Row(
        children: [
          _buildHeaderCell('ORDER ID', flex: 2),
          _buildHeaderCell('CUSTOMER', flex: 3),
          _buildHeaderCell('TOTAL', flex: 2),
          _buildHeaderCell('STATUS', flex: 2),
          _buildHeaderCell('DATE', flex: 2),
          const Expanded(flex: 1, child: SizedBox()), // Actions
        ],
      ),
      rowBuilder: (context, order, index) {
        return Padding(
          padding: EdgeInsets.symmetric(
            horizontal: MediaQuery.of(context).size.width < 800 ? 12 : 24,
            vertical: 12,
          ),
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
                    color: Color(0xFF111827), // Gray-900
                    fontFamily:
                        'RobotoMono', // Optional: if you have a mono font
                  ),
                ),
              ),
              // Customer
              Expanded(
                flex: 3,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      order.customerName,
                      style: const TextStyle(
                        fontWeight: FontWeight.w500,
                        fontSize: 14,
                        color: Color(0xFF1F2937), // Gray-800
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      order.customerPhone,
                      style: const TextStyle(
                        color: Color(0xFF6B7280), // Gray-500
                        fontSize: 12,
                      ),
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
                    color: Color(0xFF111827), // Gray-900
                  ),
                ),
              ),
              // Status
              Expanded(flex: 2, child: _buildStatusBadge(order.status)),
              // Date
              Expanded(
                flex: 2,
                child: Text(
                  DateFormat('MMM d, yyyy').format(order.createdAt),
                  style: const TextStyle(
                    color: Color(0xFF6B7280), // Gray-500
                    fontSize: 13,
                  ),
                ),
              ),
              // Actions
              Expanded(
                flex: 1,
                child: Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () {
                      context.push('/orders/${order.id}');
                    },
                    style: TextButton.styleFrom(
                      foregroundColor: const Color(0xFF0F766E), // Teal-700
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      textStyle: const TextStyle(fontWeight: FontWeight.w500),
                    ),
                    child: const Text('View'),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildHeaderCell(String text, {required int flex}) {
    return Expanded(
      flex: flex,
      child: Text(
        text,
        style: const TextStyle(
          color: Color(0xFF6B7280), // Gray-500
          fontSize: 11,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color color;
    Color bgColor;

    switch (status.toUpperCase()) {
      case 'PENDING':
        color = const Color(0xFFB45309); // Amber-700
        bgColor = const Color(0xFFFEF3C7); // Amber-100
        break;
      case 'CONFIRMED':
        color = const Color(0xFF0369A1); // Sky-700
        bgColor = const Color(0xFFE0F2FE); // Sky-100
        break;
      case 'SHIPPED':
        color = const Color(0xFF7E22CE); // Purple-700
        bgColor = const Color(0xFFF3E8FF); // Purple-100
        break;
      case 'DELIVERED':
        color = const Color(0xFF15803D); // Green-700
        bgColor = const Color(0xFFDCFCE7); // Green-100
        break;
      case 'CANCELLED':
        color = const Color(0xFFB91C1C); // Red-700
        bgColor = const Color(0xFFFEE2E2); // Red-100
        break;
      case 'RETURNED':
        color = const Color(0xFF374151); // Gray-700
        bgColor = const Color(0xFFF3F4F6); // Gray-100
        break;
      default:
        color = const Color(0xFF374151); // Gray-700
        bgColor = const Color(0xFFF3F4F6); // Gray-100
    }

    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(9999), // Pill shape
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
