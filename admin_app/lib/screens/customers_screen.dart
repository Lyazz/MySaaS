import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:easy_localization/easy_localization.dart';
import '../providers/customers_provider.dart';
import '../providers/store_settings_provider.dart';
import '../models/customer.dart';
import '../theme/app_theme.dart';
import '../utils/debouncer.dart';
import '../utils/tenant_currency.dart';
import '../widgets/responsive_filter_bar.dart';
import '../widgets/form/form_input.dart';
import '../widgets/buttons/app_button.dart';
import '../widgets/buttons/table_action_button.dart';
import '../widgets/responsive_server_paginated_table.dart';

class CustomersScreen extends ConsumerStatefulWidget {
  final bool autoFetch;

  const CustomersScreen({super.key, this.autoFetch = true});

  @override
  ConsumerState<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends ConsumerState<CustomersScreen> {
  final TextEditingController _searchController = TextEditingController();
  final Debouncer _searchDebouncer = Debouncer(milliseconds: 400);
  final int _itemsPerPage = 25;
  int _page = 1;

  @override
  void initState() {
    super.initState();
    if (widget.autoFetch) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _fetchCustomers());
    }
  }

  @override
  void dispose() {
    _searchDebouncer.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _fetchCustomers() {
    ref
        .read(customersProvider.notifier)
        .fetchCustomers(
          search: _searchController.text,
          page: _page,
          limit: _itemsPerPage,
        );
  }

  void _resetFilters() {
    setState(() {
      _searchController.clear();
      _page = 1;
    });
    _fetchCustomers();
  }

  @override
  Widget build(BuildContext context) {
    final customersState = ref.watch(customersProvider);
    final isMobile = MediaQuery.of(context).size.width < 800;

    return Scaffold(
      floatingActionButton: isMobile
          ? FloatingActionButton(
              onPressed: () => context.go('/customers/create'),
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
                  if (!isMobile) ...[
                    _buildHeader(customersState.isLoading),
                    const SizedBox(height: 24),
                  ],
                  ResponsiveFilterBar(
                    searchField: FormInput(
                      label: 'app.admin_pages_customers_index_fi'.tr()
                          .tr(),
                      controller: _searchController,
                      hint:
                          'admin.pages.customers.index.filters.searchPlaceholder'
                              .tr(),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 14,
                      ),
                      onChanged: (value) => _searchDebouncer.run(() {
                        setState(() => _page = 1);
                        _fetchCustomers();
                      }),
                    ),
                    filters: const [],
                    onClearFilters: _resetFilters,
                  ),
                  const SizedBox(height: 24),
                  if (customersState.isLoading)
                    _buildLoadingCard()
                  else if (customersState.error != null)
                    _buildErrorCard(customersState.error!)
                  else if (customersState.customers.isEmpty)
                    _buildEmptyCard(
                      hint: _searchController.text.trim().isNotEmpty
                          ? 'admin.pages.customers.index.empty.hintFiltered'
                                .tr()
                          : 'admin.pages.customers.index.empty.hint'.tr(),
                    )
                  else
                    _buildCustomersTable(customersState),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(bool loading) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'admin.pages.customers.index.title'.tr(),
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.onSurface,
                  letterSpacing: -0.5,
                ),
              ),
              SizedBox(height: 4),
              Text(
                'admin.pages.customers.index.subtitle'.tr(),
                style: TextStyle(
                  color: Theme.of(
                    context,
                  ).colorScheme.onSurface.withValues(alpha: 0.5),
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        Flexible(
          child: Align(
            alignment: Alignment.centerRight,
            child: Wrap(
              spacing: 12,
              runSpacing: 12,
              alignment: WrapAlignment.end,
              children: [
                AppButton.secondary(
                  label: 'admin.common.refresh'.tr(),
                  icon: LucideIcons.refreshCw,
                  onPressed: loading ? null : _fetchCustomers,
                ),
                AppButton.primary(
                  label: 'app.admin_pages_customers_index_ad'.tr().tr(),
                  icon: LucideIcons.plus,
                  onPressed: () => context.go('/customers/create'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCustomersTable(CustomersState state) {
    final money = tenantCurrencyFormatter(
      ref.watch(storeSettingsProvider).settings,
    );

    return ResponsiveServerPaginatedTable<Customer>(
      items: state.customers,
      minWidth: 1200,
      page: state.page,
      totalPages: state.totalPages,
      totalItems: state.total,
      itemsPerPage: state.limit,
      onPageChanged: (newPage) {
        setState(() => _page = newPage);
        _fetchCustomers();
      },
      header: Row(
        children: [
          _buildHeaderCell(
            'admin.pages.customers.index.table.customer'.tr(),
            flex: 3,
          ),
          _buildHeaderCell('admin.pages.customers.index.table.info'.tr(), flex: 3),
          _buildHeaderCell('admin.pages.customers.index.table.address'.tr(), flex: 3),
          _buildHeaderCell(
            'admin.pages.customers.index.table.orders'.tr(),
            flex: 1,
          ),
          _buildHeaderCell(
            'admin.pages.customers.index.table.totalSpent'.tr(),
            flex: 2,
          ),
          _buildHeaderCell(
            'admin.pages.customers.index.table.lastOrder'.tr(),
            flex: 2,
          ),
          Expanded(
            flex: 2,
            child: Align(
              alignment: Alignment.centerRight,
              child: _headerText(
                'admin.pages.customers.index.table.actions'.tr(),
              ),
            ),
          ),
        ],
      ),
      rowBuilder: (context, customer, index) {
        final balanceColor = customer.currentBalance > 0
            ? const Color(0xFFB91C1C) // Red-700
            : const Color(0xFF15803D); // Green-700

        return InkWell(
          onTap: () => context.go('/customers/${customer.id}'),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: Row(
                    children: [
                      Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: AppColors.blue.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          customer.name.isNotEmpty
                              ? customer.name[0].toUpperCase()
                              : '?',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: AppColors.blue,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          customer.name,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: Theme.of(context).colorScheme.onSurface,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  flex: 3,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if ((customer.email ?? '').trim().isNotEmpty)
                        Row(
                          children: [
                            Icon(
                              LucideIcons.mail,
                              size: 14,
                              color: Theme.of(
                                context,
                              ).colorScheme.onSurface.withValues(alpha: 0.5),
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                customer.email!,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Theme.of(context).colorScheme.onSurface
                                      .withValues(alpha: 0.7),
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      if ((customer.phone).trim().isNotEmpty)
                        Row(
                          children: [
                            Icon(
                              LucideIcons.phone,
                              size: 14,
                              color: Theme.of(
                                context,
                              ).colorScheme.onSurface.withValues(alpha: 0.5),
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                customer.phone,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Theme.of(context).colorScheme.onSurface
                                      .withValues(alpha: 0.7),
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      if ((customer.email ?? '').trim().isEmpty && customer.phone.trim().isEmpty)
                        Text(
                          '—',
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
                Expanded(
                  flex: 3,
                  child: Text(
                    (customer.address ?? '').trim().isEmpty ? '—' : customer.address!,
                    style: TextStyle(
                      fontSize: 13,
                      color: Theme.of(
                        context,
                      ).colorScheme.onSurface.withValues(alpha: 0.7),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Expanded(
                  flex: 1,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: Theme.of(
                        context,
                      ).colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${customer.ordersCount}',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Text(
                    money.format(customer.totalSpent),
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Text(
                    customer.lastOrderAt != null
                        ? DateFormat.yMMMd().format(customer.lastOrderAt!)
                        : '—',
                    style: TextStyle(
                      fontSize: 13,
                      color: Theme.of(
                        context,
                      ).colorScheme.onSurface.withValues(alpha: 0.5),
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
                      onPressed: () => context.go('/customers/${customer.id}'),
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

  Widget _buildLoadingCard() {
    return _card(
      child: Padding(
        padding: EdgeInsets.all(48),
        child: Column(
          children: [
            const SizedBox(
              height: 32,
              width: 32,
              child: CircularProgressIndicator(strokeWidth: 3),
            ),
            const SizedBox(height: 12),
            Text(
              'admin.pages.customers.index.loading'.tr(),
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
              label: 'admin.common.refresh'.tr(),
              icon: LucideIcons.refreshCw,
              onPressed: _fetchCustomers,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyCard({required String hint}) {
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
            Text(
              'admin.pages.customers.index.empty.title'.tr(),
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
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withValues(alpha: 0.5),
              ),
            ),
            const SizedBox(height: 16),
            AppButton.primary(
              label: 'app.admin_pages_customers_index_ad'.tr().tr(),
              icon: LucideIcons.plus,
              onPressed: () => context.go('/customers/create'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _headerText(String text) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Text(
      text.toUpperCase(),
      style: TextStyle(
        color: isDark ? AppColors.textTertiary : AppColors.lightTextTertiary,
        fontSize: 11,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.5,
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
