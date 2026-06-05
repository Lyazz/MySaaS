import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:easy_localization/easy_localization.dart';
import '../providers/sales_provider.dart';
import '../providers/store_settings_provider.dart';
import '../models/sale.dart';
import '../utils/debouncer.dart';
import '../utils/tenant_currency.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/responsive_filter_bar.dart';
import '../widgets/form/date_range_filter_field.dart';
import '../widgets/form/form_input.dart';
import '../widgets/responsive_server_paginated_table.dart';
import '../widgets/badges/status_badges.dart';
import '../widgets/buttons/app_button.dart';
import '../widgets/buttons/table_action_button.dart';

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
  final Set<String> _refundingSaleIds = <String>{};

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
    final money = tenantCurrencyFormatter(
      ref.watch(storeSettingsProvider).settings,
    );
    final salesState = ref.watch(salesProvider);
    final isMobile = MediaQuery.of(context).size.width < 800;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textSecondary = isDark
        ? AppColors.textSecondary
        : AppColors.lightTextSecondary;
    final textMuted = isDark ? AppColors.textMuted : AppColors.lightTextMuted;

    return Scaffold(
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
                    color: textPrimary,
                    letterSpacing: -0.5,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'admin.pages.sales.index.subtitle'.tr(),
                  style: TextStyle(color: textMuted, fontSize: 14),
                ),
              ],
            ),
          ),
          Padding(
            padding: EdgeInsets.symmetric(horizontal: isMobile ? 12 : 24),
            child: ResponsiveFilterBar(
              searchField: FormInput(
                label: 'app.admin_pages_sales_index_filter'.tr().tr(),
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
                  final normalizedType = sale.type.trim().toUpperCase();
                  final normalizedStatus = sale.status.trim().toUpperCase();
                  final isOrder = normalizedType == 'ORDER';
                  final canRefund = !isOrder && normalizedStatus == 'COMPLETED';
                  final refundBusy = _refundingSaleIds.contains(sale.id);
                  return InkWell(
                    onTap: () => context.push('/sales/${sale.id}'),
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
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                                color: textPrimary,
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
                              style: TextStyle(
                                fontWeight: FontWeight.w500,
                                fontSize: 14,
                                color: textPrimary,
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
                                    ? textMuted
                                    : textSecondary,
                              ),
                            ),
                          ),
                          Expanded(
                            flex: 2,
                            child: Text(
                              money.format(sale.totalAmount),
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                                color: textPrimary,
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
                              style: TextStyle(fontSize: 13, color: textMuted),
                            ),
                          ),
                          Expanded(
                            flex: 2,
                            child: Align(
                              alignment: Alignment.centerRight,
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  TableActionButton(
                                    tooltip: 'admin.pages.sales.actions.refund'.tr(),
                                    icon: LucideIcons.rotateCcw,
                                    isDanger: true,
                                    isLoading: refundBusy,
                                    onPressed: refundBusy
                                        ? null
                                        : () {
                                            if (canRefund) {
                                              _handleRefund(sale);
                                              return;
                                            }
                                            final reason = isOrder
                                                ? 'Order-origin sales must be returned from the order flow.'
                                                : 'Only COMPLETED POS sales can be refunded.';
                                            ScaffoldMessenger.of(
                                              context,
                                            ).showSnackBar(
                                              SnackBar(content: Text(reason)),
                                            );
                                          },
                                  ),
                                  const SizedBox(width: 8),
                                  TableActionButton(
                                    tooltip: isOrder ? 'View order' : 'View',
                                    icon: LucideIcons.eye,
                                    onPressed: isOrder
                                        ? () =>
                                              context.push('/orders/${sale.id}')
                                        : () =>
                                              context.push('/sales/${sale.id}'),
                                  ),
                                ],
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

  Future<void> _handleRefund(Sale sale) async {
    if (_refundingSaleIds.contains(sale.id)) return;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textMuted = isDark ? AppColors.textMuted : AppColors.lightTextMuted;
    setState(() => _refundingSaleIds.add(sale.id));
    try {
      final api = ref.read(apiProvider);
      final response = await api.client.get('/admin/cash/cashboxes');
      final raw = response.data;
      final cashboxes = raw is List
          ? raw.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList()
          : <Map<String, dynamic>>[];
      final openCashboxes = cashboxes
          .where((c) => c['isActive'] == true && c['openSession'] is Map)
          .toList();

      if (!mounted) return;
      if (openCashboxes.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text( 'admin.pages.sales.messages.noOpenCashbox'.tr(),
            ),
          ),
        );
        return;
      }

      String selectedCashboxId = (openCashboxes.first['id'] ?? '').toString();
      String selectedMethod = 'CASH';
      final referenceCtrl = TextEditingController();
      final noteCtrl = TextEditingController(
        text:
            'Sale refund ${sale.id.substring(0, sale.id.length > 8 ? 8 : sale.id.length)}',
      );
      bool submitting = false;
      String? formError;

      final confirmed = await showDialog<bool>(
        context: context,
        barrierDismissible: !submitting,
        builder: (dialogContext) {
          return StatefulBuilder(
            builder: (context, setDialogState) {
              return AlertDialog(
                title: Text( 'admin.pages.sales.refundModal.title'.tr()),
                content: SizedBox(
                  width: 420,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text( 'app.create_refund_cash_outflow_and'.tr(),
                        style: TextStyle(color: textMuted, fontSize: 13),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: selectedCashboxId,
                        items: openCashboxes
                            .map(
                              (c) => DropdownMenuItem<String>(
                                value: (c['id'] ?? '').toString(),
                                child: Text((c['name'] ?? '').toString()),
                              ),
                            )
                            .toList(),
                        onChanged: submitting
                            ? null
                            : (v) => setDialogState(
                                () =>
                                    selectedCashboxId = v ?? selectedCashboxId,
                              ),
                        decoration: InputDecoration(
                          labelText: 'admin.pages.sales.refundModal.cashboxLabel'.tr(),
                          border: OutlineInputBorder(),
                        ),
                      ),
                      SizedBox(height: 10),
                      DropdownButtonFormField<String>(
                        initialValue: selectedMethod,
                        items: [
                          DropdownMenuItem(value: 'CASH', child: Text( 'admin.pages.cash.methods.CASH'.tr())),
                          DropdownMenuItem(value: 'CARD', child: Text( 'admin.pages.cash.methods.CARD'.tr())),
                          DropdownMenuItem(
                            value: 'TRANSFER',
                            child: Text( 'admin.pages.cash.transactions.types.TRANSFER'.tr()),
                          ),
                          DropdownMenuItem(
                            value: 'OTHER',
                            child: Text( 'admin.pages.cash.methods.OTHER'.tr()),
                          ),
                        ],
                        onChanged: submitting
                            ? null
                            : (v) => setDialogState(
                                () => selectedMethod = (v ?? 'CASH')
                                    .toUpperCase(),
                              ),
                        decoration: InputDecoration(
                          labelText: 'superAdmin.paymentsPage.history.table.method'.tr(),
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: referenceCtrl,
                        enabled: !submitting,
                        decoration: InputDecoration(
                          labelText: 'admin.pages.sales.refundModal.referenceLabel'.tr(),
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: noteCtrl,
                        enabled: !submitting,
                        maxLines: 2,
                        decoration: InputDecoration(
                          labelText: 'admin.pages.sales.refundModal.noteLabel'.tr(),
                          border: OutlineInputBorder(),
                        ),
                      ),
                      if (formError != null) ...[
                        const SizedBox(height: 10),
                        Text(
                          formError!,
                          style: const TextStyle(
                            color: Colors.red,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                actions: [
                  TextButton(
                    onPressed: submitting
                        ? null
                        : () => Navigator.of(dialogContext).pop(false),
                    child: Text( 'admin.common.cancel'.tr()),
                  ),
                  AppButton.danger(
                    label: 'admin.pages.sales.actions.refund'.tr(),
                    icon: LucideIcons.rotateCcw,
                    loading: submitting,
                    onPressed: submitting
                        ? null
                        : () async {
                            setDialogState(() {
                              submitting = true;
                              formError = null;
                            });
                            try {
                              await ref
                                  .read(salesProvider.notifier)
                                  .refundSale(
                                    saleId: sale.id,
                                    cashboxId: selectedCashboxId,
                                    method: selectedMethod,
                                    reference: referenceCtrl.text.trim().isEmpty
                                        ? null
                                        : referenceCtrl.text.trim(),
                                    note: noteCtrl.text.trim().isEmpty
                                        ? null
                                        : noteCtrl.text.trim(),
                                  );
                              if (!dialogContext.mounted) return;
                              Navigator.of(dialogContext).pop(true);
                            } catch (e) {
                              setDialogState(() {
                                submitting = false;
                                formError = e.toString();
                              });
                            }
                          },
                  ),
                ],
              );
            },
          );
        },
      );

      referenceCtrl.dispose();
      noteCtrl.dispose();

      if (confirmed == true) {
        _fetchSales();
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text( 'app.sale_refunded_successfully'.tr())),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to refund sale: $e')));
    } finally {
      if (mounted) {
        setState(() => _refundingSaleIds.remove(sale.id));
      }
    }
  }

  Widget _headerText(String text) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textMuted = isDark ? AppColors.textMuted : AppColors.lightTextMuted;
    return Text(
      text,
      style: TextStyle(
        color: textMuted,
        fontSize: 12,
        fontWeight: FontWeight.w600,
      ),
    );
  }

  Widget _buildHeaderCell(String text, {required int flex}) {
    return Expanded(flex: flex, child: _headerText(text));
  }

  Widget _buildEmptyState() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textMuted = isDark ? AppColors.textMuted : AppColors.lightTextMuted;
    return Center(
      child: Padding(
        padding: EdgeInsets.all(48),
        child: Text(
          'admin.pages.sales.index.empty.title'.tr(),
          style: TextStyle(color: textMuted),
        ),
      ),
    );
  }
}
