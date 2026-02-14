import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../providers/purchases_provider.dart';
import '../providers/suppliers_provider.dart';
import '../models/purchase.dart';
import '../widgets/responsive_paginated_table.dart';
// import '../widgets/responsive_filter_bar.dart';

class PurchasesScreen extends ConsumerStatefulWidget {
  const PurchasesScreen({super.key});

  @override
  ConsumerState<PurchasesScreen> createState() => _PurchasesScreenState();
}

class _PurchasesScreenState extends ConsumerState<PurchasesScreen> {
  DateTime? _startDate;
  DateTime? _endDate;
  String? _selectedSupplierId;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => _fetchPurchases());
  }

  void _fetchPurchases() {
    ref
        .read(purchasesProvider.notifier)
        .fetchPurchases(startDate: _startDate, endDate: _endDate);
  }

  @override
  void dispose() {
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final purchasesState = ref.watch(purchasesProvider);
    final suppliersState = ref.watch(suppliersProvider);
    final purchases = purchasesState.purchases;
    final suppliers = suppliersState.suppliers;
    final isMobile = MediaQuery.of(context).size.width < 800;

    final filteredPurchases = purchases.where((purchase) {
      final matchesSupplier =
          _selectedSupplierId == null ||
          purchase.supplierId == _selectedSupplierId;

      return matchesSupplier;
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB), // Gray-50
      floatingActionButton: isMobile
          ? FloatingActionButton(
              onPressed: () => context.go('/purchases/create'),
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
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Purchases',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF111827), // Gray-900
                            letterSpacing: -0.5,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Manage your purchase orders',
                          style: TextStyle(
                            fontSize: 14,
                            color: Color(0xFF6B7280),
                          ), // Gray-500
                        ),
                      ],
                    ),
                    ElevatedButton.icon(
                      onPressed: () => context.go('/purchases/create'),
                      icon: const Icon(LucideIcons.plus, size: 16),
                      label: const Text('New Purchase'),
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

              // Search and Filter
              // Filters
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                ),
                child: Row(
                  children: [
                    // Date Range Picker
                    InkWell(
                      onTap: () async {
                        final picked = await showDateRangePicker(
                          context: context,
                          firstDate: DateTime(2020),
                          lastDate: DateTime.now().add(
                            const Duration(days: 365),
                          ),
                          initialDateRange:
                              _startDate != null && _endDate != null
                              ? DateTimeRange(
                                  start: _startDate!,
                                  end: _endDate!,
                                )
                              : null,
                        );
                        if (picked != null) {
                          setState(() {
                            _startDate = picked.start;
                            _endDate = picked.end;
                          });
                          _fetchPurchases();
                        }
                      },
                      borderRadius: BorderRadius.circular(6),
                      child: Container(
                        height: 36,
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF3F4F6),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              LucideIcons.calendar,
                              size: 14,
                              color: _startDate != null
                                  ? const Color(0xFF0F766E)
                                  : const Color(0xFF6B7280),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              _startDate != null && _endDate != null
                                  ? '${DateFormat('MMM d').format(_startDate!)} - ${DateFormat('MMM d').format(_endDate!)}'
                                  : 'Date Range',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                                color: _startDate != null
                                    ? const Color(0xFF0F766E)
                                    : const Color(0xFF374151),
                              ),
                            ),
                            if (_startDate != null) ...[
                              const SizedBox(width: 8),
                              InkWell(
                                onTap: () {
                                  setState(() {
                                    _startDate = null;
                                    _endDate = null;
                                  });
                                  _fetchPurchases();
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
                    // Supplier Dropdown
                    Container(
                      height: 36,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF3F4F6),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _selectedSupplierId,
                          hint: const Text('All Suppliers'),
                          icon: const Icon(
                            LucideIcons.chevronDown,
                            size: 14,
                            color: Color(0xFF6B7280),
                          ),
                          items: [
                            const DropdownMenuItem(
                              value: null,
                              child: Text('All Suppliers'),
                            ),
                            ...suppliers.map(
                              (s) => DropdownMenuItem(
                                value: s.id,
                                child: Text(s.name),
                              ),
                            ),
                          ],
                          onChanged: (value) {
                            setState(() => _selectedSupplierId = value);
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
              ),
              const SizedBox(height: 24),

              if (purchasesState.error != null)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Text(
                      'Error: ${purchasesState.error}',
                      style: const TextStyle(color: Colors.red),
                    ),
                  ),
                )
              else if (purchasesState.isLoading)
                const Center(child: CircularProgressIndicator())
              else
                _buildPurchasesTable(filteredPurchases, isMobile),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPurchasesTable(List<Purchase> purchases, bool isMobile) {
    if (purchases.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(48),
          child: Column(
            children: [
              Icon(LucideIcons.shoppingBag, size: 48, color: Colors.grey[300]),
              const SizedBox(height: 16),
              Text(
                'No purchases found',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[800],
                ),
              ),
            ],
          ),
        ),
      );
    }

    return ResponsivePaginatedTable<Purchase>(
      items: purchases,
      minWidth: 900,
      header: const Row(
        children: [
          Expanded(flex: 2, child: Text('ID', style: _headerStyle)),
          Expanded(flex: 3, child: Text('SUPPLIER', style: _headerStyle)),
          Expanded(flex: 2, child: Text('STATUS', style: _headerStyle)),
          Expanded(flex: 2, child: Text('ITEMS', style: _headerStyle)),
          Expanded(flex: 2, child: Text('DATE', style: _headerStyle)),
          Expanded(
            flex: 1,
            child: Text(
              'ACTION',
              style: _headerStyle,
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
      rowBuilder: (context, purchase, index) {
        return InkWell(
          onTap: () => context.go('/purchases/${purchase.id}'),
          child: Padding(
            padding: EdgeInsets.symmetric(
              horizontal: isMobile ? 12 : 24,
              vertical: 12,
            ),
            child: Row(
              children: [
                Expanded(
                  flex: 2,
                  child: Text(
                    '#${purchase.id.length > 8 ? purchase.id.substring(0, 8) : purchase.id}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF111827), // Gray-900
                      fontFamily: 'RobotoMono',
                    ),
                  ),
                ),
                Expanded(
                  flex: 3,
                  child: Text(
                    purchase.supplierName,
                    style: const TextStyle(
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF1F2937),
                    ),
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: _StatusBadge(status: purchase.status),
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Text(
                    '${purchase.items.length} items',
                    style: const TextStyle(
                      color: Color(0xFF6B7280),
                      fontSize: 13,
                    ),
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Text(
                    DateFormat('MMM d, yyyy').format(purchase.createdAt),
                    style: const TextStyle(
                      color: Color(0xFF6B7280),
                      fontSize: 13,
                    ),
                  ),
                ),
                Expanded(
                  flex: 1,
                  child: Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: () => context.go('/purchases/${purchase.id}'),
                      style: TextButton.styleFrom(
                        foregroundColor: const Color(0xFF0F766E), // Teal-700
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                        textStyle: const TextStyle(fontWeight: FontWeight.w500),
                      ),
                      child: const Text('Manage'),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  static const _headerStyle = TextStyle(
    fontWeight: FontWeight.w600,
    fontSize: 11,
    color: Color(0xFF6B7280), // Gray-500
    letterSpacing: 0.5,
  );
}

class _StatusBadge extends StatelessWidget {
  final String status;

  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    Color bgColor;

    switch (status.toLowerCase()) {
      case 'completed':
      case 'received':
        color = const Color(0xFF166534); // green-800
        bgColor = const Color(0xFFDCFCE7); // green-100
        break;
      case 'pending':
      case 'ordered':
        color = const Color(0xFF854D0E); // yellow-800
        bgColor = const Color(0xFFFEF9C3); // yellow-100
        break;
      case 'cancelled':
        color = const Color(0xFF991B1B); // red-800
        bgColor = const Color(0xFFFEE2E2); // red-100
        break;
      default:
        color = const Color(0xFF1F2937); // gray-800
        bgColor = const Color(0xFFF3F4F6); // gray-100
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(9999),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
