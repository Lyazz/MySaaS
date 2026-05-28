import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';
import '../models/order.dart';
import '../providers/orders_provider.dart';
import '../providers/store_settings_provider.dart';
import '../utils/debouncer.dart';
import '../utils/tenant_currency.dart';
import '../widgets/responsive_filter_bar.dart';
import '../widgets/responsive_server_paginated_table.dart';
import '../widgets/form/date_range_filter_field.dart';
import '../widgets/form/form_input.dart';
import '../widgets/form/form_select.dart';
import '../widgets/buttons/app_button.dart';
import '../widgets/badges/status_badges.dart';

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

  @override
  void initState() {
    super.initState();
    _setDefaultFilters();
    final initialStatus = widget.initialStatus?.trim() ?? '';
    if (initialStatus.isNotEmpty) {
      _selectedStatus = initialStatus;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchOrders();
    });
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
    setState(_setDefaultFilters);
    _fetchOrders();
  }

  void _fetchOrders() {
    ref
        .read(ordersProvider.notifier)
        .fetchOrders(
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

  @override
  Widget build(BuildContext context) {
    final ordersState = ref.watch(ordersProvider);
    final isMobile = MediaQuery.of(context).size.width < 800;

    return Scaffold(
      floatingActionButton: isMobile
          ? FloatingActionButton(
              onPressed: () => context.go('/pos'),
              backgroundColor: AppColors.brand,
              child: const Icon(LucideIcons.plus, color: AppColors.brandContrast),
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
                  if (!isMobile) ...[
                    _buildHeader(),
                    const SizedBox(height: 24),
                  ],
                  _buildFiltersCard(),
                  const SizedBox(height: 24),
                  if (ordersState.isLoading)
                    _buildLoadingCard()
                  else if (ordersState.error != null)
                    _buildErrorCard(ordersState.error!)
                  else if (ordersState.orders.isEmpty)
                    _buildEmptyCard()
                  else
                    _buildOrdersTable(ordersState),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Orders',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.onSurface,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Manage customer orders',
              style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5)),
            ),
          ],
        ),
        AppButton.primary(
          label: 'New Order',
          icon: LucideIcons.plus,
          onPressed: () => context.push('/orders/create'),
        ),
      ],
    );
  }

  bool get _hasSearchOrStatusFilter =>
      _searchController.text.trim().isNotEmpty || _selectedStatus.isNotEmpty;

  Widget _buildFiltersCard() {
    return ResponsiveFilterBar(
      searchField: FormInput(
        label: 'Search',
        controller: _searchController,
        hint: 'Search orders...',
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
        onChanged: (value) => _debouncer.run(() {
          setState(() => _page = 1);
          _fetchOrders();
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
            onChanged: (range) {
              setState(() {
                _page = 1;
                _startDate = range?.start;
                _endDate = range?.end;
              });
              _fetchOrders();
            },
          ),
        ),
        SizedBox(
          width: 220,
          child: FormSelect<String>(
            label: 'Status',
            value: _selectedStatus,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 14,
            ),
            items: const [
              DropdownMenuItem(value: '', child: Text('All Orders')),
              DropdownMenuItem(value: 'PENDING', child: Text('Pending')),
              DropdownMenuItem(value: 'CONFIRMED', child: Text('Confirmed')),
              DropdownMenuItem(value: 'SHIPPED', child: Text('Shipped')),
              DropdownMenuItem(value: 'DELIVERED', child: Text('Delivered')),
              DropdownMenuItem(value: 'CANCELLED', child: Text('Cancelled')),
              DropdownMenuItem(value: 'RETURNED', child: Text('Returned')),
            ],
            onChanged: (value) {
              setState(() {
                _selectedStatus = value ?? '';
                _page = 1;
              });
              _fetchOrders();
            },
          ),
        ),
      ],
      onClearFilters: _resetFilters,
    );
  }

  Widget _buildLoadingCard() {
    return _card(
      child: const Padding(
        padding: EdgeInsets.all(48),
        child: Column(
          children: [
            SizedBox(
              height: 32,
              width: 32,
              child: CircularProgressIndicator(strokeWidth: 3),
            ),
            SizedBox(height: 12),
            Text(
              'Loading orders...',
              style: TextStyle(color: Color(0xFF64748B)), // Slate-500
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorCard(String message) {
    return _card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const Icon(LucideIcons.alertCircle, size: 28),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            AppButton.secondary(
              label: 'Retry',
              icon: LucideIcons.refreshCw,
              onPressed: _fetchOrders,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyCard() {
    final hint = _hasSearchOrStatusFilter
        ? 'Try adjusting your filters.'
        : 'No orders yet. New orders will appear here.';

    return _card(
      child: Padding(
        padding: const EdgeInsets.all(48),
        child: Column(
          children: [
            Icon(LucideIcons.clipboardList, size: 48, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.3)),
            const SizedBox(height: 12),
            Text(
              'No orders found',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              hint,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrdersTable(OrdersState ordersState) {
    final money = tenantCurrencyFormatter(
      ref.watch(storeSettingsProvider).settings,
    );

    return ResponsiveServerPaginatedTable<Order>(
      items: ordersState.orders,
      minWidth: 1100,
      page: ordersState.page,
      totalPages: ordersState.totalPages,
      totalItems: ordersState.total,
      itemsPerPage: ordersState.limit,
      onPageChanged: (newPage) {
        setState(() => _page = newPage);
        _fetchOrders();
      },
      header: Row(
        children: [
          _buildHeaderCell('Order ID', flex: 2),
          _buildHeaderCell('Customer', flex: 3),
          _buildHeaderCell('Phone', flex: 2),
          _buildHeaderCell('Total', flex: 2),
          _buildHeaderCell('Status', flex: 2),
          _buildHeaderCell('Date', flex: 2),
          Expanded(
            flex: 2,
            child: Align(
              alignment: Alignment.centerRight,
              child: _headerText('Actions'),
            ),
          ),
        ],
      ),
      rowBuilder: (context, order, index) {
        final shortId = order.id.length > 8
            ? order.id.substring(0, 8)
            : order.id;
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Row(
            children: [
              Expanded(
                flex: 2,
                child: InkWell(
                  onTap: () => context.push('/orders/${order.id}'),
                  child: Text(
                    '#$shortId',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                ),
              ),
              Expanded(
                flex: 3,
                child: order.customerId == null || order.customerId!.isEmpty
                    ? Text(
                        order.customerName,
                        style: TextStyle(
                          fontWeight: FontWeight.w500,
                          fontSize: 14,
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                      )
                    : InkWell(
                        onTap: () =>
                            context.push('/customers/${order.customerId}'),
                        child: Text(
                          order.customerName,
                          style: TextStyle(
                            fontWeight: FontWeight.w500,
                            fontSize: 14,
                            color: Theme.of(context).colorScheme.onSurface,
                          ),
                        ),
                      ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  order.customerPhone.isEmpty ? '-' : order.customerPhone,
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: order.customerPhone.isEmpty ? 0.3 : 0.6),
                    fontSize: 13,
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  money.format(order.totalAmount),
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: OrderStatusBadge(status: order.status),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  DateFormat.yMMMd().add_jm().format(order.createdAt),
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                    fontSize: 13,
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Align(
                  alignment: Alignment.centerRight,
                  child: AppButton.secondary(
                    label: 'View',
                    icon: LucideIcons.eye,
                    size: AppButtonSize.sm,
                    onPressed: () => context.push('/orders/${order.id}'),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _headerText(String text) {
    return Text(
      text,
      style: TextStyle(
        color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
        fontSize: 12,
        fontWeight: FontWeight.w600,
      ),
    );
  }

  Widget _buildHeaderCell(String text, {required int flex}) {
    return Expanded(flex: flex, child: _headerText(text));
  }

  Widget _card({required Widget child}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? AppColors.surfaceBorder : AppColors.lightSurfaceBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Center(child: child),
    );
  }
}
