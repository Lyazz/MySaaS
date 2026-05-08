import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../providers/purchases_provider.dart';
import '../providers/suppliers_provider.dart';
import '../models/purchase.dart';
import '../utils/debouncer.dart';
import '../widgets/responsive_paginated_table.dart';
import '../widgets/responsive_filter_bar.dart';
import '../widgets/form/date_range_filter_field.dart';
import '../widgets/form/form_input.dart';
import '../widgets/form/form_select.dart';
import '../widgets/buttons/app_button.dart';
import '../theme/app_theme.dart';
import '../widgets/badges/status_badges.dart';

class PurchasesScreen extends ConsumerStatefulWidget {
  const PurchasesScreen({super.key});

  @override
  ConsumerState<PurchasesScreen> createState() => _PurchasesScreenState();
}

class _PurchasesScreenState extends ConsumerState<PurchasesScreen> {
  final TextEditingController _searchController = TextEditingController();
  final Debouncer _searchDebouncer = Debouncer(milliseconds: 300);
  DateTime? _startDate;
  DateTime? _endDate;
  String? _selectedSupplierId;

  static DateTime _startOfDay(DateTime dt) => DateTime(dt.year, dt.month, dt.day);
  static DateTime _endOfDay(DateTime dt) =>
      DateTime(dt.year, dt.month, dt.day, 23, 59, 59, 999);

  static DateTimeRange _normalizeRange(DateTimeRange range) => DateTimeRange(
        start: _startOfDay(range.start),
        end: _endOfDay(range.end),
      );

  void _setDefaultDateRange() {
    final now = DateTime.now();
    final start = _startOfDay(now.subtract(const Duration(days: 7)));
    final end = _endOfDay(now);
    _startDate = start;
    _endDate = end;
  }

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      _setDefaultDateRange();
      ref.read(suppliersProvider.notifier).fetchSuppliers();
      _fetchPurchases();
    });
  }

  void _fetchPurchases() {
    ref
        .read(purchasesProvider.notifier)
        .fetchPurchases(startDate: _startDate, endDate: _endDate);
  }

  @override
  void dispose() {
    _searchDebouncer.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final purchasesState = ref.watch(purchasesProvider);
    final suppliersState = ref.watch(suppliersProvider);
    final purchases = purchasesState.purchases;
    final suppliers = suppliersState.suppliers;
    final isMobile = MediaQuery.of(context).size.width < 800;

    final query = _searchController.text.trim().toLowerCase();
    final filteredPurchases = purchases.where((purchase) {
      final matchesQuery =
          query.isEmpty ||
          purchase.id.toLowerCase().contains(query) ||
          purchase.supplierName.toLowerCase().contains(query) ||
          purchase.status.toLowerCase().contains(query);
      final matchesSupplier =
          _selectedSupplierId == null ||
          purchase.supplierId == _selectedSupplierId;

      return matchesQuery && matchesSupplier;
    }).toList();

    return Scaffold(
      floatingActionButton: isMobile
          ? FloatingActionButton(
              onPressed: () => context.go('/purchases/create'),
              backgroundColor: AppColors.brand,
              child: const Icon(LucideIcons.plus, color: AppColors.brandContrast),
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
                    AppButton.primary(
                      label: 'New Purchase',
                      icon: LucideIcons.plus,
                      onPressed: () => context.go('/purchases/create'),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
              ],

              ResponsiveFilterBar(
                searchField: FormInput(
                  label: 'Search',
                  controller: _searchController,
                  hint: 'Search purchases...',
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 14,
                  ),
                  onChanged: (_) => _searchDebouncer.run(() => setState(() {})),
                ),
                filters: [
                  SizedBox(
                    width: 320,
                  child: DateRangeFilterField(
                    range: (_startDate != null && _endDate != null)
                        ? DateTimeRange(start: _startDate!, end: _endDate!)
                        : null,
                    firstDate: DateTime(2020),
                    lastDate: DateTime.now(),
                    normalize: _normalizeRange,
                    onChanged: (range) {
                      setState(() {
                        _startDate = range?.start;
                        _endDate = range?.end;
                      });
                      _fetchPurchases();
                    },
                  ),
                ),
                  SizedBox(
                    width: 240,
                    child: FormSelect<String?>(
                      label: 'Supplier',
                      value: _selectedSupplierId,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 14,
                      ),
                      items: [
                        const DropdownMenuItem<String?>(
                          value: null,
                          child: Text('All Suppliers'),
                        ),
                        ...suppliers.map(
                          (s) => DropdownMenuItem<String?>(
                            value: s.id,
                            child: Text(s.name),
                          ),
                        ),
                      ],
                      onChanged: (value) {
                        setState(() => _selectedSupplierId = value);
                      },
                    ),
                  ),
                ],
                onClearFilters: () {
                  setState(() {
                    _searchController.clear();
                    _setDefaultDateRange();
                    _selectedSupplierId = null;
                  });
                  _fetchPurchases();
                },
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
              Icon(LucideIcons.shoppingBag, size: 48, color: Theme.of(context).brightness == Brightness.dark ? AppColors.textTertiary : AppColors.lightTextTertiary),
              const SizedBox(height: 16),
              Text(
                'No purchases found',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).brightness == Brightness.dark ? AppColors.textPrimary : AppColors.lightTextPrimary,
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
                    child: PurchaseStatusBadge(status: purchase.status),
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
                    child: AppButton.secondary(
                      label: 'Manage',
                      size: AppButtonSize.sm,
                      onPressed: () => context.go('/purchases/${purchase.id}'),
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
