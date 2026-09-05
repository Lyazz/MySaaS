import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
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
import 'package:easy_localization/easy_localization.dart';
import '../utils/app_toasts.dart';

// ── Orders filter state — Riverpod providers ──────────────────────────────────

class _OrderStatusNotifier extends Notifier<String> {
  @override
  String build() => '';
  void set(String value) => state = value;
}

final orderStatusFilterProvider =
    NotifierProvider<_OrderStatusNotifier, String>(_OrderStatusNotifier.new);

DateTimeRange _ordersDefaultDateRange() {
  final today = DateTime.now();
  final lastWeek = today.subtract(const Duration(days: 6));
  return DateTimeRange(
    start: DateTime(lastWeek.year, lastWeek.month, lastWeek.day),
    end: DateTime(today.year, today.month, today.day),
  );
}

class _OrderDateRangeNotifier extends Notifier<DateTimeRange?> {
  @override
  DateTimeRange? build() => _ordersDefaultDateRange();
  void set(DateTimeRange? value) => state = value;
  void reset() => state = _ordersDefaultDateRange();
}

final orderDateRangeProvider =
    NotifierProvider<_OrderDateRangeNotifier, DateTimeRange?>(
      _OrderDateRangeNotifier.new,
    );

class OrdersScreen extends ConsumerStatefulWidget {
  final String? initialStatus;

  const OrdersScreen({super.key, this.initialStatus});

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen> {
  final TextEditingController _searchController = TextEditingController();
  final _debouncer = Debouncer(milliseconds: 400);
  final int _itemsPerPage = 25;

  int _page = 1;
  final Set<String> _selectedIds = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final initialStatus = widget.initialStatus?.trim() ?? '';
      ref.read(orderStatusFilterProvider.notifier).set(initialStatus);
      ref.read(orderDateRangeProvider.notifier).reset();
      _fetchOrders();
    });
  }

  void _resetFilters() {
    setState(() {
      _searchController.clear();
      _page = 1;
      _selectedIds.clear();
    });
    ref.read(orderStatusFilterProvider.notifier).set('');
    ref.read(orderDateRangeProvider.notifier).reset();
    _fetchOrders();
  }

  void _fetchOrders() {
    final dateRange = ref.read(orderDateRangeProvider);
    ref
        .read(ordersProvider.notifier)
        .fetchOrders(
          search: _searchController.text,
          status: ref.read(orderStatusFilterProvider),
          startDate: dateRange?.start,
          endDate: dateRange?.end,
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

  @override
  Widget build(BuildContext context) {
    final ordersState = ref.watch(ordersProvider);
    final isMobile = MediaQuery.of(context).size.width < 800;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
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
                  const SizedBox(height: 16),

                  // ── Bulk selection banner ────────────────────────────
                  if (_selectedIds.isNotEmpty) ...[
                    _buildBulkBanner(isDark),
                    const SizedBox(height: 12),
                  ],

                  // ── Filter bar ────────────────────────────────────────
                  _buildFilters(isMobile: isMobile),
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

  // ── Header: title + stats + [+ New Order] button ─────────────────────────
  Widget _buildHeader(OrdersState state, bool isDark, bool isMobile) {
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textSecondary = isDark
        ? AppColors.textSecondary
        : AppColors.lightTextSecondary;

    final pendingCount = state.orders
        .where((o) => o.status == 'PENDING')
        .length;
    final deliveredCount = state.orders
        .where((o) => o.status == 'DELIVERED')
        .length;
    final cancelledCount = state.orders
        .where((o) => o.status == 'CANCELLED')
        .length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
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

            // Primary CTA — desktop only, mirrors products screen
            if (!isMobile)
              AppButton.primary(
                label: 'admin.pages.orders.index.addBtn'.tr(),
                icon: LucideIcons.plus,
                onPressed: () => context.push('/orders/create'),
              ),
          ],
        ),

        const SizedBox(height: 10),

        // ── Stat chips ───────────────────────────────────────────────
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
            'admin.pages.orders.index.selectedCount'.tr(
              namedArgs: {'count': _selectedIds.length.toString()},
            ),
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

  // ── Filter bar ────────────────────────────────────────────────────────────
  Widget _buildFilters({bool isMobile = false}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final surface1 = isDark ? AppColors.surface1 : AppColors.lightSurface1;

    final searchField = FormInput(
      label: 'admin.pages.orders.index.filters.searchLabel'.tr(),
      controller: _searchController,
      hint: 'admin.pages.orders.index.filters.searchPlaceholder'.tr(),
      showLabel: isMobile,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      onChanged: (v) => _debouncer.run(() {
        setState(() => _page = 1);
        _fetchOrders();
      }),
    );

    // Build status/date with or without label depending on context
    Widget buildStatusField({required bool showLabel}) => Consumer(
      builder: (context, ref, _) {
        final status = ref.watch(orderStatusFilterProvider);
        return FormSelect<String>(
          label: showLabel
              ? 'admin.pages.orders.index.filters.statusLabel'.tr()
              : '',
          value: status,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 12,
          ),
          items: [
            DropdownMenuItem(
              value: '',
              child: Text('admin.pages.orders.index.filters.allOrders'.tr()),
            ),
            DropdownMenuItem(
              value: 'PENDING',
              child: Text('admin.pages.billing.status.pending.badge'.tr()),
            ),
            DropdownMenuItem(
              value: 'CONFIRMED',
              child: Text('admin.orderStatus.confirmed'.tr()),
            ),
            DropdownMenuItem(
              value: 'SHIPPED',
              child: Text('admin.orderStatus.shipped'.tr()),
            ),
            DropdownMenuItem(
              value: 'DELIVERED',
              child: Text('admin.orderStatus.delivered'.tr()),
            ),
            DropdownMenuItem(
              value: 'CANCELLED',
              child: Text(
                'admin.pages.purchases.index.filters.statusValues.CANCELLED'
                    .tr(),
              ),
            ),
            DropdownMenuItem(
              value: 'RETURNED',
              child: Text('admin.orderStatus.returned'.tr()),
            ),
          ],
          onChanged: (value) {
            ref.read(orderStatusFilterProvider.notifier).set(value ?? '');
            setState(() {
              _page = 1;
              _selectedIds.clear();
            });
            _fetchOrders();
          },
        );
      },
    );

    Widget buildDateField({required bool showLabel}) => Consumer(
      builder: (context, ref, _) {
        final range = ref.watch(orderDateRangeProvider);
        return DateRangeFilterField(
          label: showLabel
              ? 'admin.pages.orders.index.filters.rangeLabel'.tr()
              : '',
          range: range,
          firstDate: DateTime(2020),
          lastDate: DateTime.now(),
          onChanged: (r) {
            ref.read(orderDateRangeProvider.notifier).set(r);
            setState(() => _page = 1);
            _fetchOrders();
          },
        );
      },
    );

    Widget content;

    if (isMobile) {
      // Mobile: search + 🔽 filter sheet icon + ⋯ actions icon
      content = Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(child: searchField),
          const SizedBox(width: 8),
          _IconShellBtn(
            borderColor: borderColor,
            icon: Icon(
              LucideIcons.listFilter,
              size: 20,
              color: isDark
                  ? AppColors.textTertiary
                  : AppColors.lightTextTertiary,
            ),
            tooltip: 'admin.common.filters'.tr(),
            onPressed: () => _showMobileFilterSheet(
              isDark: isDark,
              // Mobile sheet: WITH labels (fields are stacked, labels help)
              statusField: buildStatusField(showLabel: true),
              dateField: buildDateField(showLabel: true),
            ),
          ),
          const SizedBox(width: 8),
          _IconShellBtn(
            borderColor: borderColor,
            icon: Icon(
              LucideIcons.moreHorizontal,
              size: 20,
              color: isDark
                  ? AppColors.textTertiary
                  : AppColors.lightTextTertiary,
            ),
            tooltip: 'admin.common.actions'.tr(),
            onPressed: _showMobileActions,
          ),
        ],
      );
    } else {
      // Desktop: single clean row — search | status | date | export
      // NO labels on dropdowns so they match the search field style
      content = Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(flex: 3, child: searchField),
          const SizedBox(width: 12),
          Expanded(flex: 2, child: buildStatusField(showLabel: false)),
          const SizedBox(width: 12),
          Expanded(flex: 2, child: buildDateField(showLabel: false)),
          const SizedBox(width: 12),
          AppButton.secondary(
            label: 'admin.nav.export'.tr(),
            icon: LucideIcons.download,
            onPressed: () {},
          ),
        ],
      );
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: surface1,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor),
        boxShadow: isDark
            ? null
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 4,
                  offset: const Offset(0, 1),
                ),
              ],
      ),
      child: content,
    );
  }

  // ── Mobile filter bottom sheet ────────────────────────────────────────────
  void _showMobileFilterSheet({
    required bool isDark,
    required Widget statusField,
    required Widget dateField,
  }) {
    final sheetBg = isDark ? AppColors.surface2 : AppColors.lightSurface2;
    final handleColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: sheetBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.5,
          minChildSize: 0.35,
          maxChildSize: 0.9,
          expand: false,
          builder: (context, scrollController) {
            return Column(
              children: [
                const SizedBox(height: 12),
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: handleColor,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 16),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'admin.common.filters'.tr(),
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: textPrimary,
                        ),
                      ),
                      AppButton.ghost(
                        label: 'admin.common.clear'.tr(),
                        onPressed: () {
                          _resetFilters();
                          Navigator.pop(context);
                        },
                      ),
                    ],
                  ),
                ),
                const Divider(),
                Expanded(
                  child: ListView(
                    controller: scrollController,
                    padding: const EdgeInsets.all(20),
                    children: [
                      statusField,
                      const SizedBox(height: 20),
                      dateField,
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: AppButton.primary(
                    label: 'admin.common.close'.tr(),
                    onPressed: () => Navigator.pop(context),
                    fullWidth: true,
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // ── Mobile ⋯ actions sheet ────────────────────────────────────────────────
  void _showMobileActions() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark ? AppColors.surface2 : AppColors.lightSurface2,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.35,
          minChildSize: 0.25,
          maxChildSize: 0.6,
          expand: false,
          builder: (context, scrollController) {
            return Column(
              children: [
                const SizedBox(height: 12),
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.surfaceBorder
                        : AppColors.lightSurfaceBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 16),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'admin.common.actions'.tr(),
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: isDark
                              ? AppColors.textPrimary
                              : AppColors.lightTextPrimary,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(LucideIcons.x, size: 20),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ),
                const Divider(),
                Expanded(
                  child: ListView(
                    controller: scrollController,
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    children: [
                      ListTile(
                        leading: Icon(
                          LucideIcons.download,
                          color: isDark
                              ? AppColors.textSecondary
                              : AppColors.lightTextSecondary,
                        ),
                        title: Text('admin.nav.export'.tr()),
                        onTap: () => Navigator.pop(context),
                      ),
                      ListTile(
                        leading: Icon(
                          LucideIcons.plus,
                          color: isDark
                              ? AppColors.textSecondary
                              : AppColors.lightTextSecondary,
                        ),
                        title: Text('admin.pages.orders.index.addBtn'.tr()),
                        onTap: () {
                          Navigator.pop(context);
                          context.push('/orders/create');
                        },
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: AppButton.primary(
                    label: 'admin.common.close'.tr(),
                    onPressed: () => Navigator.pop(context),
                    fullWidth: true,
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  Widget _buildLoadingCard(bool isDark) {
    final brand = Theme.of(context).colorScheme.primary;
    final textSecondary = isDark
        ? AppColors.textSecondary
        : AppColors.lightTextSecondary;
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
              color: isDark
                  ? AppColors.textSecondary
                  : AppColors.lightTextSecondary,
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
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textTertiary = isDark
        ? AppColors.textTertiary
        : AppColors.lightTextTertiary;
    final hint =
        (_searchController.text.trim().isNotEmpty ||
            ref.read(orderStatusFilterProvider).isNotEmpty)
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
    final money = tenantCurrencyFormatter(
      ref.watch(storeSettingsProvider).settings,
    );
    final brand = Theme.of(context).colorScheme.primary;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textSecondary = isDark
        ? AppColors.textSecondary
        : AppColors.lightTextSecondary;
    final textTertiary = isDark
        ? AppColors.textTertiary
        : AppColors.lightTextTertiary;
    final surfaceBorder = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;

    final pendingIds = ordersState.orders
        .where((o) => o.status == 'PENDING')
        .map((o) => o.id)
        .toList();
    final allPendingSelected =
        pendingIds.isNotEmpty &&
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
          _th(
            'admin.pages.orders.index.table.orderId'.tr(),
            flex: 3,
            isDark: isDark,
          ),
          _th(
            'admin.pages.orders.index.table.customer'.tr(),
            flex: 2,
            isDark: isDark,
          ),
          _th(
            'admin.pages.orders.index.table.phone'.tr(),
            flex: 2,
            isDark: isDark,
          ),
          _th(
            'admin.pages.orders.index.table.delivery'.tr(),
            flex: 2,
            isDark: isDark,
          ),
          _th(
            'admin.pages.orders.index.table.total'.tr(),
            flex: 2,
            isDark: isDark,
          ),
          _th(
            'admin.pages.orders.index.table.status'.tr(),
            flex: 2,
            isDark: isDark,
          ),
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
        final shortUuid = order.id.length > 8
            ? order.id.substring(0, 8)
            : order.id;
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
                    style: TextStyle(fontSize: 13, color: textPrimary),
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
                      color: order.customerPhone.isEmpty
                          ? textTertiary
                          : textSecondary,
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
                        money.format(
                          order.totalWithShippingAmount ?? order.totalAmount,
                        ),
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                          color: textPrimary,
                        ),
                      ),
                      if (order.shippingAmount != null &&
                          order.shippingAmount! > 0)
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
      AppToasts.show(context, 'admin.pages.orders.index.deleteOneConfirm'.tr());
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
        textColor = isDark
            ? AppColors.textSecondary
            : AppColors.lightTextSecondary;
        dotColor = Colors.transparent;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(9999),
        border: Border.all(
          color: tone == _StatChipTone.none
              ? (isDark
                    ? AppColors.surfaceBorder
                    : AppColors.lightSurfaceBorder)
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

// ── Delete confirm dialog ─────────────────────────────────────────────────────
class _DeleteDialog extends StatelessWidget {
  final bool isDark;
  const _DeleteDialog({required this.isDark});

  @override
  Widget build(BuildContext context) {
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textSecondary = isDark
        ? AppColors.textSecondary
        : AppColors.lightTextSecondary;

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
                    child: Icon(
                      LucideIcons.alertTriangle,
                      size: 18,
                      color: AppColors.red,
                    ),
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
                  fontSize: 13,
                  color: textSecondary,
                  height: 1.5,
                ),
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
          color: isDark
              ? AppColors.surfaceBorder
              : AppColors.lightSurfaceBorder,
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

// ── Small bordered icon button (used in mobile filter row) ────────────────────
class _IconShellBtn extends StatelessWidget {
  final Color borderColor;
  final VoidCallback onPressed;
  final Widget icon;
  final String tooltip;

  const _IconShellBtn({
    required this.borderColor,
    required this.onPressed,
    required this.icon,
    required this.tooltip,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: borderColor),
        borderRadius: BorderRadius.circular(8),
      ),
      child: IconButton(
        onPressed: onPressed,
        icon: icon,
        tooltip: tooltip,
        style: IconButton.styleFrom(
          padding: const EdgeInsets.all(12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
    );
  }
}
