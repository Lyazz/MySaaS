import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:easy_localization/easy_localization.dart';

import '../models/customer.dart';
import '../models/customer_detail.dart';
import '../models/customer_payment.dart';
import '../models/customer_sale.dart';
import '../providers/customers_provider.dart';
import '../providers/store_settings_provider.dart';
import '../theme/app_theme.dart';
import '../utils/tenant_currency.dart';
import '../widgets/badges/status_badges.dart';
import '../widgets/badges/ui_badge.dart';
import '../widgets/buttons/app_button.dart';
import '../widgets/buttons/table_action_button.dart';
import '../widgets/responsive_server_paginated_table.dart';
import '../widgets/stat_card.dart';

class CustomerDetailScreen extends ConsumerStatefulWidget {
  final String customerId;

  const CustomerDetailScreen({super.key, required this.customerId});

  @override
  ConsumerState<CustomerDetailScreen> createState() =>
      _CustomerDetailScreenState();
}

class _CustomerDetailScreenState extends ConsumerState<CustomerDetailScreen> {
  late Future<CustomerDetail?> _future;

  @override
  void initState() {
    super.initState();
    _future = _fetch();
  }

  @override
  void didUpdateWidget(covariant CustomerDetailScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.customerId != widget.customerId) {
      _future = _fetch(force: true);
    }
  }

  Future<CustomerDetail?> _fetch({bool force = false}) {
    return ref
        .read(customersProvider.notifier)
        .fetchCustomerDetail(widget.customerId, force: force);
  }

  void _refresh() {
    setState(() => _future = _fetch(force: true));
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.sizeOf(context).width < 800;
    final locale = context.locale.toLanguageTag();

    return Scaffold(
      body: SingleChildScrollView(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 1280),
            child: Padding(
              padding: EdgeInsets.all(isMobile ? 16 : 24),
              child: FutureBuilder<CustomerDetail?>(
                future: _future,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return _loadingCard();
                  }

                  if (snapshot.hasError) {
                    return _errorCard(snapshot.error.toString());
                  }

                  final detail = snapshot.data;
                  final summary = detail?.summary;
                  if (detail == null || summary == null) {
                    return _notFoundCard();
                  }

                  final sales = detail.sales;
                  final payments = detail.payments;
                  final money = tenantCurrencyFormatter(
                    ref.watch(storeSettingsProvider).settings,
                  );

                  final totalSpent = sales.fold<double>(
                    0,
                    (sum, s) => sum + s.totalAmount,
                  );
                  final totalPaid = payments.fold<double>(
                    0,
                    (sum, p) => sum + p.amount,
                  );
                  final computedBalance =
                      summary.openingBalance + totalSpent - totalPaid;
                  final currentBalance = summary.currentBalance != 0
                      ? summary.currentBalance
                      : computedBalance;

                  final balanceColor = currentBalance >= 0
                      ? const Color(0xFFB45309) // Amber-700
                      : const Color(0xFF047857); // Emerald-700

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildHeader(),
                      const SizedBox(height: 12),
                      if (!isMobile)
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(child: _buildTitleBlock(summary)),
                            const SizedBox(width: 16),
                            Expanded(
                              child: _buildStatsRow(
                                ordersCount: sales.length,
                                totalSpent: money.format(totalSpent),
                                totalPaid: money.format(totalPaid),
                                currentBalance: money.format(currentBalance),
                                balanceColor: balanceColor,
                              ),
                            ),
                          ],
                        )
                      else ...[
                        _buildTitleBlock(summary),
                        const SizedBox(height: 12),
                        _buildStatsRow(
                          ordersCount: sales.length,
                          totalSpent: money.format(totalSpent),
                          totalPaid: money.format(totalPaid),
                          currentBalance: money.format(currentBalance),
                          balanceColor: balanceColor,
                        ),
                      ],
                      const SizedBox(height: 20),
                      if (sales.isEmpty && payments.isEmpty)
                        _emptyCard()
                      else ...[
                        if (sales.isNotEmpty) ...[
                          _buildSalesTable(sales, money, locale: locale),
                          const SizedBox(height: 24),
                        ],
                        if (payments.isNotEmpty) ...[
                          _buildPaymentsTable(payments, money, locale: locale),
                        ],
                      ],
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      children: [
        InkWell(
          onTap: () => context.go('/customers'),
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: 6),
            child: Row(
              children: [
                Icon(
                  LucideIcons.arrowLeft,
                  size: 16,
                  color: Theme.of(
                    context,
                  ).colorScheme.onSurface.withValues(alpha: 0.5),
                ),
                const SizedBox(width: 6),
                Text(
                  'admin.pages.customers.index.title'.tr(),
                  style: TextStyle(
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.5),
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTitleBlock(Customer summary) {
    final phone = summary.phone.trim();
    final address = (summary.address ?? '').trim();
    final subtitle = [
      if (phone.isNotEmpty) phone,
      if (address.isNotEmpty) address,
    ].join(' · ');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                summary.name.trim().isEmpty
                    ? 'admin.pages.customers.detail.fallbackTitle'.tr()
                    : summary.name.trim(),
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: Theme.of(context).colorScheme.onSurface,
                  letterSpacing: -0.5,
                ),
              ),
            ),
            const SizedBox(width: 12),
            AppButton.secondary(
              label: 'admin.common.edit'.tr(),
              icon: LucideIcons.pencil,
              size: AppButtonSize.sm,
              onPressed: () => context.push('/customers/edit/${summary.id}'),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          subtitle,
          style: TextStyle(
            color: Theme.of(
              context,
            ).colorScheme.onSurface.withValues(alpha: 0.5),
            fontSize: 14,
          ),
        ),
      ],
    );
  }

  Widget _buildStatsRow({
    required int ordersCount,
    required String totalSpent,
    required String totalPaid,
    required String currentBalance,
    required Color balanceColor,
  }) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 720;

        final cards = [
          StatCard(
            label: 'admin.pages.customers.detail.stats.orders'.tr(),
            value: ordersCount.toString(),
            icon: LucideIcons.shoppingBag,
            moodColor: const Color(0xFF2563EB), // Blue-600
            dense: true,
            showIcon: false,
          ),
          StatCard(
            label: 'app.admin_pages_customers_detail_s'.tr().tr(),
            value: totalSpent,
            icon: LucideIcons.dollarSign,
            moodColor: const Color(0xFF4D7C0F), // Lime-700
            dense: true,
            showIcon: false,
          ),
          StatCard(
            label: 'app.admin_pages_customers_detail_s2'.tr().tr(),
            value: totalPaid,
            icon: LucideIcons.wallet,
            moodColor: const Color(0xFF047857), // Emerald-700
            dense: true,
            showIcon: false,
          ),
          StatCard(
            label: 'app.admin_pages_customers_detail_s3'.tr().tr(),
            value: currentBalance,
            icon: LucideIcons.scale,
            moodColor: balanceColor,
            dense: true,
            showIcon: false,
          ),
        ];

        if (isWide) {
          return Row(
            children: [
              Expanded(child: cards[0]),
              const SizedBox(width: 12),
              Expanded(child: cards[1]),
              const SizedBox(width: 12),
              Expanded(child: cards[2]),
              const SizedBox(width: 12),
              Expanded(child: cards[3]),
            ],
          );
        }

        final cardWidth = (constraints.maxWidth - 12) / 2;
        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            SizedBox(width: cardWidth, child: cards[0]),
            SizedBox(width: cardWidth, child: cards[1]),
            SizedBox(width: cardWidth, child: cards[2]),
            SizedBox(width: cardWidth, child: cards[3]),
          ],
        );
      },
    );
  }

  Widget _buildSalesTable(
    List<CustomerSale> sales,
    NumberFormat money, {
    required String locale,
  }) {
    return ResponsiveServerPaginatedTable<CustomerSale>(
      items: sales,
      title: Text('admin.pages.customers.detail.stats.orders'.tr()),
      minWidth: 950,
      page: 1,
      totalPages: 1,
      totalItems: sales.length,
      itemsPerPage: sales.length,
      onPageChanged: (_) {},
      showFooter: false,
      header: Row(
        children: [
          _buildHeaderCell(
            'admin.pages.customers.detail.table.order'.tr(),
            flex: 2,
          ),
          _buildHeaderCell(
            'admin.pages.customers.detail.table.total'.tr(),
            flex: 2,
          ),
          _buildHeaderCell(
            'admin.pages.customers.detail.table.status'.tr(),
            flex: 2,
          ),
          _buildHeaderCell(
            'admin.pages.customers.detail.table.date'.tr(),
            flex: 3,
          ),
          Expanded(
            flex: 2,
            child: Align(
              alignment: Alignment.centerRight,
              child: _headerText(
                'admin.pages.customers.detail.table.actions'.tr(),
              ),
            ),
          ),
        ],
      ),
      rowBuilder: (context, s, index) {
        final shortId = s.id.length > 8 ? s.id.substring(0, 8) : s.id;
        final date = s.createdAt ?? s.updatedAt;

        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Row(
            children: [
              Expanded(
                flex: 2,
                child: Text(
                  '#$shortId',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  money.format(s.totalAmount),
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
                  child: SaleStatusBadge(status: s.status),
                ),
              ),
              Expanded(
                flex: 3,
                child: Text(
                  date != null
                      ? DateFormat.yMMMd(locale).add_jm().format(date)
                      : '—',
                  style: TextStyle(
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.5),
                    fontSize: 13,
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Align(
                  alignment: Alignment.centerRight,
                  child: TableActionButton(
                    tooltip: 'admin.common.view'.tr(),
                    icon: LucideIcons.eye,
                    onPressed: () => context.push('/sales/${s.id}'),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPaymentsTable(
    List<CustomerPayment> payments,
    NumberFormat money, {
    required String locale,
  }) {
    return ResponsiveServerPaginatedTable<CustomerPayment>(
      items: payments,
      title: Text('admin.pages.customers.detail.stats.payments'.tr()),
      minWidth: 950,
      page: 1,
      totalPages: 1,
      totalItems: payments.length,
      itemsPerPage: payments.length,
      onPageChanged: (_) {},
      showFooter: false,
      header: Row(
        children: [
          _buildHeaderCell(
            'admin.pages.customers.detail.table.date'.tr(),
            flex: 3,
          ),
          _buildHeaderCell(
            'admin.pages.customers.detail.table.total'.tr(),
            flex: 2,
          ),
          _buildHeaderCell(
            'admin.pages.customers.detail.stats.method'.tr(),
            flex: 2,
          ),
          _buildHeaderCell(
            'admin.pages.customers.detail.stats.reference'.tr(),
            flex: 3,
          ),
          Expanded(
            flex: 2,
            child: Align(
              alignment: Alignment.centerRight,
              child: _headerText(
                'admin.pages.customers.detail.table.actions'.tr(),
              ),
            ),
          ),
        ],
      ),
      rowBuilder: (context, p, index) {
        final date = p.createdAt;
        final method = p.method.trim().isEmpty ? '—' : p.method.trim();
        final reference = (p.reference ?? '').trim();

        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Row(
            children: [
              Expanded(
                flex: 3,
                child: Text(
                  date != null
                      ? DateFormat.yMMMd(locale).add_jm().format(date)
                      : '—',
                  style: TextStyle(
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.5),
                    fontSize: 13,
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  money.format(p.amount),
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
                  child: UiBadge(
                    label: method,
                    tone: UiBadgeTone.slate,
                    uppercase: true,
                    maxWidth: 120,
                  ),
                ),
              ),
              Expanded(
                flex: 3,
                child: Text(
                  reference.isEmpty ? '—' : reference,
                  style: TextStyle(
                    fontSize: 13,
                    color: reference.isEmpty
                        ? Theme.of(
                            context,
                          ).colorScheme.onSurface.withValues(alpha: 0.3)
                        : Theme.of(
                            context,
                          ).colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Align(
                  alignment: Alignment.centerRight,
                  child: p.saleId == null || p.saleId!.trim().isEmpty
                      ? Text( 'app.str_204'.tr(),
                          style: TextStyle(
                            color: Theme.of(
                              context,
                            ).colorScheme.onSurface.withValues(alpha: 0.3),
                          ),
                        )
                      : TableActionButton(
                          tooltip: 'admin.common.view'.tr(),
                          icon: LucideIcons.eye,
                          onPressed: () =>
                              context.push('/sales/${p.saleId!.trim()}'),
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

  Widget _loadingCard() {
    return _card(
      child: Padding(
        padding: const EdgeInsets.all(48),
        child: Column(
          children: [
            const SizedBox(
              height: 32,
              width: 32,
              child: CircularProgressIndicator(strokeWidth: 3),
            ),
            const SizedBox(height: 12),
            Text(
              'admin.pages.customers.detail.loading'.tr(),
              style: TextStyle(
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withValues(alpha: 0.5),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _errorCard(String message) {
    return _card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const Icon(LucideIcons.alertCircle, size: 28),
            const SizedBox(height: 12),
            Text( 'app.admin_pages_customers_detail_e'.tr().tr(),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            AppButton.secondary(
              label: 'admin.common.refresh'.tr(),
              icon: LucideIcons.refreshCw,
              onPressed: _refresh,
            ),
          ],
        ),
      ),
    );
  }

  Widget _notFoundCard() {
    return _card(
      child: Padding(
        padding: const EdgeInsets.all(48),
        child: Column(
          children: [
            Icon(
              LucideIcons.users,
              size: 48,
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.3),
            ),
            const SizedBox(height: 12),
            Text( 'app.admin_pages_customers_detail_n'.tr().tr(),
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 8),
            Text( 'app.admin_pages_customers_detail_n2'.tr().tr(),
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withValues(alpha: 0.5),
              ),
            ),
            const SizedBox(height: 16),
            AppButton.secondary(
              label: 'admin.common.back'.tr(),
              icon: LucideIcons.arrowLeft,
              onPressed: () => context.go('/customers'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _emptyCard() {
    return _card(
      child: Padding(
        padding: const EdgeInsets.all(48),
        child: Column(
          children: [
            Icon(
              LucideIcons.clipboardList,
              size: 48,
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.3),
            ),
            const SizedBox(height: 12),
            Text(
              'admin.pages.customers.detail.empty.title'.tr(),
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'admin.pages.customers.detail.empty.hint'.tr(),
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withValues(alpha: 0.5),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _card({required Widget child}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark
              ? AppColors.surfaceBorder
              : AppColors.lightSurfaceBorder,
        ),
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
