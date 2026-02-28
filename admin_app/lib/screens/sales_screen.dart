import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import 'package:easy_localization/easy_localization.dart';
import '../providers/sales_provider.dart';
import '../models/sale.dart';
import '../utils/debouncer.dart';
import '../widgets/responsive_filter_bar.dart';
import '../widgets/form/date_range_filter_field.dart';
import '../widgets/form/form_input.dart';
import '../widgets/responsive_server_paginated_table.dart';
import '../widgets/badges/status_badges.dart';
import '../widgets/buttons/app_button.dart';

class SalesScreen extends ConsumerStatefulWidget {
  final bool autoFetch;

  const SalesScreen({super.key, this.autoFetch = true});

  @override
  ConsumerState<SalesScreen> createState() => _SalesScreenState();
}

class _SalesScreenState extends ConsumerState<SalesScreen> {
  final TextEditingController _searchController = TextEditingController();
  final Debouncer _searchDebouncer = Debouncer(milliseconds: 300);
  final int _itemsPerPage = 25;
  int _page = 1;
  DateTime? _startDate;
  DateTime? _endDate;

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
    _setDefaultDateRange();
    if (widget.autoFetch) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _fetchSales());
    }
  }

  void _fetchSales({String? search}) {
    ref
        .read(salesProvider.notifier)
        .fetchSales(
          search: search ?? _searchController.text,
          startDate: _startDate,
          endDate: _endDate,
          page: _page,
          limit: _itemsPerPage,
        );
  }

  @override
  void dispose() {
    _searchDebouncer.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final salesState = ref.watch(salesProvider);
    final isMobile = MediaQuery.of(context).size.width < 800;
    final money = NumberFormat.simpleCurrency(name: 'DZD');

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB), // Gray-50
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(
              isMobile ? 12 : 24,
              isMobile ? 12 : 24,
              isMobile ? 12 : 24,
              12,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'admin.pages.sales.index.title'.tr(),
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF0F172A), // Slate-900
                    letterSpacing: -0.5,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'admin.pages.sales.index.subtitle'.tr(),
                  style: TextStyle(
                    color: Color(0xFF64748B), // Slate-500
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: EdgeInsets.symmetric(horizontal: isMobile ? 12 : 24),
            child: ResponsiveFilterBar(
              searchField: FormInput(
                label: 'admin.pages.sales.index.filters.searchLabel'.tr(),
                controller: _searchController,
                hint: 'admin.pages.sales.index.filters.searchPlaceholder'.tr(),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
                onChanged: (value) => _searchDebouncer.run(() {
                  setState(() => _page = 1);
                  _fetchSales(search: value);
                }),
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
                        _page = 1;
                        _startDate = range?.start;
                        _endDate = range?.end;
                      });
                      _fetchSales();
                    },
                  ),
                ),
              ],
              onClearFilters: () {
                setState(() {
                  _page = 1;
                  _searchController.clear();
                  _setDefaultDateRange();
                });
                _fetchSales(search: '');
              },
            ),
          ),
          const SizedBox(height: 12),
          if (salesState.error != null)
            Padding(
              padding: EdgeInsets.symmetric(horizontal: isMobile ? 12 : 24),
              child: Text('Error: ${salesState.error}'),
            ),
          Expanded(
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: isMobile ? 12 : 24),
              child: ResponsiveServerPaginatedTable<Sale>(
                items: salesState.sales,
                isLoading: salesState.isLoading,
                emptyState: _buildEmptyState(),
                minWidth: 1100,
                page: salesState.page,
                totalPages: salesState.totalPages,
                totalItems: salesState.total,
                itemsPerPage: _itemsPerPage,
                onPageChanged: (newPage) {
                  setState(() => _page = newPage);
                  _fetchSales();
                },
                header: Row(
                  children: [
                    _buildHeaderCell(
                      'admin.pages.sales.index.table.saleId'.tr(),
                      flex: 2,
                    ),
                    _buildHeaderCell(
                      'admin.pages.cash.transactions.table.type'.tr(),
                      flex: 2,
                    ),
                    _buildHeaderCell(
                      'admin.pages.sales.index.table.customer'.tr(),
                      flex: 3,
                    ),
                    _buildHeaderCell(
                      'admin.pages.sales.index.table.phone'.tr(),
                      flex: 2,
                    ),
                    _buildHeaderCell(
                      'admin.pages.sales.index.table.total'.tr(),
                      flex: 2,
                    ),
                    _buildHeaderCell(
                      'admin.pages.orders.index.table.status'.tr(),
                      flex: 2,
                    ),
                    _buildHeaderCell(
                      'admin.pages.orders.index.table.date'.tr(),
                      flex: 2,
                    ),
                    Expanded(
                      flex: 2,
                      child: Align(
                        alignment: Alignment.centerRight,
                        child: _headerText(
                          'admin.pages.sales.index.table.actions'.tr(),
                        ),
                      ),
                    ),
                  ],
                ),
                rowBuilder: (context, sale, index) {
                  final shortId = sale.id.length > 8
                      ? sale.id.substring(0, 8)
                      : sale.id;
                  final isOrder = sale.type.toUpperCase() == 'ORDER';
                  return InkWell(
                    onTap: isOrder
                        ? () => context.push('/orders/${sale.id}')
                        : null,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 12,
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            flex: 2,
                            child: Text(
                              '#$shortId',
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                                color: Color(0xFF0F172A), // Slate-900
                              ),
                            ),
                          ),
                          Expanded(
                            flex: 2,
                            child: Align(
                              alignment: Alignment.centerLeft,
                              child: SaleTypeBadge(type: sale.type),
                            ),
                          ),
                          Expanded(
                            flex: 3,
                            child: Text(
                              sale.customerName.isEmpty
                                  ? '—'
                                  : sale.customerName,
                              style: const TextStyle(
                                fontWeight: FontWeight.w500,
                                fontSize: 14,
                                color: Color(0xFF0F172A), // Slate-900
                              ),
                            ),
                          ),
                          Expanded(
                            flex: 2,
                            child: Text(
                              sale.customerPhone.isEmpty
                                  ? '—'
                                  : sale.customerPhone,
                              style: TextStyle(
                                color: sale.customerPhone.isEmpty
                                    ? const Color(0xFF94A3B8) // Slate-400
                                    : const Color(0xFF475569), // Slate-600
                              ),
                            ),
                          ),
                          Expanded(
                            flex: 2,
                            child: Text(
                              money.format(sale.totalAmount),
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                                color: Color(0xFF0F172A), // Slate-900
                              ),
                            ),
                          ),
                          Expanded(
                            flex: 2,
                            child: Align(
                              alignment: Alignment.centerLeft,
                              child: SaleStatusBadge(status: sale.status),
                            ),
                          ),
                          Expanded(
                            flex: 2,
                            child: Text(
                              DateFormat.yMMMd().format(sale.updatedAt),
                              style: const TextStyle(
                                fontSize: 13,
                                color: Color(0xFF64748B), // Slate-500
                              ),
                            ),
                          ),
                          Expanded(
                            flex: 2,
                            child: Align(
                              alignment: Alignment.centerRight,
                              child: AppButton.secondary(
                                label: isOrder ? 'View order' : 'View',
                                icon: LucideIcons.eye,
                                size: AppButtonSize.sm,
                                onPressed: isOrder
                                    ? () => context.push('/orders/${sale.id}')
                                    : null,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }

  Widget _headerText(String text) {
    return Text(
      text,
      style: const TextStyle(
        color: Color(0xFF64748B), // Slate-500
        fontSize: 12,
        fontWeight: FontWeight.w600,
      ),
    );
  }

  Widget _buildHeaderCell(String text, {required int flex}) {
    return Expanded(flex: flex, child: _headerText(text));
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: EdgeInsets.all(48),
        child: Text(
          'admin.pages.sales.index.empty.title'.tr(),
          style: const TextStyle(color: Color(0xFF64748B)),
        ),
      ),
    );
  }
}
