import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../providers/customers_provider.dart';
import '../models/customer.dart';
import '../utils/debouncer.dart';
import '../widgets/responsive_paginated_table.dart';

class CustomersScreen extends ConsumerStatefulWidget {
  const CustomersScreen({super.key});

  @override
  ConsumerState<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends ConsumerState<CustomersScreen> {
  final TextEditingController _searchController = TextEditingController();
  final Debouncer _searchDebouncer = Debouncer(milliseconds: 300);

  @override
  void dispose() {
    _searchDebouncer.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final customersState = ref.watch(customersProvider);
    final customers = customersState.customers;
    final isMobile = MediaQuery.of(context).size.width < 800;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      floatingActionButton: isMobile
          ? FloatingActionButton(
              onPressed: () {},
              backgroundColor: const Color(0xFF0F172A),
              child: const Icon(LucideIcons.plus, color: Colors.white),
            )
          : null,
      body: SingleChildScrollView(
        child: Padding(
          padding: EdgeInsets.all(isMobile ? 16 : 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (!isMobile) ...[
                // Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Customers',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF111827), // Gray-900
                            letterSpacing: -0.5,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Manage your customer base',
                          style: TextStyle(
                            color: Color(0xFF6B7280),
                            fontSize: 14,
                          ), // Gray-500
                        ),
                      ],
                    ),
                    ElevatedButton.icon(
                      onPressed: () {},
                      icon: const Icon(LucideIcons.plus, size: 16),
                      label: const Text('Add Customer'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F172A), // Slate-900
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        elevation: 0,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
              ],

              // Search and Sort
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _searchController,
                        decoration: const InputDecoration(
                          hintText: 'Search customers...',
                          prefixIcon: Icon(
                            LucideIcons.search,
                            size: 18,
                            color: Color(0xFF9CA3AF),
                          ),
                          border: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 14,
                          ),
                        ),
                        onChanged: (value) =>
                            _searchDebouncer.run(() => setState(() {})),
                      ),
                    ),
                    Container(
                      height: 24,
                      width: 1,
                      color: const Color(0xFFE5E7EB),
                      margin: const EdgeInsets.symmetric(horizontal: 8),
                    ),
                    Padding(
                      padding: const EdgeInsets.only(right: 12),
                      child: Row(
                        children: [
                          const Text(
                            'Sort by:',
                            style: TextStyle(
                              fontSize: 13,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF3F4F6),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              children: [
                                const Text(
                                  'Name',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                    color: Color(0xFF374151),
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Icon(
                                  LucideIcons.chevronDown,
                                  size: 14,
                                  color: Color(0xFF6B7280),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Expanded(
                child: customersState.isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : _buildCustomersTable(customers),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCustomersTable(List<Customer> customers) {
    return ResponsivePaginatedTable<Customer>(
      items: customers,
      minWidth: 900,
      header: const Row(
        children: [
          Expanded(
            flex: 3,
            child: Text(
              'CUSTOMER',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 11,
                color: Color(0xFF6B7280),
                letterSpacing: 0.5,
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              'PHONE',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 11,
                color: Color(0xFF6B7280),
                letterSpacing: 0.5,
              ),
            ),
          ),
          Expanded(
            flex: 1,
            child: Text(
              'ORDERS',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 11,
                color: Color(0xFF6B7280),
                letterSpacing: 0.5,
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              'TOTAL SPENT',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 11,
                color: Color(0xFF6B7280),
                letterSpacing: 0.5,
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              'LAST ORDER',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 11,
                color: Color(0xFF6B7280),
                letterSpacing: 0.5,
              ),
            ),
          ),
          SizedBox(width: 40),
        ],
      ),
      rowBuilder: (context, customer, index) {
        return InkWell(
          onTap: () => context.go('/customers/${customer.id}'),
          child: Padding(
            padding: EdgeInsets.symmetric(
              horizontal: MediaQuery.of(context).size.width < 800 ? 12 : 24,
              vertical: 16,
            ),
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF), // Blue-50
                          borderRadius: BorderRadius.circular(20),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          customer.name.isNotEmpty
                              ? customer.name[0].toUpperCase()
                              : '?',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF3B82F6), // Blue-500
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            customer.name,
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF111827), // Gray-900
                              fontSize: 14,
                            ),
                          ),
                          if (customer.address != null)
                            Text(
                              customer.address!,
                              style: const TextStyle(
                                fontSize: 13,
                                color: Color(0xFF6B7280), // Gray-500
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Text(
                    customer.phone,
                    style: const TextStyle(
                      fontSize: 13,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                ),
                Expanded(
                  flex: 1,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF3F4F6),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${customer.ordersCount}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF374151),
                      ),
                    ),
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Text(
                    NumberFormat.simpleCurrency().format(customer.totalSpent),
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF111827),
                    ),
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Text(
                    customer.lastOrderAt != null
                        ? DateFormat.yMMMd().format(customer.lastOrderAt!)
                        : '-',
                    style: const TextStyle(
                      fontSize: 13,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(
                    LucideIcons.chevronRight,
                    size: 16,
                    color: Color(0xFF9CA3AF), // Gray-400
                  ),
                  onPressed: () => context.go('/customers/${customer.id}'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
