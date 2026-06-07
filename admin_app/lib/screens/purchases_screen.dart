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
import '../widgets/buttons/table_action_button.dart';
import '../theme/app_theme.dart';
import '../widgets/badges/status_badges.dart';
import 'package:easy_localization/easy_localization.dart';

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

  static DateTime _startOfDay(DateTime dt) =>
      DateTime(dt.year, dt.month, dt.day);
  static DateTime _endOfDay(DateTime dt) =>
      DateTime(dt.year, dt.month, dt.day, 23, 59, 59, 999);

  static DateTimeRange _normalizeRange(DateTimeRange range) =>
      DateTimeRange(start: _startOfDay(range.start), end: _endOfDay(range.end));

  void _setDefaultDateRange() {
    final now = DateTime.now();
    final start = _startOfDay(now.subtract(const Duration(days: 6)));
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textMuted = isDark ? AppColors.textMuted : AppColors.lightTextMuted;

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
              backgroundColor: Theme.of(context).colorScheme.primary,
              child: Icon(
                LucideIcons.plus,
                color: Theme.of(context).colorScheme.onPrimary,
              ),
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
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text( 'admin.pages.purchases.index.title'.tr(),
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: textPrimary,
                            letterSpacing: -0.5,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text( 'app.manage_your_purchase_orders'.tr(),
                          style: TextStyle(fontSize: 14, color: textMuted),
                        ),
                      ],
                    ),
                    AppButton.primary(
                      label: 'admin.pages.purchases.create.breadcrumb'.tr(),
                      icon: LucideIcons.plus,
                      onPressed: () => context.go('/purchases/create'),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
              ],

              ResponsiveFilterBar(
                searchField: FormInput(
                  label: 'admin.pages.suppliers.index.filters.searchLabel'.tr(),
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
                    child: DateRangeFilterField(showLabel: false, 
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
                    child: FormSelect<String?>(showLabel: false, 
                      label: 'admin.pages.purchases.detail.cards.supplier'.tr(),
                      value: _selectedSupplierId,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 14,
                      ),
                      items: [
                        DropdownMenuItem<String?>(
                          value: null,
                          child: Text( 'admin.pages.purchases.index.filters.allSuppliers'.tr()),
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
                _buildPurchasesTable(
                  filteredPurchases,
                  isMobile,
                  isDark: isDark,
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPurchasesTable(
    List<Purchase> purchases,
    bool isMobile, {
    required bool isDark,
  }) {
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textSecondary = isDark
        ? AppColors.textSecondary
        : AppColors.lightTextSecondary;
    final textMuted = isDark ? AppColors.textMuted : AppColors.lightTextMuted;

    if (purchases.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(48),
          child: Column(
            children: [
              Icon(
                LucideIcons.shoppingBag,
                size: 48,
                color: Theme.of(context).brightness == Brightness.dark
                    ? AppColors.textTertiary
                    : AppColors.lightTextTertiary,
              ),
              const SizedBox(height: 16),
              Text( 'admin.pages.purchases.index.empty.title'.tr(),
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: textPrimary,
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
      header: Row(
        children: [
          Expanded(flex: 2, child: Text( 'admin.pages.purchases.index.table.id'.tr().toUpperCase(), style: _headerStyle(isDark))),
          Expanded(
            flex: 3,
            child: Text( 'admin.pages.purchases.detail.cards.supplier'.tr().toUpperCase(), style: _headerStyle(isDark)),
          ),
          Expanded(
            flex: 2,
            child: Text( 'superAdmin.paymentsPage.history.table.status'.tr().toUpperCase(), style: _headerStyle(isDark)),
          ),
          Expanded(
            flex: 2,
            child: Text( 'admin.pages.sales.detail.sections.items'.tr().toUpperCase(), style: _headerStyle(isDark)),
          ),
          Expanded(
            flex: 2,
            child: Text( 'superAdmin.paymentsPage.history.table.date'.tr().toUpperCase(), style: _headerStyle(isDark)),
          ),
          Expanded(
            flex: 1,
            child: Text( 'admin.pages.purchases.index.table.action'.tr().toUpperCase(),
              style: _headerStyle(isDark),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
      rowBuilder: (context, purchase, index) {
        return InkWell(
          onTap: () => context.go('/purchases/${purchase.id}'),
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: 20,
              vertical: 13,
            ),
            child: Row(
              children: [
                Expanded(
                  flex: 2,
                  child: Text(
                    '#${purchase.id.length > 8 ? purchase.id.substring(0, 8) : purchase.id}',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: textPrimary,
                      fontSize: 13,
                      fontFamily: 'RobotoMono',
                    ),
                  ),
                ),
                Expanded(
                  flex: 3,
                  child: Text(
                    purchase.supplierName,
                    style: TextStyle(
                      fontWeight: FontWeight.w500,
                      color: textSecondary,
                      fontSize: 13,
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
                    style: TextStyle(color: textMuted, fontSize: 13),
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Text(
                    DateFormat('MMM d, yyyy').format(purchase.createdAt),
                    style: TextStyle(color: textMuted, fontSize: 13),
                  ),
                ),
                Expanded(
                  flex: 1,
                  child: Align(
                    alignment: Alignment.centerRight,
                    child: TableActionButton(
                      tooltip: 'admin.pages.purchases.index.table.manage'.tr(),
                      icon: LucideIcons.eye,
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

  static TextStyle _headerStyle(bool isDark) => TextStyle(
    fontWeight: FontWeight.w600,
    fontSize: 11,
    color: isDark ? AppColors.textTertiary : AppColors.lightTextTertiary,
    letterSpacing: 0.5,
  );
}
