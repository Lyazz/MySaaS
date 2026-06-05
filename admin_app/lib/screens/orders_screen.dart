import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_theme.dart';
import '../models/order.dart';
import '../providers/orders_provider.dart';
import '../providers/store_settings_provider.dart';
import '../utils/debouncer.dart';
import '../utils/tenant_currency.dart';
import '../widgets/responsive_server_paginated_table.dart';
import '../widgets/form/date_range_filter_field.dart';
import '../widgets/form/form_input.dart';
import '../widgets/form/form_select.dart';
import '../widgets/buttons/app_button.dart';
import '../widgets/buttons/table_action_button.dart';
import '../widgets/badges/status_badges.dart';
import '../widgets/ui_tab_filter.dart';
import 'package:easy_localization/easy_localization.dart';

class OrdersScreen extends ConsumerStatefulWidget {
  final String? initialStatus;

  const OrdersScreen({super.key, this.initialStatus});

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen> {
  final TextEditingController _searchController = TextEditingController();
  final _debouncer = Debouncer(milliseconds: 500);
  final int _itemsPerPage = 25;

  String _selectedStatus = '';
  DateTime? _startDate;
  DateTime? _endDate;
  int _page = 1;
  String _activeTab = 'all';
  final Set<String> _selectedIds = {};

  @override
  void initState() {
    super.initState();
    _setDefaultFilters();
    final initialStatus = widget.initialStatus?.trim() ?? '';
    if (initialStatus.isNotEmpty) _selectedStatus = initialStatus;
    WidgetsBinding.instance.addPostFrameCallback((_) => _fetchOrders());
  }

  void _setDefaultFilters() {
    final today = DateTime.now();
    final lastWeek = today.subtract(const Duration(days: 6));
    _searchController.clear();
    _selectedStatus = '';
    _startDate = DateTime(lastWeek.year, lastWeek.month, lastWeek.day);
    _endDate = DateTime(today.year, today.month, today.day);
    _page = 1;
  }

  void _resetFilters() {
    setState(() {
      _activeTab = 'all';
      _setDefaultFilters();
      _selectedIds.clear();
    });
    _fetchOrders();
  }

  void _onTabChanged(String tab) {
    setState(() {
      _activeTab = tab;
      _selectedStatus = tab == 'all' ? '' : tab;
      _page = 1;
      _selectedIds.clear();
    });
    _fetchOrders();
  }

  void _fetchOrders() {
    ref.read(ordersProvider.notifier).fetchOrders(
          search: _searchController.text,
          status: _selectedStatus,
          startDate: _startDate,
          endDate: _endDate,
          page: _page,
          limit: _itemsPerPage,
        );
  }

  @override
  void dispose() {
    _debouncer.dispose();
    _searchController.dispose();
    super.dispose();
  }

  bool get _hasActiveFilters =>
      _searchController.text.trim().isNotEmpty || _selectedStatus.isNotEmpty;

  @override
  Widget build(BuildContext context) {
    final ordersState = ref.watch(ordersProvider);
    final isMobile = MediaQuery.of(context).size.width < 800;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      floatingActionButton: isMobile
          ? FloatingActionButton(
              onPressed: () => context.go('/pos'),
              backgroundColor: Theme.of(context).colorScheme.primary,
              child: Icon(
                LucideIcons.plus,
                color: Theme.of(context).colorScheme.onPrimary,
              ),
            )
          : null,
      body: SingleChildScrollView(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 1280),
            child: Padding(
              padding: EdgeInsets.all(isMobile ? 16 : 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Header ──────────────────────────────────────────
                  _buildHeader(ordersState, isDark, isMobile),
                  const SizedBox(height: 20),

                  // ── Underline tab strip ──────────────────────────────
                  _buildTabs(ordersState),
                  const SizedBox(height: 20),

                  // ── Bulk selection banner ────────────────────────────
                  if (_selectedIds.isNotEmpty) ...[
                    _buildBulkBanner(isDark),
                    const SizedBox(height: 12),
                  ],

                  // ── Filter card ──────────────────────────────────────
                  _buildFiltersCard(isDark),
                  const SizedBox(height: 20),

                  // ── Content ──────────────────────────────────────────
                  if (ordersState.isLoading)
                    _buildLoadingCard(isDark)
                  else if (ordersState.error != null)
                    _buildErrorCard(ordersState.error!, isDark)
                  else if (ordersState.orders.isEmpty)
                    _buildEmptyCard(isDark)
                  else
                    _buildTable(ordersState, isDark),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ── Header: title + stats chips + action buttons ─────────────────────────
  Widget _buildHeader(OrdersState state, bool isDark, bool isMobile) {
    final textPrimary = isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;
    final textSecondary = isDark ? AppColors.textSecondary : AppColors.lightTextSecondary;

    final pendingCount = state.orders.where((o) => o.status == 'PENDING').length;
    final deliveredCount = state.orders.where((o) => o.status == 'DELIVERED').length;
    final cancelledCount = state.orders.where((o) => o.status == 'CANCELLED').length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title + subtitle
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'superAdmin.tenants.table.orders'.tr(),
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: textPrimary,
                      letterSpacing: -0.4,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'admin.pages.orders.index.subtitle'.tr(),
                    style: TextStyle(fontSize: 13, color: textSecondary),
                  ),
                ],
              ),
            ),

            // Action buttons (desktop only)
            if (!isMobile)
              Row(
                children: [
                  AppButton.secondary(
                    label: 'admin.nav.export'.tr(),
                    icon: LucideIcons.download,
                    onPressed: () {},
                  ),
                  const SizedBox(width: 10),
                  AppButton.primary(
                    label: 'admin.pages.orders.index.addBtn'.tr(),
                    icon: LucideIcons.plus,
                    onPressed: () => context.push('/orders/create'),
                  ),
                ],
              ),
          ],
        ),

        const SizedBox(height: 12),

        // ── Inline stat chips ─────────────────────────────────────────
        Wrap(
          spacing: 8,
          runSpacing: 6,
          children: [
            _StatChip(
              value: state.total,
              label: 'admin.pages.orders.index.stats.total'.tr(),
              isDark: isDark,
            ),
            _StatChip(
              value: pendingCount,
              label: 'admin.pages.orders.index.stats.pending'.tr(),
              tone: _StatChipTone.amber,
              isDark: isDark,
            ),
            _StatChip(
              value: deliveredCount,
              label: 'admin.pages.orders.index.stats.delivered'.tr(),
              tone: _StatChipTone.green,
              isDark: isDark,
            ),
            _StatChip(
              value: cancelledCount,
              label: 'admin.pages.orders.index.stats.cancelled'.tr(),
              tone: _StatChipTone.red,
              isDark: isDark,
            ),
          ],
        ),
      ],
    );
  }

  // ── Tab strip ────────────────────────────────────────────────────────────
  Widget _buildTabs(OrdersState state) {
    return UiTabFilter(
      activeTab: _activeTab,
      tabs: [
        UiTabItem(key: 'all', label: 'All'),
        UiTabItem(
          key: 'PENDING',
          label: 'admin.pages.billing.status.pending.badge'.tr(),
          count: state.orders.where((o) => o.status == 'PENDING').length,
        ),
        UiTabItem(
          key: 'CONFIRMED',
          label: 'admin.orderStatus.confirmed'.tr(),
          count: state.orders.where((o) => o.status == 'CONFIRMED').length,
        ),
        UiTabItem(
          key: 'SHIPPED',
          label: 'admin.orderStatus.shipped'.tr(),
          count: state.orders.where((o) => o.status == 'SHIPPED').length,
        ),
        UiTabItem(
          key: 'DELIVERED',
          label: 'admin.orderStatus.delivered'.tr(),
          count: state.orders.where((o) => o.status == 'DELIVERED').length,
        ),
        UiTabItem(
          key: 'CANCELLED',
          label: 'admin.pages.purchases.index.filters.statusValues.CANCELLED'.tr(),
          count: state.orders.where((o) => o.status == 'CANCELLED').length,
        ),
      ],
      onTabChanged: _onTabChanged,
    );
  }

  // ── Bulk selection banner ─────────────────────────────────────────────────
  Widget _buildBulkBanner(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.red.withValues(alpha: isDark ? 0.12 : 0.06),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.red.withValues(alpha: 0.2)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            'admin.pages.orders.index.selectedCount'
                .tr(namedArgs: {'count': _selectedIds.length.toString()}),
            style: TextStyle(
              fontSize: 13,
              color: isDark ? AppColors.redText : const Color(0xFF991B1B),
            ),
          ),
          AppButton.danger(
            label: 'admin.pages.orders.index.bulkDeleteBtn'.tr(),
            icon: LucideIcons.trash2,
            size: AppButtonSize.sm,
            onPressed: () {},
          ),
        ],
      ),
    );
  }

  // ── Filter card ───────────────────────────────────────────────────────────
  Widget _buildFiltersCard(bool isDark) {
    final surfaceBorder = isDark ? AppColors.surfaceBorder : AppColors.lightSurfaceBorder;
    final surface1 = isDark ? AppColors.surface1 : AppColors.lightSurface1;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: surface1,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: surfaceBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.15 : 0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: LayoutBuilder(builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 640;

        final searchField = _FilterSection(
          label: 'admin.pages.orders.index.filters.searchLabel'.tr(),
          isDark: isDark,
          child: FormInput(
            label: '',
            controller: _searchController,
            hint: 'admin.pages.orders.index.filters.searchPlaceholder'.tr(),
            onChanged: (v) => _debouncer.run(() {
              setState(() => _page = 1);
              _fetchOrders();
            }),
          ),
        );

        final rangeField = _FilterSection(
          label: 'admin.pages.orders.index.filters.rangeLabel'.tr(),
          isDark: isDark,
          child: DateRangeFilterField(
            range: (_startDate != null && _endDate != null)
                ? DateTimeRange(start: _startDate!, end: _endDate!)
                : null,
            firstDate: DateTime(2020),
            lastDate: DateTime.now(),
            onChanged: (range) {
              setState(() {
                _page = 1;
                _startDate = range?.start;
                _endDate = range?.end;
              });
              _fetchOrders();
            },
          ),
        );

        final statusField = _FilterSection(
          label: 'admin.pages.orders.index.filters.statusLabel'.tr(),
          isDark: isDark,
          child: FormSelect<String>(
            label: '',
            value: _selectedStatus,
            items: [
              DropdownMenuItem(
                  value: '',
                  child: Text('admin.pages.orders.index.filters.allOrders'.tr())),
              DropdownMenuItem(
                  value: 'PENDING',
                  child: Text('admin.pages.billing.status.pending.badge'.tr())),
              DropdownMenuItem(
                  value: 'CONFIRMED',
                  child: Text('admin.orderStatus.confirmed'.tr())),
              DropdownMenuItem(
                  value: 'SHIPPED',
                  child: Text('admin.orderStatus.shipped'.tr())),
              DropdownMenuItem(
                  value: 'DELIVERED',
                  child: Text('admin.orderStatus.delivered'.tr())),
              DropdownMenuItem(
                  value: 'CANCELLED',
                  child: Text(
                      'admin.pages.purchases.index.filters.statusValues.CANCELLED'
                          .tr())),
              DropdownMenuItem(
                  value: 'RETURNED',
                  child: Text('admin.orderStatus.returned'.tr())),
            ],
            onChanged: (value) {
              setState(() {
                _selectedStatus = value ?? '';
                _activeTab = value == '' ? 'all' : value!;
                _page = 1;
                _selectedIds.clear();
              });
              _fetchOrders();
            },
          ),
        );

        if (isWide) {
          return Column(
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(flex: 3, child: searchField),
                  const SizedBox(width: 16),
                  Expanded(flex: 2, child: rangeField),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(flex: 3, child: statusField),
                  const Spacer(flex: 2),
                  // Clear button
                  if (_hasActiveFilters)
                    Padding(
                      padding: const EdgeInsets.only(left: 8, top: 4),
                      child: AppButton.ghost(
                        label: 'admin.common.clear'.tr(),
                        onPressed: _resetFilters,
                      ),
                    ),
                ],
              ),
            ],
          );
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            searchField,
            const SizedBox(height: 14),
            rangeField,
            const SizedBox(height: 14),
            statusField,
            if (_hasActiveFilters) ...[
              const SizedBox(height: 12),
              AppButton.ghost(
                label: 'admin.common.clear'.tr(),
                fullWidth: true,
                onPressed: _resetFilters,
              ),
            ],
          ],
        );
      }),
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  Widget _buildLoadingCard(bool isDark) {
    final brand = Theme.of(context).colorScheme.primary;
    final textSecondary = isDark ? AppColors.textSecondary : AppColors.lightTextSecondary;
    return _UiCard(
      isDark: isDark,
      padding: const EdgeInsets.all(48),
      child: Column(
        children: [
          SizedBox(
            width: 30,
            height: 30,
            child: CircularProgressIndicator(
              strokeWidth: 2.5,
              valueColor: AlwaysStoppedAnimation<Color>(brand),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'admin.pages.orders.index.loading'.tr(),
            style: TextStyle(fontSize: 13, color: textSecondary),
          ),
        ],
      ),
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  Widget _buildErrorCard(String message, bool isDark) {
    return _UiCard(
      isDark: isDark,
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          Icon(LucideIcons.alertCircle, size: 32, color: AppColors.red),
          const SizedBox(height: 12),
          Text(
            message,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              color: isDark ? AppColors.textSecondary : AppColors.lightTextSecondary,
            ),
          ),
          const SizedBox(height: 16),
          AppButton.secondary(
            label: 'app.retry'.tr(),
            icon: LucideIcons.refreshCw,
            onPressed: _fetchOrders,
          ),
        ],
      ),
    );
  }

  // ── Empty ─────────────────────────────────────────────────────────────────
  Widget _buildEmptyCard(bool isDark) {
    final textPrimary = isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;
    final textTertiary = isDark ? AppColors.textTertiary : AppColors.lightTextTertiary;
    final hint = _hasActiveFilters
        ? 'admin.pages.orders.index.empty.hintFiltered'.tr()
        : 'admin.pages.orders.index.empty.hint'.tr();

    return _UiCard(
      isDark: isDark,
      padding: const EdgeInsets.symmetric(vertical: 52, horizontal: 24),
      child: Column(
        children: [
          Icon(LucideIcons.clipboardList, size: 44, color: textTertiary),
          const SizedBox(height: 12),
          Text(
            'admin.pages.orders.index.empty.title'.tr(),
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            hint,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: textTertiary),
          ),
        ],
      ),
    );
  }

  // ── Table ─────────────────────────────────────────────────────────────────
  Widget _buildTable(OrdersState ordersState, bool isDark) {
    final money = tenantCurrencyFormatter(ref.watch(storeSettingsProvider).settings);
    final brand = Theme.of(context).colorScheme.primary;
    final textPrimary = isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;
    final textSecondary = isDark ? AppColors.textSecondary : AppColors.lightTextSecondary;
    final textTertiary = isDark ? AppColors.textTertiary : AppColors.lightTextTertiary;
    final surfaceBorder = isDark ? AppColors.surfaceBorder : AppColors.lightSurfaceBorder;

    final pendingIds = ordersState.orders
        .where((o) => o.status == 'PENDING')
        .map((o) => o.id)
        .toList();
    final allPendingSelected = pendingIds.isNotEmpty &&
        pendingIds.every((id) => _selectedIds.contains(id));

    return ResponsiveServerPaginatedTable<Order>(
      items: ordersState.orders,
      minWidth: 1050,
      page: ordersState.page,
      totalPages: ordersState.totalPages,
      totalItems: ordersState.total,
      itemsPerPage: ordersState.limit,
      onPageChanged: (p) {
        setState(() => _page = p);
        _fetchOrders();
      },
      header: Row(
        children: [
          // Checkbox col
          Expanded(
            flex: 1,
            child: SizedBox(
              width: 20,
              height: 20,
              child: Checkbox(
                value: allPendingSelected,
                tristate: false,
                onChanged: pendingIds.isEmpty
                    ? null
                    : (_) => setState(() {
                          if (allPendingSelected) {
                            _selectedIds.removeAll(pendingIds);
                          } else {
                            _selectedIds.addAll(pendingIds);
                          }
                        }),
                side: BorderSide(color: surfaceBorder),
                activeColor: brand,
              ),
            ),
          ),
          _th('admin.pages.orders.index.table.orderId'.tr(), flex: 3, isDark: isDark),
          _th('admin.pages.orders.index.table.customer'.tr(), flex: 2, isDark: isDark),
          _th('admin.pages.orders.index.table.phone'.tr(), flex: 2, isDark: isDark),
          _th('admin.pages.orders.index.table.delivery'.tr(), flex: 2, isDark: isDark),
          _th('admin.pages.orders.index.table.total'.tr(), flex: 2, isDark: isDark),
          _th('admin.pages.orders.index.table.status'.tr(), flex: 2, isDark: isDark),
          // Date with sort arrow (desc active)
          Expanded(
            flex: 3,
            child: Row(
              children: [
                Text(
                  'admin.pages.orders.index.table.date'.tr(),
                  style: TextStyle(
                    color: textTertiary,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(width: 4),
                Icon(LucideIcons.arrowDown, size: 12, color: brand),
              ],
            ),
          ),
          Expanded(
            flex: 2,
            child: Align(
              alignment: Alignment.centerRight,
              child: Text(
                'admin.pages.orders.index.table.actions'.tr(),
                style: TextStyle(
                  color: textTertiary,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ),
        ],
      ),
      rowBuilder: (context, order, index) {
        final isPending = order.status == 'PENDING';
        final isSelected = _selectedIds.contains(order.id);

        // Order ID: use publicId if available
        final publicId = (order.publicId?.isNotEmpty == true)
            ? order.publicId!
            : '#${order.id.length > 8 ? order.id.substring(0, 8) : order.id}';
        final shortUuid = order.id.length > 8 ? order.id.substring(0, 8) : order.id;
        final showUuidSub = order.publicId?.isNotEmpty == true;

        // Delivery
        String deliveryLabel = order.deliveryMode.trim().toLowerCase();
        if (deliveryLabel == 'store') {
          deliveryLabel = 'admin.pages.orders.index.deliveryModes.store'.tr();
        } else if (deliveryLabel == 'pickup' ||
            deliveryLabel == 'desk' ||
            deliveryLabel == 'office') {
          deliveryLabel = 'admin.pages.orders.index.deliveryModes.pickup'.tr();
        } else {
          deliveryLabel = 'admin.pages.orders.index.deliveryModes.home'.tr();
        }

        return InkWell(
          onTap: () => context.push('/orders/${order.id}'),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
            child: Row(
              children: [
                // Checkbox
                Expanded(
                  flex: 1,
                  child: isPending
                      ? SizedBox(
                          width: 20,
                          height: 20,
                          child: Checkbox(
                            value: isSelected,
                            onChanged: (_) => setState(() {
                              if (isSelected) {
                                _selectedIds.remove(order.id);
                              } else {
                                _selectedIds.add(order.id);
                              }
                            }),
                            side: BorderSide(color: surfaceBorder),
                            activeColor: brand,
                          ),
                        )
                      : const SizedBox(width: 20),
                ),

                // Order ID (publicId bold + uuid subtitle)
                Expanded(
                  flex: 3,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        publicId,
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                          color: textPrimary,
                        ),
                      ),
                      if (showUuidSub)
                        Text(
                          shortUuid,
                          style: TextStyle(
                            fontSize: 11,
                            fontFamily: 'monospace',
                            color: textTertiary,
                          ),
                        ),
                    ],
                  ),
                ),

                // Customer
                Expanded(
                  flex: 2,
                  child: Text(
                    order.customerName,
                    style: TextStyle(
                      fontSize: 13,
                      color: textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),

                // Phone
                Expanded(
                  flex: 2,
                  child: Text(
                    order.customerPhone.isEmpty ? '-' : order.customerPhone,
                    style: TextStyle(
                      fontSize: 13,
                      color: order.customerPhone.isEmpty ? textTertiary : textSecondary,
                    ),
                  ),
                ),

                // Delivery
                Expanded(
                  flex: 2,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        order.shippingProvider?.isNotEmpty == true
                            ? order.shippingProvider!
                            : 'SELF',
                        style: TextStyle(fontSize: 13, color: textPrimary),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        deliveryLabel,
                        style: TextStyle(fontSize: 11, color: textTertiary),
                      ),
                    ],
                  ),
                ),

                // Total
                Expanded(
                  flex: 2,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        money.format(order.totalWithShippingAmount ?? order.totalAmount),
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                          color: textPrimary,
                        ),
                      ),
                      if (order.shippingAmount != null && order.shippingAmount! > 0)
                        Text(
                          '+${money.format(order.shippingAmount!)}',
                          style: TextStyle(fontSize: 11, color: textTertiary),
                        ),
                    ],
                  ),
                ),

                // Status
                Expanded(
                  flex: 2,
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: OrderStatusBadge(status: order.status),
                  ),
                ),

                // Date
                Expanded(
                  flex: 3,
                  child: Text(
                    DateFormat('MMM d, yyyy').add_jm().format(order.createdAt),
                    style: TextStyle(color: textSecondary, fontSize: 12),
                  ),
                ),

                // Actions
                Expanded(
                  flex: 2,
                  child: Align(
                    alignment: Alignment.centerRight,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        TableActionButton(
                          tooltip: 'common.view'.tr(),
                          icon: LucideIcons.eye,
                          onPressed: () => context.push('/orders/${order.id}'),
                        ),
                        if (isPending) ...[
                          const SizedBox(width: 6),
                          TableActionButton(
                            tooltip: 'common.delete'.tr(),
                            icon: LucideIcons.trash2,
                            isDanger: true,
                            onPressed: () => _confirmDelete(order.id),
                          ),
                        ],
                      ],
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

  Future<void> _confirmDelete(String orderId) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final confirmed = await showDialog<bool>(
      context: context,
      barrierColor: Colors.black54,
      builder: (ctx) => _DeleteDialog(isDark: isDark),
    );
    if (confirmed == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('admin.pages.orders.index.deleteOneConfirm'.tr())),
      );
    }
  }

  Widget _th(String text, {required int flex, required bool isDark}) {
    return Expanded(
      flex: flex,
      child: Text(
        text.toUpperCase(),
        style: TextStyle(
          color: isDark ? AppColors.textTertiary : AppColors.lightTextTertiary,
          fontSize: 11,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}

// ── Inline stat chip (matches Nuxt AdminPageHeader stats) ──────────────────
enum _StatChipTone { none, amber, green, red }

class _StatChip extends StatelessWidget {
  final int value;
  final String label;
  final _StatChipTone tone;
  final bool isDark;

  const _StatChip({
    required this.value,
    required this.label,
    this.tone = _StatChipTone.none,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    Color bg, textColor, dotColor;

    switch (tone) {
      case _StatChipTone.amber:
        bg = isDark
            ? AppColors.amber.withValues(alpha: 0.12)
            : const Color(0xFFFFF8E6);
        textColor = isDark ? AppColors.amberText : const Color(0xFF92400E);
        dotColor = AppColors.amber;
        break;
      case _StatChipTone.green:
        bg = isDark
            ? AppColors.green.withValues(alpha: 0.12)
            : const Color(0xFFECFDF5);
        textColor = isDark ? AppColors.greenText : const Color(0xFF065F46);
        dotColor = AppColors.green;
        break;
      case _StatChipTone.red:
        bg = isDark
            ? AppColors.red.withValues(alpha: 0.12)
            : const Color(0xFFFEF2F2);
        textColor = isDark ? AppColors.redText : const Color(0xFF991B1B);
        dotColor = AppColors.red;
        break;
      case _StatChipTone.none:
        bg = isDark ? AppColors.surface3 : AppColors.lightSurface3;
        textColor = isDark ? AppColors.textSecondary : AppColors.lightTextSecondary;
        dotColor = Colors.transparent;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(9999),
        border: Border.all(
          color: tone == _StatChipTone.none
              ? (isDark ? AppColors.surfaceBorder : AppColors.lightSurfaceBorder)
              : dotColor.withValues(alpha: 0.25),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (tone != _StatChipTone.none) ...[
            Container(
              width: 7,
              height: 7,
              decoration: BoxDecoration(
                color: dotColor,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 5),
          ],
          Text(
            '$value $label',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: textColor,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Filter section label wrapper ─────────────────────────────────────────────
class _FilterSection extends StatelessWidget {
  final String label;
  final Widget child;
  final bool isDark;

  const _FilterSection({
    required this.label,
    required this.child,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final textTertiary = isDark ? AppColors.textTertiary : AppColors.lightTextTertiary;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label.toUpperCase(),
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.6,
            color: textTertiary,
          ),
        ),
        const SizedBox(height: 6),
        child,
      ],
    );
  }
}

// ── Delete confirm dialog ─────────────────────────────────────────────────────
class _DeleteDialog extends StatelessWidget {
  final bool isDark;
  const _DeleteDialog({required this.isDark});

  @override
  Widget build(BuildContext context) {
    final textPrimary = isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;
    final textSecondary = isDark ? AppColors.textSecondary : AppColors.lightTextSecondary;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.red.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(LucideIcons.alertTriangle,
                        size: 18, color: AppColors.red),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'admin.confirmModal.defaults.title'.tr(),
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: textPrimary,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'admin.pages.orders.index.deleteOneConfirm'.tr(),
                style: TextStyle(
                    fontSize: 13, color: textSecondary, height: 1.5),
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  AppButton.secondary(
                    label: 'admin.common.cancel'.tr(),
                    onPressed: () => Navigator.of(context).pop(false),
                  ),
                  const SizedBox(width: 8),
                  AppButton.danger(
                    label: 'common.delete'.tr(),
                    onPressed: () => Navigator.of(context).pop(true),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Shared ui-card ────────────────────────────────────────────────────────────
class _UiCard extends StatelessWidget {
  final bool isDark;
  final Widget child;
  final EdgeInsets padding;

  const _UiCard({
    required this.isDark,
    required this.child,
    this.padding = EdgeInsets.zero,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: isDark ? AppColors.surface1 : AppColors.lightSurface1,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppColors.surfaceBorder : AppColors.lightSurfaceBorder,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.15 : 0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Center(child: child),
    );
  }
}
