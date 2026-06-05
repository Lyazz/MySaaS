import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_theme.dart';
import '../widgets/admin_stat_card.dart';
import '../widgets/buttons/app_button.dart';
import '../widgets/buttons/table_action_button.dart';
import '../providers/admin_dashboard_provider.dart';
import '../providers/auth_provider.dart';
import '../models/app_mode.dart';
import '../providers/store_settings_provider.dart';
import '../widgets/badges/status_badges.dart';
import '../utils/tenant_currency.dart';
import 'package:easy_localization/easy_localization.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(storeSettingsProvider.notifier).fetchStoreSettings();
      ref.read(adminDashboardProvider.notifier).fetchDashboard();
    });
  }

  @override
  Widget build(BuildContext context) {
    final dashboardState = ref.watch(adminDashboardProvider);
    final storeSettingsState = ref.watch(storeSettingsProvider);
    final isMobile = MediaQuery.of(context).size.width < 800;

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
                  _buildWelcomeSection(
                    context,
                    storeSettingsState: storeSettingsState,
                    dashboardState: dashboardState,
                  ),
                  const SizedBox(height: 24),
                  if (dashboardState.error != null && !dashboardState.isLoading)
                    _buildErrorBanner(dashboardState.error!),
                  if (dashboardState.error != null && !dashboardState.isLoading)
                    const SizedBox(height: 16),
                  LayoutBuilder(
                    builder: (context, constraints) => _buildStatsGrid(
                      context,
                      constraints,
                      dashboardState,
                      storeSettingsState,
                    ),
                  ),
                  const SizedBox(height: 24),
                  _buildMainGrid(context, dashboardState, storeSettingsState),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildWelcomeSection(
    BuildContext context, {
    required StoreSettingsState storeSettingsState,
    required AdminDashboardState dashboardState,
  }) {
    final storeName = storeSettingsState.settings.name.trim().isEmpty
        ? 'your store'
        : storeSettingsState.settings.name.trim();
    final showFinishSetup =
        !storeSettingsState.isLoading &&
        storeSettingsState.error == null &&
        storeSettingsState.settings.isCompleted == false;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Welcome back, $storeName',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.w700,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 4),
            Text( 'admin.pages.dashboard.snapshot'.tr(),
              style: TextStyle(
                fontSize: 14,
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withValues(alpha: 0.5),
              ),
            ),
          ],
        ),
        Row(
          children: [
            AppButton.secondary(
              label: 'superAdmin.paymentsPage.actions.refresh'.tr(),
              icon: LucideIcons.refreshCw,
              onPressed: dashboardState.isLoading
                  ? null
                  : () async {
                      await Future.wait([
                        ref
                            .read(storeSettingsProvider.notifier)
                            .fetchStoreSettings(),
                        ref
                            .read(adminDashboardProvider.notifier)
                            .fetchDashboard(),
                      ]);
                    },
            ),
            if (showFinishSetup) ...[
              const SizedBox(width: 12),
              AppButton.primary(
                label: 'admin.pages.onboarding.saveFinish'.tr(),
                icon: LucideIcons.sparkles,
                onPressed: () => context.go('/settings'),
              ),
            ],
          ],
        ),
      ],
    );
  }

  Widget _buildErrorBanner(String message) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2), // red-50
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFECACA)), // red-200
      ),
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            LucideIcons.alertTriangle,
            size: 18,
            color: Color(0xFF991B1B), // red-800
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text( 'app.could_not_load_dashboard_data'.tr(),
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF991B1B),
                  ),
                ),
                const SizedBox(height: 4),
                Text(message, style: const TextStyle(color: Color(0xFF7F1D1D))),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsGrid(
    BuildContext context,
    BoxConstraints constraints,
    AdminDashboardState dashboardState,
    StoreSettingsState storeSettingsState,
  ) {
    // Responsive grid
    final width = constraints.maxWidth;

    // Calculate columns based on width
    int crossAxisCount = 1;
    if (width > 600) crossAxisCount = 2;
    if (width > 1200) crossAxisCount = 4;

    final double spacing = 16;
    final double itemWidth =
        (width - (crossAxisCount - 1) * spacing) / crossAxisCount;

    final money = tenantCurrencyFormatter(
      storeSettingsState.settings,
    );
    final data = dashboardState.data;

    int trendOrdersCount = 0;
    for (final point in data.trends) {
      trendOrdersCount += point.ordersCount;
    }

    return Wrap(
      spacing: spacing,
      runSpacing: spacing,
      children: [
        SizedBox(
          width: itemWidth,
          child: AdminStatCard(
            label: 'admin.pages.dashboard.stats.totalRevenue'.tr(),
            value: money.format(data.revenue.total),
            icon: LucideIcons.wallet,
            tone: 'brand',
            isLoading: dashboardState.isLoading,
            onTap: () => context.go('/sales'),
          ),
        ),
        SizedBox(
          width: itemWidth,
          child: AdminStatCard(
            label: 'admin.pages.dashboard.stats.ordersRevenue'.tr(),
            value: money.format(data.revenue.orders),
            icon: LucideIcons.shoppingBag,
            tone: 'blue',
            isLoading: dashboardState.isLoading,
            onTap: () => context.go('/orders'),
          ),
        ),
        SizedBox(
          width: itemWidth,
          child: AdminStatCard(
            label: 'admin.pages.dashboard.stats.posRevenue'.tr(),
            value: money.format(data.revenue.pos),
            icon: LucideIcons.monitorSmartphone,
            tone: 'indigo',
            isLoading: dashboardState.isLoading,
            onTap: () => context.go('/pos'),
          ),
        ),
        SizedBox(
          width: itemWidth,
          child: AdminStatCard(
            label: 'admin.pages.dashboard.stats.ordersCount'.tr(),
            value: trendOrdersCount.toString(),
            icon: LucideIcons.clipboardList,
            tone: 'amber',
            isLoading: dashboardState.isLoading,
            onTap: () => context.go('/orders'),
          ),
        ),
      ],
    );
  }

  Widget _buildMainGrid(
    BuildContext context,
    AdminDashboardState dashboardState,
    StoreSettingsState storeSettingsState,
  ) {
    final width = MediaQuery.of(context).size.width;
    final wide = width >= 1100;

    if (!wide) {
      return Column(
        children: [
          _buildRecentOrdersSection(
            context,
            dashboardState,
            storeSettingsState,
          ),
          const SizedBox(height: 24),
          _buildSideCards(context, dashboardState),
        ],
      );
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          flex: 2,
          child: _buildRecentOrdersSection(
            context,
            dashboardState,
            storeSettingsState,
          ),
        ),
        const SizedBox(width: 24),
        Expanded(flex: 1, child: _buildSideCards(context, dashboardState)),
      ],
    );
  }

  Widget _buildRecentOrdersSection(
    BuildContext context,
    AdminDashboardState dashboardState,
    StoreSettingsState storeSettingsState,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = Theme.of(context).colorScheme.surface;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    return Container(
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text( 'admin.pages.dashboard.recentOrders.title'.tr(),
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text( 'app.latest_orders_for_this_tenant'.tr(),
                      style: TextStyle(
                        fontSize: 14,
                        color: Theme.of(
                          context,
                        ).colorScheme.onSurface.withValues(alpha: 0.5),
                      ),
                    ),
                  ],
                ),
                AppButton.secondary(
                  label: 'superAdmin.dashboard.recentActivity.viewAll'.tr(),
                  icon: LucideIcons.arrowRight,
                  onPressed: () => context.go('/orders'),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          _buildOrdersTable(context, dashboardState, storeSettingsState),
        ],
      ),
    );
  }

  Widget _buildOrdersTable(
    BuildContext context,
    AdminDashboardState dashboardState,
    StoreSettingsState storeSettingsState,
  ) {
    final recent = dashboardState.data.recentOrders;
    final money = tenantCurrencyFormatter(
      storeSettingsState.settings,
    );
    final showStatus = MediaQuery.of(context).size.width > 700;
    final showDate = MediaQuery.of(context).size.width > 900;

    if (dashboardState.isLoading) {
      return Column(
        children: List.generate(6, (index) {
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Row(
              children: [
                _skeleton(width: 90, height: 14),
                const SizedBox(width: 16),
                Expanded(child: _skeleton(width: 180, height: 14)),
                const SizedBox(width: 16),
                _skeleton(width: 110, height: 14),
                if (showStatus) ...[
                  const SizedBox(width: 16),
                  _skeleton(width: 90, height: 22, radius: 999),
                ],
                if (showDate) ...[
                  const SizedBox(width: 16),
                  _skeleton(width: 140, height: 14),
                ],
                const Spacer(),
                _skeleton(width: 60, height: 14),
              ],
            ),
          );
        }),
      );
    }

    if (recent.isEmpty) {
      return Padding(
        padding: EdgeInsets.all(28),
        child: Column(
          children: [
            Icon(LucideIcons.inbox, size: 40, color: Color(0xFFCBD5E1)),
            SizedBox(height: 12),
            Text( 'app.no_recent_orders'.tr(),
              style: Theme.of(
                context,
              ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
            ),
            SizedBox(height: 4),
            Text( 'app.new_orders_will_appear_here'.tr(),
              style: TextStyle(color: Color(0xFF64748B)),
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Row(
            children: [
              _tableHeader('Order', width: 110),
              Expanded(child: _tableHeader('Customer')),
              _tableHeader('Total', width: 130),
              if (showStatus) _tableHeader('Status', width: 140),
              if (showDate) _tableHeader('Date', width: 170),
              _tableHeader('Action', width: 90, alignRight: true),
            ],
          ),
        ),
        const Divider(height: 1, color: Color(0xFFE2E8F0)),
        ...recent.map((order) {
          final shortId = order.id.length > 8
              ? order.id.substring(0, 8)
              : order.id;
          return InkWell(
            onTap: () => context.go('/orders/${order.id}'),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              child: Row(
                children: [
                  SizedBox(
                    width: 110,
                    child: Text(
                      '#$shortId',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          order.customerName.trim().isEmpty
                              ? '—'
                              : order.customerName.trim(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        Text(
                          order.customerPhone.trim().isEmpty
                              ? '—'
                              : order.customerPhone.trim(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12,
                            color: Theme.of(
                              context,
                            ).colorScheme.onSurface.withValues(alpha: 0.5),
                          ),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(
                    width: 130,
                    child: Text(
                      money.format(order.totalAmount),
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                  ),
                  if (showStatus)
                    SizedBox(
                      width: 140,
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: OrderStatusBadge(status: order.status),
                      ),
                    ),
                  if (showDate)
                    SizedBox(
                      width: 170,
                      child: Text(
                        DateFormat.yMMMd().add_jm().format(order.createdAt),
                        style: TextStyle(
                          fontSize: 12,
                          color: Theme.of(
                            context,
                          ).colorScheme.onSurface.withValues(alpha: 0.5),
                        ),
                      ),
                    ),
                  SizedBox(
                    width: 90,
                    child: Align(
                      alignment: Alignment.centerRight,
                      child: TableActionButton(
                        tooltip: 'admin.pages.billing.history.viewProof'.tr(),
                        icon: LucideIcons.eye,
                        onPressed: () => context.go('/orders/${order.id}'),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildSideCards(
    BuildContext context,
    AdminDashboardState dashboardState,
  ) {
    return Column(
      children: [
        _buildOrderStatusCard(context, dashboardState),
        const SizedBox(height: 24),
        _buildQuickLinksCard(context),
      ],
    );
  }

  Widget _buildOrderStatusCard(
    BuildContext context,
    AdminDashboardState dashboardState,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = Theme.of(context).colorScheme.surface;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final textPrimary = Theme.of(context).colorScheme.onSurface;
    final textSecondary = isDark
        ? AppColors.textSecondary
        : AppColors.lightTextSecondary;
    final textMuted = isDark ? AppColors.textMuted : AppColors.lightTextMuted;

    final rows = [
      (status: 'PENDING', label: 'admin.pages.billing.status.pending.badge'.tr(), dot: const Color(0xFFF59E0B)),
      (status: 'CONFIRMED', label: 'admin.orderStatus.confirmed'.tr(), dot: const Color(0xFF3B82F6)),
      (status: 'SHIPPED', label: 'admin.orderStatus.shipped'.tr(), dot: const Color(0xFF06B6D4)),
      (status: 'DELIVERED', label: 'admin.orderStatus.delivered'.tr(), dot: const Color(0xFF22C55E)),
      (status: 'CANCELLED', label: 'admin.pages.purchases.index.filters.statusValues.CANCELLED'.tr(), dot: const Color(0xFFEF4444)),
      (status: 'RETURNED', label: 'admin.orderStatus.returned'.tr(), dot: const Color(0xFFA855F7)),
    ];

    return Container(
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text( 'admin.pages.dashboard.orderStatus.title'.tr(),
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          Text( 'app.quick_overview_by_status'.tr(),
            style: TextStyle(fontSize: 14, color: textMuted),
          ),
          const SizedBox(height: 16),
          ...rows.map((row) {
            final count = dashboardState.data.ordersByStatus[row.status] ?? 0;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: InkWell(
                onTap: () => context.go(
                  '/orders?status=${Uri.encodeComponent(row.status)}',
                ),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: borderColor),
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 10,
                            height: 10,
                            decoration: BoxDecoration(
                              color: row.dot,
                              borderRadius: BorderRadius.circular(999),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            row.label,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: textSecondary,
                            ),
                          ),
                        ],
                      ),
                      if (dashboardState.isLoading)
                        _skeleton(width: 26, height: 14)
                      else
                        Text(
                          count.toString(),
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: textPrimary,
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildQuickLinksCard(BuildContext context) {
    final authState = ref.read(authProvider);
    final isOffline = authState.mode == AppMode.offlineOnly;

    final links = [
      (label: 'admin.pages.products.index.addProduct'.tr(), icon: LucideIcons.plus, to: '/products/create'),
      (label: 'admin.pages.dashboard.quickLinks.manageProducts'.tr(), icon: LucideIcons.package, to: '/products'),
      (label: 'admin.pages.categories.index.title'.tr(), icon: LucideIcons.tags, to: '/categories'),
      (label: 'admin.tours.sidebar.steps.settings.title'.tr(), icon: LucideIcons.settings, to: '/settings'),
      if (isOffline)
        (
          label: 'app.upgrade_to_online'.tr(),
          icon: LucideIcons.cloudLightning,
          to: '/upgrade',
        ),
    ];

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = Theme.of(context).colorScheme.surface;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final textPrimary = Theme.of(context).colorScheme.onSurface;
    final textSecondary = isDark
        ? AppColors.textSecondary
        : AppColors.lightTextSecondary;
    final textMuted = isDark ? AppColors.textMuted : AppColors.lightTextMuted;

    return Container(
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text( 'app.quick_links'.tr(),
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          Text( 'app.common_actions_to_get_things_d'.tr(),
            style: TextStyle(fontSize: 14, color: textMuted),
          ),
          const SizedBox(height: 16),
          ...links.map((link) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: InkWell(
                onTap: () => context.go(link.to),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: borderColor),
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(link.icon, size: 18, color: textSecondary),
                          const SizedBox(width: 10),
                          Text(
                            link.label,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: textSecondary,
                            ),
                          ),
                        ],
                      ),
                      Icon(
                        LucideIcons.chevronRight,
                        size: 18,
                        color: textMuted,
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _tableHeader(String label, {double? width, bool alignRight = false}) {
    final child = Text(
      label.toUpperCase(),
      style: Theme.of(context).textTheme.labelSmall?.copyWith(
        fontWeight: FontWeight.w700,
        letterSpacing: 0.6,
      ),
    );
    if (width == null) return child;
    return SizedBox(
      width: width,
      child: Align(
        alignment: alignRight ? Alignment.centerRight : Alignment.centerLeft,
        child: child,
      ),
    );
  }

  Widget _skeleton({
    required double width,
    required double height,
    double radius = 8,
  }) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}
