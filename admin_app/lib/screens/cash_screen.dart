import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:easy_localization/easy_localization.dart';

import '../models/cash.dart';
import '../models/customer.dart';
import '../models/supplier.dart';
import '../providers/cash_provider.dart';
import '../providers/customers_provider.dart';
import '../providers/store_settings_provider.dart';
import '../providers/suppliers_provider.dart';
import '../theme/app_theme.dart';
import '../utils/debouncer.dart';
import '../utils/tenant_currency.dart';
import '../widgets/responsive_paginated_table.dart';
import '../widgets/form/form_input.dart';
import '../widgets/form/form_select.dart';
import '../widgets/dialogs/app_dialog.dart';
import '../widgets/buttons/app_button.dart';

class CashScreen extends ConsumerStatefulWidget {
  final bool autoFetch;

  const CashScreen({super.key, this.autoFetch = true});

  @override
  ConsumerState<CashScreen> createState() => _CashScreenState();
}

enum _CashAction { customerPayment, supplierPayment, expense, charge, transfer }

class _CashScreenState extends ConsumerState<CashScreen> {
  int _mainTab = 0; // 0 transactions, 1 sessions

  final Debouncer _filtersDebouncer = Debouncer(milliseconds: 300);

  bool _txFiltersOpen = true;
  bool _sessionFiltersOpen = true;

  String _txCashboxId = '';
  String _txType = '';
  String _txDirection = '';
  String _txMethod = '';
  String _txUserId = '';
  late DateTimeRange _txRange;

  String _sessionCashboxId = '';
  String _sessionStatus = '';
  String _sessionUserId = '';
  late DateTimeRange _sessionRange;

  static DateTime _startOfDay(DateTime dt) =>
      DateTime(dt.year, dt.month, dt.day);
  static DateTime _endOfDay(DateTime dt) =>
      DateTime(dt.year, dt.month, dt.day, 23, 59, 59, 999);

  static DateTimeRange _defaultRange() {
    final now = DateTime.now();
    final start = _startOfDay(now.subtract(const Duration(days: 7)));
    final end = _endOfDay(now);
    return DateTimeRange(start: start, end: end);
  }

  @override
  void initState() {
    super.initState();
    _txRange = _defaultRange();
    _sessionRange = _defaultRange();
    if (widget.autoFetch) {
      Future.microtask(() async {
        await _refreshAll();
      });
    }
  }

  @override
  void dispose() {
    _filtersDebouncer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cash = ref.watch(cashProvider);
    final width = MediaQuery.of(context).size.width;
    final isMobile = width < 768;

    final money = tenantCurrencyFormatter(
      ref.watch(storeSettingsProvider).settings,
    );
    final todayStart = _startOfDay(DateTime.now());

    double totalIn = 0;
    double totalOut = 0;
    for (final tx in cash.transactions) {
      final createdAt = tx.createdAt;
      if (createdAt == null) continue;
      if (createdAt.isBefore(todayStart)) continue;
      if (tx.direction == 'IN') {
        totalIn += tx.amount;
      } else if (tx.direction == 'OUT') {
        totalOut += tx.amount;
      }
    }

    final activeSessions = cash.cashboxes
        .where((c) => c.openSession != null)
        .length;
    final cashboxById = {for (final c in cash.cashboxes) c.id: c};
    final userById = {for (final u in cash.cashUsers) u.id: u.email};

    return Scaffold(
      floatingActionButton: isMobile
          ? FloatingActionButton(
              onPressed: () => _openMobileActions(context),
              backgroundColor: AppColors.brand,
              child: const Icon(
                LucideIcons.plus,
                color: AppColors.brandContrast,
              ),
            )
          : null,
      body: ListView(
        padding: EdgeInsets.all(isMobile ? 16 : 24),
        children: [
          _buildHeader(context, isMobile),
          const SizedBox(height: 16),
          _buildStatsRow(
            money: money,
            totalIn: totalIn,
            totalOut: totalOut,
            activeSessions: activeSessions,
          ),
          const SizedBox(height: 16),
          if (cash.error != null) ...[
            _ErrorBanner(message: cash.error!),
            const SizedBox(height: 16),
          ],
          _buildCashboxesSection(context, cash: cash, cashboxById: cashboxById),
          const SizedBox(height: 16),
          _buildMainPanel(
            context,
            cash: cash,
            money: money,
            isMobile: isMobile,
            cashboxById: cashboxById,
            userById: userById,
          ),
          const SizedBox(height: 64),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context, bool isMobile) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Cash',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: Theme.of(context).colorScheme.onSurface,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Cashboxes, transactions, and session history.',
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
        if (!isMobile) _buildDesktopActionsMenu(context),
      ],
    );
  }

  Widget _buildDesktopActionsMenu(BuildContext context) {
    return PopupMenuButton<_CashAction>(
      onSelected: (action) => _handleAction(context, action),
      itemBuilder: (context) => const [
        PopupMenuItem(
          value: _CashAction.customerPayment,
          child: ListTile(
            dense: true,
            leading: Icon(LucideIcons.user, size: 18),
            title: Text('New customer payment'),
          ),
        ),
        PopupMenuItem(
          value: _CashAction.supplierPayment,
          child: ListTile(
            dense: true,
            leading: Icon(LucideIcons.truck, size: 18),
            title: Text('New supplier payment'),
          ),
        ),
        PopupMenuDivider(),
        PopupMenuItem(
          value: _CashAction.expense,
          child: ListTile(
            dense: true,
            leading: Icon(LucideIcons.minusCircle, size: 18),
            title: Text('New expense'),
          ),
        ),
        PopupMenuItem(
          value: _CashAction.charge,
          child: ListTile(
            dense: true,
            leading: Icon(LucideIcons.receipt, size: 18),
            title: Text('New charge'),
          ),
        ),
        PopupMenuDivider(),
        PopupMenuItem(
          value: _CashAction.transfer,
          child: ListTile(
            dense: true,
            leading: Icon(
              LucideIcons.arrowLeftRight,
              size: 18,
              color: Color(0xFF4D7C0F),
            ),
            title: Text('Transfer'),
          ),
        ),
      ],
      child: IgnorePointer(
        // When the child is a Button, it can win the gesture arena and prevent
        // PopupMenuButton from opening. IgnorePointer lets PopupMenuButton
        // handle taps while keeping the same visual styling.
        child: AppButton.primary(
          label: 'New action',
          icon: LucideIcons.plus,
          trailing: const Icon(LucideIcons.chevronDown, size: 18),
          onPressed: null,
        ),
      ),
    );
  }

  void _openMobileActions(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(LucideIcons.user),
              title: const Text('New customer payment'),
              onTap: () {
                Navigator.of(ctx).pop();
                _handleAction(context, _CashAction.customerPayment);
              },
            ),
            ListTile(
              leading: const Icon(LucideIcons.truck),
              title: const Text('New supplier payment'),
              onTap: () {
                Navigator.of(ctx).pop();
                _handleAction(context, _CashAction.supplierPayment);
              },
            ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(LucideIcons.minusCircle),
              title: const Text('New expense'),
              onTap: () {
                Navigator.of(ctx).pop();
                _handleAction(context, _CashAction.expense);
              },
            ),
            ListTile(
              leading: const Icon(LucideIcons.receipt),
              title: const Text('New charge'),
              onTap: () {
                Navigator.of(ctx).pop();
                _handleAction(context, _CashAction.charge);
              },
            ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(
                LucideIcons.arrowLeftRight,
                color: Color(0xFF4D7C0F),
              ),
              title: const Text('Transfer'),
              onTap: () {
                Navigator.of(ctx).pop();
                _handleAction(context, _CashAction.transfer);
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsRow({
    required NumberFormat money,
    required double totalIn,
    required double totalOut,
    required int activeSessions,
  }) {
    final net = totalIn - totalOut;
    return LayoutBuilder(
      builder: (context, constraints) {
        final max = constraints.maxWidth;
        int cols = 4;
        if (max < 1100) cols = 2;
        if (max < 560) cols = 1;
        return GridView.count(
          crossAxisCount: cols,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: cols == 1 ? 3.2 : 2.6,
          children: [
            _CashStatCard(
              icon: LucideIcons.arrowDownLeft,
              iconBg: const Color(0xFFD1FAE5), // emerald-100
              iconColor: const Color(0xFF059669), // emerald-600
              label: 'Total In (Today)',
              value: money.format(totalIn),
              valueColor: const Color(0xFF059669),
            ),
            _CashStatCard(
              icon: LucideIcons.arrowUpRight,
              iconBg: const Color(0xFFFFE4E6), // rose-100
              iconColor: const Color(0xFFE11D48), // rose-600
              label: 'Total Out (Today)',
              value: money.format(totalOut),
              valueColor: const Color(0xFFE11D48),
            ),
            _CashStatCard(
              icon: LucideIcons.wallet,
              iconBg: const Color(0xFFE0E7FF), // indigo-100
              iconColor: const Color(0xFF4F46E5), // indigo-600
              label: 'Active Sessions',
              value: activeSessions.toString(),
            ),
            _CashStatCard(
              icon: LucideIcons.trendingUp,
              iconBg: const Color(0xFFFEF3C7), // amber-100
              iconColor: const Color(0xFFD97706), // amber-600
              label: 'Net (Today)',
              value: money.format(net),
              valueColor: net >= 0
                  ? const Color(0xFF059669)
                  : const Color(0xFFE11D48),
            ),
          ],
        );
      },
    );
  }

  Widget _buildCashboxesSection(
    BuildContext context, {
    required CashState cash,
    required Map<String, CashboxSummary> cashboxById,
  }) {
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Text(
                  'Cashboxes',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
              ),
              AppButton.secondary(
                label: 'Create',
                icon: LucideIcons.plus,
                size: AppButtonSize.sm,
                onPressed: cash.isLoadingCashboxes
                    ? null
                    : () => _createCashbox(context),
              ),
              const SizedBox(width: 12),
              AppButton.secondary(
                label: 'Refresh',
                icon: LucideIcons.refreshCw,
                size: AppButtonSize.sm,
                onPressed: cash.isLoadingCashboxes ? null : _refreshAll,
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (cash.isLoadingCashboxes)
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: List.generate(
                  3,
                  (i) => Container(
                    width: 280,
                    height: 132,
                    margin: EdgeInsets.only(right: i == 2 ? 0 : 12),
                    decoration: BoxDecoration(
                      color: Theme.of(
                        context,
                      ).colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ),
            )
          else if (cash.cashboxes.isEmpty)
            Builder(
              builder: (context) {
                final isDark = Theme.of(context).brightness == Brightness.dark;
                return Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isDark
                          ? AppColors.surfaceBorder
                          : AppColors.lightSurfaceBorder,
                    ),
                  ),
                  child: Column(
                    children: [
                      Icon(
                        LucideIcons.inbox,
                        color: Theme.of(
                          context,
                        ).colorScheme.onSurface.withValues(alpha: 0.3),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'No cashboxes yet',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Create one to start tracking cash sessions.',
                        style: TextStyle(
                          color: Theme.of(
                            context,
                          ).colorScheme.onSurface.withValues(alpha: 0.5),
                        ),
                      ),
                    ],
                  ),
                );
              },
            )
          else
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: cash.cashboxes
                    .map(
                      (c) => Padding(
                        padding: const EdgeInsets.only(right: 12),
                        child: _CashboxCard(
                          cashbox: c,
                          onOpen: c.isActive
                              ? () => _openSession(context, c)
                              : null,
                          onClose: c.openSession != null
                              ? () => _closeSession(context, c)
                              : null,
                          onDetails: () => context.go('/cash/${c.id}'),
                          onEdit: () => _editCashbox(context, c),
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildMainPanel(
    BuildContext context, {
    required CashState cash,
    required NumberFormat money,
    required bool isMobile,
    required Map<String, CashboxSummary> cashboxById,
    required Map<String, String> userById,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark
              ? AppColors.surfaceBorder
              : AppColors.lightSurfaceBorder,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 2,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  color: isDark
                      ? AppColors.surfaceBorder
                      : AppColors.lightSurfaceBorder,
                ),
              ),
            ),
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
            child: Row(
              children: [
                _TopTabButton(
                  label: 'admin.pages.cash.transactions.title'.tr(),
                  selected: _mainTab == 0,
                  onTap: () => setState(() => _mainTab = 0),
                ),
                const SizedBox(width: 12),
                _TopTabButton(
                  label: 'admin.pages.cash.sessions.title'.tr(),
                  selected: _mainTab == 1,
                  onTap: () => setState(() => _mainTab = 1),
                ),
                const Spacer(),
                AppButton.secondary(
                  label: 'admin.common.refresh'.tr(),
                  icon: LucideIcons.refreshCw,
                  size: AppButtonSize.sm,
                  onPressed: _refreshAll,
                ),
              ],
            ),
          ),
          if (_mainTab == 0)
            _TransactionsPanel(
              cash: cash,
              money: money,
              isMobile: isMobile,
              cashboxById: cashboxById,
              userById: userById,
              filtersOpen: _txFiltersOpen,
              onToggleFilters: () =>
                  setState(() => _txFiltersOpen = !_txFiltersOpen),
              activeFiltersCount: _activeTxFiltersCount(),
              txCashboxId: _txCashboxId,
              txType: _txType,
              txDirection: _txDirection,
              txMethod: _txMethod,
              txUserId: _txUserId,
              range: _txRange,
              onCashboxChanged: (v) => _updateTxFilter(() => _txCashboxId = v),
              onTypeChanged: (v) => _updateTxFilter(() => _txType = v),
              onDirectionChanged: (v) =>
                  _updateTxFilter(() => _txDirection = v),
              onMethodChanged: (v) => _updateTxFilter(() => _txMethod = v),
              onUserChanged: (v) => _updateTxFilter(() => _txUserId = v),
              onPickRange: () => _pickTxRange(context),
              onReset: _resetTxFilters,
            )
          else
            _SessionsPanel(
              cash: cash,
              money: money,
              isMobile: isMobile,
              cashboxById: cashboxById,
              userById: userById,
              filtersOpen: _sessionFiltersOpen,
              onToggleFilters: () =>
                  setState(() => _sessionFiltersOpen = !_sessionFiltersOpen),
              activeFiltersCount: _activeSessionFiltersCount(),
              sessionCashboxId: _sessionCashboxId,
              sessionStatus: _sessionStatus,
              sessionUserId: _sessionUserId,
              range: _sessionRange,
              onCashboxChanged: (v) =>
                  _updateSessionFilter(() => _sessionCashboxId = v),
              onStatusChanged: (v) =>
                  _updateSessionFilter(() => _sessionStatus = v),
              onUserChanged: (v) =>
                  _updateSessionFilter(() => _sessionUserId = v),
              onPickRange: () => _pickSessionRange(context),
              onReset: _resetSessionFilters,
            ),
        ],
      ),
    );
  }

  int _activeTxFiltersCount() {
    int count = 0;
    if (_txCashboxId.isNotEmpty) count++;
    if (_txType.isNotEmpty) count++;
    if (_txDirection.isNotEmpty) count++;
    if (_txMethod.isNotEmpty) count++;
    if (_txUserId.isNotEmpty) count++;
    count++; // Date range (always set)
    return count;
  }

  int _activeSessionFiltersCount() {
    int count = 0;
    if (_sessionCashboxId.isNotEmpty) count++;
    if (_sessionStatus.isNotEmpty) count++;
    if (_sessionUserId.isNotEmpty) count++;
    count++; // Date range (always set)
    return count;
  }

  Future<void> _refreshAll() async {
    final notifier = ref.read(cashProvider.notifier);
    await Future.wait([notifier.fetchCashboxes(), notifier.fetchCashUsers()]);
    await Future.wait([
      notifier.fetchTransactions(
        cashboxId: _txCashboxId.isEmpty ? null : _txCashboxId,
        type: _txType.isEmpty ? null : _txType,
        direction: _txDirection.isEmpty ? null : _txDirection,
        method: _txMethod.isEmpty ? null : _txMethod,
        userId: _txUserId.isEmpty ? null : _txUserId,
        startDate: _txRange.start,
        endDate: _txRange.end,
      ),
      notifier.fetchSessions(
        cashboxId: _sessionCashboxId.isEmpty ? null : _sessionCashboxId,
        status: _sessionStatus.isEmpty ? null : _sessionStatus,
        userId: _sessionUserId.isEmpty ? null : _sessionUserId,
        startDate: _sessionRange.start,
        endDate: _sessionRange.end,
      ),
    ]);
  }

  void _updateTxFilter(VoidCallback apply) {
    setState(apply);
    _filtersDebouncer.run(() => _refreshTransactions());
  }

  Future<void> _refreshTransactions() async {
    await ref
        .read(cashProvider.notifier)
        .fetchTransactions(
          cashboxId: _txCashboxId.isEmpty ? null : _txCashboxId,
          type: _txType.isEmpty ? null : _txType,
          direction: _txDirection.isEmpty ? null : _txDirection,
          method: _txMethod.isEmpty ? null : _txMethod,
          userId: _txUserId.isEmpty ? null : _txUserId,
          startDate: _txRange.start,
          endDate: _txRange.end,
        );
  }

  void _updateSessionFilter(VoidCallback apply) {
    setState(apply);
    _filtersDebouncer.run(() => _refreshSessions());
  }

  Future<void> _refreshSessions() async {
    await ref
        .read(cashProvider.notifier)
        .fetchSessions(
          cashboxId: _sessionCashboxId.isEmpty ? null : _sessionCashboxId,
          status: _sessionStatus.isEmpty ? null : _sessionStatus,
          userId: _sessionUserId.isEmpty ? null : _sessionUserId,
          startDate: _sessionRange.start,
          endDate: _sessionRange.end,
        );
  }

  Future<void> _pickTxRange(BuildContext context) async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2023),
      lastDate: DateTime.now(),
      initialDateRange: _txRange,
    );
    if (picked == null) return;
    setState(() {
      _txRange = DateTimeRange(
        start: _startOfDay(picked.start),
        end: _endOfDay(picked.end),
      );
    });
    await _refreshTransactions();
  }

  Future<void> _pickSessionRange(BuildContext context) async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2023),
      lastDate: DateTime.now(),
      initialDateRange: _sessionRange,
    );
    if (picked == null) return;
    setState(() {
      _sessionRange = DateTimeRange(
        start: _startOfDay(picked.start),
        end: _endOfDay(picked.end),
      );
    });
    await _refreshSessions();
  }

  void _resetTxFilters() {
    setState(() {
      _txCashboxId = '';
      _txType = '';
      _txDirection = '';
      _txMethod = '';
      _txUserId = '';
      _txRange = _defaultRange();
    });
    _refreshTransactions();
  }

  void _resetSessionFilters() {
    setState(() {
      _sessionCashboxId = '';
      _sessionStatus = '';
      _sessionUserId = '';
      _sessionRange = _defaultRange();
    });
    _refreshSessions();
  }

  Future<void> _handleAction(BuildContext context, _CashAction action) async {
    if (action == _CashAction.transfer) {
      await _transfer(context);
      return;
    }

    final type = switch (action) {
      _CashAction.customerPayment => 'CUSTOMER_PAYMENT',
      _CashAction.supplierPayment => 'SUPPLIER_PAYMENT',
      _CashAction.expense => 'EXPENSE',
      _CashAction.charge => 'CHARGE',
      _CashAction.transfer => 'TRANSFER',
    };

    await _createTransaction(context, initialType: type, lockType: true);
  }

  Future<void> _createCashbox(BuildContext context) async {
    final nameController = TextEditingController();
    bool isActive = true;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocalState) => AppDialog(
          title: 'Create cashbox',
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              FormInput(
                label: 'Name',
                controller: nameController,
                hint: 'e.g. Main register',
              ),
              const SizedBox(height: 16),
              SwitchListTile(
                value: isActive,
                onChanged: (v) => setLocalState(() => isActive = v),
                title: const Text('Active'),
                contentPadding: EdgeInsets.zero,
              ),
            ],
          ),
          secondaryLabel: 'Cancel',
          onSecondary: () => Navigator.of(ctx).pop(false),
          primaryLabel: 'Create',
          onPrimary: () => Navigator.of(ctx).pop(true),
        ),
      ),
    );
    if (ok != true) return;
    await ref
        .read(cashProvider.notifier)
        .createCashbox(name: nameController.text, isActive: isActive);
  }

  Future<void> _editCashbox(
    BuildContext context,
    CashboxSummary cashbox,
  ) async {
    final nameController = TextEditingController(text: cashbox.name);
    bool isActive = cashbox.isActive;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocalState) => AppDialog(
          title: 'Edit cashbox',
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              FormInput(label: 'Name', controller: nameController),
              const SizedBox(height: 16),
              SwitchListTile(
                value: isActive,
                onChanged: (v) => setLocalState(() => isActive = v),
                title: const Text('Active'),
                contentPadding: EdgeInsets.zero,
              ),
            ],
          ),
          secondaryLabel: 'Cancel',
          onSecondary: () => Navigator.of(ctx).pop(false),
          primaryLabel: 'Save',
          onPrimary: () => Navigator.of(ctx).pop(true),
        ),
      ),
    );
    if (ok != true) return;
    await ref
        .read(cashProvider.notifier)
        .updateCashbox(
          cashbox.id,
          name: nameController.text,
          isActive: isActive,
        );
  }

  Future<void> _openSession(
    BuildContext context,
    CashboxSummary cashbox,
  ) async {
    final openingController = TextEditingController(
      text: cashbox.openSession == null ? '0' : '',
    );
    final noteController = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AppDialog(
        title: 'Open session (${cashbox.name})',
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            FormInput(
              label: 'Opening float',
              controller: openingController,
              keyboardType: TextInputType.number,
              hint: '0',
            ),
            const SizedBox(height: 16),
            FormInput(label: 'Note (optional)', controller: noteController),
          ],
        ),
        secondaryLabel: 'Cancel',
        onSecondary: () => Navigator.of(ctx).pop(false),
        primaryLabel: 'Open',
        onPrimary: () => Navigator.of(ctx).pop(true),
      ),
    );
    if (ok != true) return;
    final opening = double.tryParse(openingController.text.trim()) ?? 0;
    await ref
        .read(cashProvider.notifier)
        .openSession(
          cashbox.id,
          openingFloat: opening,
          note: noteController.text.trim().isEmpty
              ? null
              : noteController.text.trim(),
        );
  }

  Future<void> _closeSession(
    BuildContext context,
    CashboxSummary cashbox,
  ) async {
    final open = cashbox.openSession;
    if (open == null) return;

    final expected = await ref
        .read(cashProvider.notifier)
        .getExpectedClosing(open.id);
    if (!context.mounted) return;
    final closingController = TextEditingController(
      text: expected?.expectedClosing.toStringAsFixed(2) ?? '',
    );
    final noteController = TextEditingController();
    final money = tenantCurrencyFormatter(
      ref.read(storeSettingsProvider).settings,
    );

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AppDialog(
        title: 'Close session (${cashbox.name})',
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (expected != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Expected closing: ${money.format(expected.expectedClosing)}',
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Opening',
                          style: TextStyle(
                            color: Theme.of(
                              context,
                            ).colorScheme.onSurface.withValues(alpha: 0.5),
                          ),
                        ),
                        Text(
                          money.format(expected.openingFloat),
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'In',
                          style: TextStyle(
                            color: Theme.of(
                              context,
                            ).colorScheme.onSurface.withValues(alpha: 0.5),
                          ),
                        ),
                        Text(
                          '+${money.format(expected.inSum)}',
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF059669),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Out',
                          style: TextStyle(
                            color: Theme.of(
                              context,
                            ).colorScheme.onSurface.withValues(alpha: 0.5),
                          ),
                        ),
                        Text(
                          '-${money.format(expected.outSum)}',
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            color: Color(0xFFE11D48),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 16),
            FormInput(
              label: 'Closing count',
              controller: closingController,
              keyboardType: TextInputType.number,
              hint: '0',
            ),
            const SizedBox(height: 16),
            FormInput(label: 'Note (optional)', controller: noteController),
          ],
        ),
        secondaryLabel: 'Cancel',
        onSecondary: () => Navigator.of(ctx).pop(false),
        primaryLabel: 'Close',
        onPrimary: () => Navigator.of(ctx).pop(true),
      ),
    );
    if (ok != true) return;
    final closing = double.tryParse(closingController.text.trim()) ?? 0;
    await ref
        .read(cashProvider.notifier)
        .closeSession(
          open.id,
          closingCount: closing,
          note: noteController.text.trim().isEmpty
              ? null
              : noteController.text.trim(),
        );
  }

  Future<void> _createTransaction(
    BuildContext context, {
    String initialType = 'EXPENSE',
    bool lockType = false,
  }) async {
    if (ref.read(cashProvider).cashboxes.isEmpty) {
      await ref.read(cashProvider.notifier).fetchCashboxes();
    }
    if (ref.read(cashProvider).cashUsers.isEmpty) {
      await ref.read(cashProvider.notifier).fetchCashUsers();
    }

    if (ref.read(customersProvider).customers.isEmpty) {
      await ref.read(customersProvider.notifier).fetchCustomers();
    }
    if (ref.read(suppliersProvider).suppliers.isEmpty) {
      await ref.read(suppliersProvider.notifier).fetchSuppliers();
    }
    if (!context.mounted) return;

    final result = await showDialog<_TxFormResult>(
      context: context,
      builder: (ctx) => _TransactionDialog(
        cashboxes: ref.read(cashProvider).cashboxes,
        customers: ref.read(customersProvider).customers,
        suppliers: ref.read(suppliersProvider).suppliers,
        initialType: initialType,
        lockType: lockType,
        initialCurrency: tenantCurrencyCode(
          ref.read(storeSettingsProvider).settings,
        ),
      ),
    );
    if (result == null) return;

    await ref
        .read(cashProvider.notifier)
        .createTransaction(
          cashboxId: result.cashboxId,
          type: result.type,
          direction: result.direction,
          amount: result.amount,
          method: result.method,
          currency: result.currency,
          customerId: result.customerId,
          supplierId: result.supplierId,
          expenseCategory: result.expenseCategory,
          reference: result.reference,
          note: result.note,
        );
  }

  Future<void> _transfer(BuildContext context) async {
    final cashboxes = ref.read(cashProvider).cashboxes;
    if (cashboxes.length < 2) {
      await ref.read(cashProvider.notifier).fetchCashboxes();
    }
    if (!context.mounted) return;

    final result = await showDialog<_TransferFormResult>(
      context: context,
      builder: (ctx) => _TransferDialog(
        cashboxes: ref.read(cashProvider).cashboxes,
        initialCurrency: tenantCurrencyCode(
          ref.read(storeSettingsProvider).settings,
        ),
      ),
    );
    if (result == null) return;

    await ref
        .read(cashProvider.notifier)
        .transfer(
          fromCashboxId: result.fromCashboxId,
          toCashboxId: result.toCashboxId,
          amount: result.amount,
          currency: result.currency,
          reference: result.reference,
          note: result.note,
        );
  }
}

class _Card extends StatelessWidget {
  final Widget child;

  const _Card({required this.child});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark
              ? AppColors.surfaceBorder
              : AppColors.lightSurfaceBorder,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 2,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: child,
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  final String message;

  const _ErrorBanner({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFECACA)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            LucideIcons.alertTriangle,
            size: 18,
            color: Color(0xFFB91C1C),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Something went wrong',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF991B1B),
                  ),
                ),
                const SizedBox(height: 4),
                Text(message, style: const TextStyle(color: Color(0xFF991B1B))),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CashStatCard extends StatelessWidget {
  final IconData icon;
  final Color iconBg;
  final Color iconColor;
  final String label;
  final String value;
  final Color? valueColor;

  const _CashStatCard({
    required this.icon,
    required this.iconBg,
    required this.iconColor,
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark
              ? AppColors.surfaceBorder
              : AppColors.lightSurfaceBorder,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 2,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: iconColor, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color:
                        valueColor ?? Theme.of(context).colorScheme.onSurface,
                    letterSpacing: -0.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CashboxCard extends StatelessWidget {
  final CashboxSummary cashbox;
  final VoidCallback? onOpen;
  final VoidCallback? onClose;
  final VoidCallback onDetails;
  final VoidCallback? onEdit;

  const _CashboxCard({
    required this.cashbox,
    required this.onOpen,
    required this.onClose,
    required this.onDetails,
    this.onEdit,
  });

  @override
  Widget build(BuildContext context) {
    final open = cashbox.openSession;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      width: 280,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark
              ? AppColors.surfaceBorder
              : AppColors.lightSurfaceBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: const Color(0xFFE0E7FF),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(
                            LucideIcons.wallet,
                            size: 16,
                            color: Color(0xFF4F46E5),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            cashbox.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: Theme.of(context).colorScheme.onSurface,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: open != null
                                ? const Color(0xFF10B981)
                                : const Color(0xFFCBD5E1),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            open != null
                                ? 'OPEN • ${open.id.length > 8 ? open.id.substring(0, 8) : open.id}'
                                : 'CLOSED',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: open != null
                                  ? const Color(0xFF047857)
                                  : Theme.of(context).colorScheme.onSurface
                                        .withValues(alpha: 0.5),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (onEdit != null)
                    IconButton(
                      onPressed: onEdit,
                      icon: Icon(
                        LucideIcons.pencil,
                        size: 18,
                        color: Theme.of(
                          context,
                        ).colorScheme.onSurface.withValues(alpha: 0.4),
                      ),
                      tooltip: 'Edit',
                    ),
                  IconButton(
                    onPressed: onDetails,
                    icon: Icon(
                      LucideIcons.arrowRight,
                      size: 18,
                      color: Theme.of(
                        context,
                      ).colorScheme.onSurface.withValues(alpha: 0.4),
                    ),
                    tooltip: 'Details',
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: open == null
                    ? AppButton.primary(
                        label: 'Open',
                        icon: LucideIcons.play,
                        size: AppButtonSize.sm,
                        onPressed: onOpen,
                        fullWidth: true,
                      )
                    : AppButton.secondary(
                        label: 'Close',
                        icon: LucideIcons.lock,
                        size: AppButtonSize.sm,
                        onPressed: onClose,
                        fullWidth: true,
                      ),
              ),
              const SizedBox(width: 8),
              AppButton.secondary(
                label: 'Details',
                size: AppButtonSize.sm,
                onPressed: onDetails,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TopTabButton extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _TopTabButton({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(10)),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: selected ? const Color(0xFF4D7C0F) : Colors.transparent,
              width: 2,
            ),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontWeight: FontWeight.w700,
            color: selected
                ? const Color(0xFF4D7C0F)
                : Theme.of(
                    context,
                  ).colorScheme.onSurface.withValues(alpha: 0.5),
          ),
        ),
      ),
    );
  }
}

class _FilterCountBadge extends StatelessWidget {
  final int count;

  const _FilterCountBadge({required this.count});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: const Color(0xFFECFCCB), // lime-100
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        count.toString(),
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: Color(0xFF4D7C0F),
        ),
      ),
    );
  }
}

class _TransactionsPanel extends StatelessWidget {
  final CashState cash;
  final NumberFormat money;
  final bool isMobile;
  final Map<String, CashboxSummary> cashboxById;
  final Map<String, String> userById;
  final bool filtersOpen;
  final VoidCallback onToggleFilters;
  final int activeFiltersCount;
  final String txCashboxId;
  final String txType;
  final String txDirection;
  final String txMethod;
  final String txUserId;
  final DateTimeRange range;
  final ValueChanged<String> onCashboxChanged;
  final ValueChanged<String> onTypeChanged;
  final ValueChanged<String> onDirectionChanged;
  final ValueChanged<String> onMethodChanged;
  final ValueChanged<String> onUserChanged;
  final VoidCallback onPickRange;
  final VoidCallback onReset;

  const _TransactionsPanel({
    required this.cash,
    required this.money,
    required this.isMobile,
    required this.cashboxById,
    required this.userById,
    required this.filtersOpen,
    required this.onToggleFilters,
    required this.activeFiltersCount,
    required this.txCashboxId,
    required this.txType,
    required this.txDirection,
    required this.txMethod,
    required this.txUserId,
    required this.range,
    required this.onCashboxChanged,
    required this.onTypeChanged,
    required this.onDirectionChanged,
    required this.onMethodChanged,
    required this.onUserChanged,
    required this.onPickRange,
    required this.onReset,
  });

  @override
  Widget build(BuildContext context) {
    final isCompact = MediaQuery.of(context).size.width < 640;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _FilterPanel(
          title: 'Filters',
          open: filtersOpen,
          onToggle: onToggleFilters,
          count: activeFiltersCount,
          child: _TxFilters(
            cashboxes: cash.cashboxes,
            users: cash.cashUsers,
            txCashboxId: txCashboxId,
            txType: txType,
            txDirection: txDirection,
            txMethod: txMethod,
            txUserId: txUserId,
            range: range,
            onCashboxChanged: onCashboxChanged,
            onTypeChanged: onTypeChanged,
            onDirectionChanged: onDirectionChanged,
            onMethodChanged: onMethodChanged,
            onUserChanged: onUserChanged,
            onPickRange: onPickRange,
            onReset: onReset,
          ),
        ),
        if (cash.isLoadingTransactions)
          const _LoadingState(label: 'Loading transactions...')
        else if (cash.transactions.isEmpty)
          const _EmptyState(
            title: 'No transactions found',
            subtitle: 'Try expanding the date range or clearing filters.',
          )
        else if (isCompact)
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: cash.transactions.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final tx = cash.transactions[index];
              return _TxMobileRow(
                tx: tx,
                cashboxName: _cashboxName(cashboxById, tx.cashboxId),
                userEmail: _userEmail(userById, tx.createdByUserId),
                money: money,
              );
            },
          )
        else
          _TxTable(
            transactions: cash.transactions,
            cashboxById: cashboxById,
            userById: userById,
            money: money,
          ),
      ],
    );
  }
}

class _SessionsPanel extends StatelessWidget {
  final CashState cash;
  final NumberFormat money;
  final bool isMobile;
  final Map<String, CashboxSummary> cashboxById;
  final Map<String, String> userById;
  final bool filtersOpen;
  final VoidCallback onToggleFilters;
  final int activeFiltersCount;
  final String sessionCashboxId;
  final String sessionStatus;
  final String sessionUserId;
  final DateTimeRange range;
  final ValueChanged<String> onCashboxChanged;
  final ValueChanged<String> onStatusChanged;
  final ValueChanged<String> onUserChanged;
  final VoidCallback onPickRange;
  final VoidCallback onReset;

  const _SessionsPanel({
    required this.cash,
    required this.money,
    required this.isMobile,
    required this.cashboxById,
    required this.userById,
    required this.filtersOpen,
    required this.onToggleFilters,
    required this.activeFiltersCount,
    required this.sessionCashboxId,
    required this.sessionStatus,
    required this.sessionUserId,
    required this.range,
    required this.onCashboxChanged,
    required this.onStatusChanged,
    required this.onUserChanged,
    required this.onPickRange,
    required this.onReset,
  });

  @override
  Widget build(BuildContext context) {
    final isCompact = MediaQuery.of(context).size.width < 640;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _FilterPanel(
          title: 'Filters',
          open: filtersOpen,
          onToggle: onToggleFilters,
          count: activeFiltersCount,
          child: _SessionFilters(
            cashboxes: cash.cashboxes,
            users: cash.cashUsers,
            cashboxId: sessionCashboxId,
            status: sessionStatus,
            userId: sessionUserId,
            range: range,
            onCashboxChanged: onCashboxChanged,
            onStatusChanged: onStatusChanged,
            onUserChanged: onUserChanged,
            onPickRange: onPickRange,
            onReset: onReset,
          ),
        ),
        if (cash.isLoadingSessions)
          const _LoadingState(label: 'Loading sessions...')
        else if (cash.sessions.isEmpty)
          const _EmptyState(
            title: 'No sessions found',
            subtitle: 'Try expanding the date range or clearing filters.',
          )
        else if (isCompact)
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: cash.sessions.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final s = cash.sessions[index];
              return _SessionMobileRow(
                session: s,
                cashboxName: _cashboxName(cashboxById, s.cashboxId),
                userEmail: _userEmail(userById, s.openedByUserId),
                money: money,
              );
            },
          )
        else
          _SessionsTable(
            sessions: cash.sessions,
            cashboxById: cashboxById,
            userById: userById,
            money: money,
          ),
      ],
    );
  }
}

class _FilterPanel extends StatelessWidget {
  final String title;
  final bool open;
  final VoidCallback onToggle;
  final int count;
  final Widget child;

  const _FilterPanel({
    required this.title,
    required this.open,
    required this.onToggle,
    required this.count,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: isDark
                ? AppColors.surfaceBorder
                : AppColors.lightSurfaceBorder,
          ),
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      child: Column(
        children: [
          InkWell(
            onTap: onToggle,
            child: Row(
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                      ),
                      const SizedBox(width: 8),
                      if (count > 0) _FilterCountBadge(count: count),
                    ],
                  ),
                ),
                Icon(
                  open ? LucideIcons.chevronUp : LucideIcons.chevronDown,
                  size: 18,
                  color: Theme.of(
                    context,
                  ).colorScheme.onSurface.withValues(alpha: 0.4),
                ),
              ],
            ),
          ),
          AnimatedCrossFade(
            crossFadeState: open
                ? CrossFadeState.showFirst
                : CrossFadeState.showSecond,
            duration: const Duration(milliseconds: 180),
            firstChild: Padding(
              padding: const EdgeInsets.only(top: 14),
              child: child,
            ),
            secondChild: const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }
}

class _TxFilters extends StatelessWidget {
  final List<CashboxSummary> cashboxes;
  final List<CashUserSummary> users;
  final String txCashboxId;
  final String txType;
  final String txDirection;
  final String txMethod;
  final String txUserId;
  final DateTimeRange range;
  final ValueChanged<String> onCashboxChanged;
  final ValueChanged<String> onTypeChanged;
  final ValueChanged<String> onDirectionChanged;
  final ValueChanged<String> onMethodChanged;
  final ValueChanged<String> onUserChanged;
  final VoidCallback onPickRange;
  final VoidCallback onReset;

  const _TxFilters({
    required this.cashboxes,
    required this.users,
    required this.txCashboxId,
    required this.txType,
    required this.txDirection,
    required this.txMethod,
    required this.txUserId,
    required this.range,
    required this.onCashboxChanged,
    required this.onTypeChanged,
    required this.onDirectionChanged,
    required this.onMethodChanged,
    required this.onUserChanged,
    required this.onPickRange,
    required this.onReset,
  });

  @override
  Widget build(BuildContext context) {
    final isNarrow = MediaQuery.of(context).size.width < 900;

    final fields = [
      FormSelect<String>(
        label: 'Cashbox',
        value: txCashboxId,
        fillColor: null,
        items: [
          const DropdownMenuItem(value: '', child: Text('All cashboxes')),
          ...cashboxes.map(
            (c) => DropdownMenuItem(value: c.id, child: Text(c.name)),
          ),
        ],
        onChanged: (v) => onCashboxChanged(v ?? ''),
      ),
      FormSelect<String>(
        label: 'Type',
        value: txType,
        fillColor: null,
        items: const [
          DropdownMenuItem(value: '', child: Text('All types')),
          DropdownMenuItem(value: 'SALE_PAYMENT', child: Text('SALE_PAYMENT')),
          DropdownMenuItem(
            value: 'CUSTOMER_PAYMENT',
            child: Text('CUSTOMER_PAYMENT'),
          ),
          DropdownMenuItem(
            value: 'SUPPLIER_PAYMENT',
            child: Text('SUPPLIER_PAYMENT'),
          ),
          DropdownMenuItem(value: 'EXPENSE', child: Text('EXPENSE')),
          DropdownMenuItem(value: 'CHARGE', child: Text('CHARGE')),
          DropdownMenuItem(value: 'TRANSFER', child: Text('TRANSFER')),
        ],
        onChanged: (v) => onTypeChanged(v ?? ''),
      ),
      FormSelect<String>(
        label: 'Direction',
        value: txDirection,
        fillColor: null,
        items: const [
          DropdownMenuItem(value: '', child: Text('All directions')),
          DropdownMenuItem(value: 'IN', child: Text('IN')),
          DropdownMenuItem(value: 'OUT', child: Text('OUT')),
        ],
        onChanged: (v) => onDirectionChanged(v ?? ''),
      ),
      FormSelect<String>(
        label: 'Method',
        value: txMethod,
        fillColor: null,
        items: const [
          DropdownMenuItem(value: '', child: Text('All methods')),
          DropdownMenuItem(value: 'CASH', child: Text('CASH')),
          DropdownMenuItem(value: 'CARD', child: Text('CARD')),
          DropdownMenuItem(value: 'TRANSFER', child: Text('TRANSFER')),
          DropdownMenuItem(value: 'OTHER', child: Text('OTHER')),
        ],
        onChanged: (v) => onMethodChanged(v ?? ''),
      ),
      FormSelect<String>(
        label: 'User',
        value: txUserId,
        fillColor: null,
        items: [
          const DropdownMenuItem(value: '', child: Text('All users')),
          ...users.map(
            (u) => DropdownMenuItem(value: u.id, child: Text(u.email)),
          ),
        ],
        onChanged: (v) => onUserChanged(v ?? ''),
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: fields
              .map(
                (f) =>
                    SizedBox(width: isNarrow ? double.infinity : 260, child: f),
              )
              .toList(),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            AppButton.secondary(
              label:
                  '${DateFormat('yyyy-MM-dd').format(range.start)} - ${DateFormat('yyyy-MM-dd').format(range.end)}',
              icon: LucideIcons.calendar,
              size: AppButtonSize.sm,
              onPressed: onPickRange,
            ),
            const SizedBox(width: 12),
            AppButton.secondary(
              label: 'Reset',
              icon: LucideIcons.rotateCcw,
              size: AppButtonSize.sm,
              onPressed: onReset,
            ),
          ],
        ),
      ],
    );
  }
}

class _SessionFilters extends StatelessWidget {
  final List<CashboxSummary> cashboxes;
  final List<CashUserSummary> users;
  final String cashboxId;
  final String status;
  final String userId;
  final DateTimeRange range;
  final ValueChanged<String> onCashboxChanged;
  final ValueChanged<String> onStatusChanged;
  final ValueChanged<String> onUserChanged;
  final VoidCallback onPickRange;
  final VoidCallback onReset;

  const _SessionFilters({
    required this.cashboxes,
    required this.users,
    required this.cashboxId,
    required this.status,
    required this.userId,
    required this.range,
    required this.onCashboxChanged,
    required this.onStatusChanged,
    required this.onUserChanged,
    required this.onPickRange,
    required this.onReset,
  });

  @override
  Widget build(BuildContext context) {
    final isNarrow = MediaQuery.of(context).size.width < 900;

    final fields = [
      FormSelect<String>(
        label: 'Cashbox',
        value: cashboxId,
        fillColor: null,
        items: [
          const DropdownMenuItem(value: '', child: Text('All cashboxes')),
          ...cashboxes.map(
            (c) => DropdownMenuItem(value: c.id, child: Text(c.name)),
          ),
        ],
        onChanged: (v) => onCashboxChanged(v ?? ''),
      ),
      FormSelect<String>(
        label: 'Status',
        value: status,
        fillColor: null,
        items: const [
          DropdownMenuItem(value: '', child: Text('All statuses')),
          DropdownMenuItem(value: 'OPEN', child: Text('OPEN')),
          DropdownMenuItem(value: 'CLOSED', child: Text('CLOSED')),
        ],
        onChanged: (v) => onStatusChanged(v ?? ''),
      ),
      FormSelect<String>(
        label: 'User',
        value: userId,
        fillColor: null,
        items: [
          const DropdownMenuItem(value: '', child: Text('All users')),
          ...users.map(
            (u) => DropdownMenuItem(value: u.id, child: Text(u.email)),
          ),
        ],
        onChanged: (v) => onUserChanged(v ?? ''),
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: fields
              .map(
                (f) =>
                    SizedBox(width: isNarrow ? double.infinity : 260, child: f),
              )
              .toList(),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            AppButton.secondary(
              label:
                  '${DateFormat('yyyy-MM-dd').format(range.start)} - ${DateFormat('yyyy-MM-dd').format(range.end)}',
              icon: LucideIcons.calendar,
              size: AppButtonSize.sm,
              onPressed: onPickRange,
            ),
            const SizedBox(width: 12),
            AppButton.secondary(
              label: 'Reset',
              icon: LucideIcons.rotateCcw,
              size: AppButtonSize.sm,
              onPressed: onReset,
            ),
          ],
        ),
      ],
    );
  }
}

// Uses shared `FormSelect` in `admin_app/lib/widgets/form/form_select.dart`.

class _LoadingState extends StatelessWidget {
  final String label;

  const _LoadingState({required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          const SizedBox(height: 12),
          const CircularProgressIndicator(),
          const SizedBox(height: 12),
          Text(
            label,
            style: TextStyle(
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.5),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final String title;
  final String subtitle;

  const _EmptyState({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          Icon(
            LucideIcons.inbox,
            size: 40,
            color: Theme.of(
              context,
            ).colorScheme.onSurface.withValues(alpha: 0.2),
          ),
          const SizedBox(height: 10),
          Text(
            title,
            style: TextStyle(
              fontWeight: FontWeight.w700,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: TextStyle(
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.5),
            ),
          ),
        ],
      ),
    );
  }
}

class _TxMobileRow extends StatelessWidget {
  final CashTransactionSummary tx;
  final String cashboxName;
  final String userEmail;
  final NumberFormat money;

  const _TxMobileRow({
    required this.tx,
    required this.cashboxName,
    required this.userEmail,
    required this.money,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _typeLabel(tx.type),
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _formatDate(tx.createdAt),
                  style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.5),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '$cashboxName · $userEmail',
                  style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _MethodChip(method: tx.method),
                    if (tx.expenseCategory != null &&
                        tx.expenseCategory!.trim().isNotEmpty)
                      _Tag(text: tx.expenseCategory!),
                    if (tx.reference != null && tx.reference!.trim().isNotEmpty)
                      _Tag(text: 'Ref: ${tx.reference!}'),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Text(
            '${tx.direction == 'IN' ? '+' : '-'}${money.format(tx.amount)}',
            style: TextStyle(
              fontWeight: FontWeight.w800,
              color: tx.direction == 'IN'
                  ? const Color(0xFF059669)
                  : const Color(0xFFE11D48),
            ),
          ),
        ],
      ),
    );
  }
}

class _SessionMobileRow extends StatelessWidget {
  final CashSessionSummary session;
  final String cashboxName;
  final String userEmail;
  final NumberFormat money;

  const _SessionMobileRow({
    required this.session,
    required this.cashboxName,
    required this.userEmail,
    required this.money,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        cashboxName,
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    _StatusChip(status: session.status),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  '$userEmail · ${_formatDate(session.openedAt)}',
                  style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.5),
                  ),
                ),
                if (session.closedAt != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      'Closed: ${_formatDate(session.closedAt)}',
                      style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(
                          context,
                        ).colorScheme.onSurface.withValues(alpha: 0.5),
                      ),
                    ),
                  ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 12,
                  runSpacing: 6,
                  children: [
                    _Metric(
                      label: 'Opening',
                      value: money.format(session.openingFloat),
                    ),
                    _Metric(
                      label: 'Expected',
                      value: session.expectedClosing == null
                          ? '—'
                          : money.format(session.expectedClosing!),
                    ),
                    _Metric(
                      label: 'Closing',
                      value: session.closingCount == null
                          ? '—'
                          : money.format(session.closingCount!),
                    ),
                    _Metric(
                      label: 'Diff',
                      value: session.difference == null
                          ? '—'
                          : money.format(session.difference!),
                      valueColor:
                          (session.difference != null &&
                              session.difference != 0)
                          ? const Color(0xFFE11D48)
                          : null,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const _Metric({required this.label, required this.value, this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: Theme.of(
              context,
            ).colorScheme.onSurface.withValues(alpha: 0.4),
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: valueColor ?? Theme.of(context).colorScheme.onSurface,
          ),
        ),
      ],
    );
  }
}

class _Tag extends StatelessWidget {
  final String text;

  const _Tag({required this.text});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isDark
              ? AppColors.surfaceBorder
              : AppColors.lightSurfaceBorder,
        ),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 11,
          color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _MethodChip extends StatelessWidget {
  final String method;

  const _MethodChip({required this.method});

  @override
  Widget build(BuildContext context) {
    IconData icon;
    if (method == 'CASH') {
      icon = LucideIcons.banknote;
    } else if (method == 'CARD') {
      icon = LucideIcons.creditCard;
    } else {
      icon = LucideIcons.arrowLeftRight;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 14,
            color: Theme.of(
              context,
            ).colorScheme.onSurface.withValues(alpha: 0.7),
          ),
          const SizedBox(width: 6),
          Text(
            method,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.7),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String status;

  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    final isOpen = status == 'OPEN';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: isOpen
            ? const Color(0xFF10B981).withValues(alpha: 0.1)
            : Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: isOpen
                  ? const Color(0xFF10B981)
                  : Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.4),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            status,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: isOpen
                  ? const Color(0xFF047857)
                  : Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
        ],
      ),
    );
  }
}

class _TxTable extends StatelessWidget {
  final List<CashTransactionSummary> transactions;
  final Map<String, CashboxSummary> cashboxById;
  final Map<String, String> userById;
  final NumberFormat money;

  const _TxTable({
    required this.transactions,
    required this.cashboxById,
    required this.userById,
    required this.money,
  });

  @override
  Widget build(BuildContext context) {
    final headerStyle = TextStyle(
      fontWeight: FontWeight.w600,
      fontSize: 11,
      color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
      letterSpacing: 0.5,
    );
    return ResponsivePaginatedTable<CashTransactionSummary>(
      items: transactions,
      minWidth: 980,
      rowsPerPageOptions: const [10, 25, 50, 100],
      header: Row(
        children: [
          Expanded(
            flex: 2,
            child: Text(
              'admin.pages.cash.transactions.table.date'.tr().toUpperCase(),
              style: headerStyle,
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              'admin.pages.cash.transactions.table.cashbox'.tr().toUpperCase(),
              style: headerStyle,
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              'admin.pages.cash.transactions.table.user'.tr().toUpperCase(),
              style: headerStyle,
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              'admin.pages.cash.transactions.table.type'.tr().toUpperCase(),
              style: headerStyle,
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              'admin.pages.cash.transactions.table.method'.tr().toUpperCase(),
              style: headerStyle,
            ),
          ),
          Expanded(
            flex: 2,
            child: Align(
              alignment: Alignment.centerRight,
              child: Text(
                'admin.pages.cash.transactions.table.amount'.tr().toUpperCase(),
                style: headerStyle,
              ),
            ),
          ),
        ],
      ),
      rowBuilder: (context, tx, index) {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Row(
            children: [
              Expanded(
                flex: 2,
                child: Text(
                  _formatDate(tx.createdAt),
                  style: TextStyle(
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.5),
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  _cashboxName(cashboxById, tx.cashboxId),
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  _userEmail(userById, tx.createdByUserId),
                  style: TextStyle(
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.5),
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Expanded(
                flex: 3,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _typeLabel(tx.type),
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                    if (tx.expenseCategory != null &&
                        tx.expenseCategory!.trim().isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          tx.expenseCategory!,
                          style: TextStyle(
                            fontSize: 12,
                            color: Theme.of(
                              context,
                            ).colorScheme.onSurface.withValues(alpha: 0.5),
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    if (tx.reference != null && tx.reference!.trim().isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          'Ref: ${tx.reference!}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Theme.of(
                              context,
                            ).colorScheme.onSurface.withValues(alpha: 0.5),
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                  ],
                ),
              ),
              Expanded(flex: 2, child: _MethodChip(method: tx.method)),
              Expanded(
                flex: 2,
                child: Align(
                  alignment: Alignment.centerRight,
                  child: Text(
                    '${tx.direction == 'IN' ? '+' : '-'}${money.format(tx.amount)}',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      color: tx.direction == 'IN'
                          ? const Color(0xFF059669)
                          : const Color(0xFFE11D48),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _SessionsTable extends StatelessWidget {
  final List<CashSessionSummary> sessions;
  final Map<String, CashboxSummary> cashboxById;
  final Map<String, String> userById;
  final NumberFormat money;

  const _SessionsTable({
    required this.sessions,
    required this.cashboxById,
    required this.userById,
    required this.money,
  });

  @override
  Widget build(BuildContext context) {
    final headerStyle = TextStyle(
      fontWeight: FontWeight.w600,
      fontSize: 11,
      color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
      letterSpacing: 0.5,
    );
    return ResponsivePaginatedTable<CashSessionSummary>(
      items: sessions,
      minWidth: 1080,
      rowsPerPageOptions: const [10, 25, 50, 100],
      header: Row(
        children: [
          Expanded(
            flex: 2,
            child: Text(
              'admin.pages.cash.sessions.table.cashbox'.tr().toUpperCase(),
              style: headerStyle,
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              'admin.pages.cash.sessions.table.status'.tr().toUpperCase(),
              style: headerStyle,
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              'admin.pages.cash.sessions.table.user'.tr().toUpperCase(),
              style: headerStyle,
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              'admin.pages.cash.sessions.table.openedAt'.tr().toUpperCase(),
              style: headerStyle,
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              'admin.pages.cash.sessions.table.closedAt'.tr().toUpperCase(),
              style: headerStyle,
            ),
          ),
          Expanded(
            flex: 2,
            child: Align(
              alignment: Alignment.centerRight,
              child: Text(
                'admin.pages.cash.sessions.table.openingFloat'
                    .tr()
                    .toUpperCase(),
                style: headerStyle,
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: Align(
              alignment: Alignment.centerRight,
              child: Text(
                'admin.pages.cash.sessions.table.expectedClosing'
                    .tr()
                    .toUpperCase(),
                style: headerStyle,
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: Align(
              alignment: Alignment.centerRight,
              child: Text(
                'admin.pages.cash.sessions.table.closingCount'
                    .tr()
                    .toUpperCase(),
                style: headerStyle,
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: Align(
              alignment: Alignment.centerRight,
              child: Text(
                'admin.pages.cash.sessions.table.difference'.tr().toUpperCase(),
                style: headerStyle,
              ),
            ),
          ),
        ],
      ),
      rowBuilder: (context, s, index) {
        final diff = s.difference;
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Row(
            children: [
              Expanded(
                flex: 2,
                child: Text(
                  _cashboxName(cashboxById, s.cashboxId),
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Expanded(flex: 2, child: _StatusChip(status: s.status)),
              Expanded(
                flex: 2,
                child: Text(
                  _userEmail(userById, s.openedByUserId),
                  style: TextStyle(
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.5),
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  _formatDate(s.openedAt),
                  style: TextStyle(
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.5),
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  s.closedAt == null ? '—' : _formatDate(s.closedAt),
                  style: TextStyle(
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
                  child: Text(
                    money.format(s.openingFloat),
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Align(
                  alignment: Alignment.centerRight,
                  child: Text(
                    s.expectedClosing == null
                        ? '—'
                        : money.format(s.expectedClosing!),
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Align(
                  alignment: Alignment.centerRight,
                  child: Text(
                    s.closingCount == null
                        ? '—'
                        : money.format(s.closingCount!),
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Align(
                  alignment: Alignment.centerRight,
                  child: Text(
                    diff == null ? '—' : money.format(diff),
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      color: diff != null && diff != 0
                          ? const Color(0xFFE11D48)
                          : Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

String _cashboxName(Map<String, CashboxSummary> cashboxById, String id) {
  final name = cashboxById[id]?.name;
  if (name != null && name.trim().isNotEmpty) return name;
  return id.length > 8 ? id.substring(0, 8) : id;
}

String _userEmail(Map<String, String> userById, String? id) {
  if (id == null || id.trim().isEmpty) return '—';
  return userById[id] ?? (id.length > 8 ? id.substring(0, 8) : id);
}

String _formatDate(DateTime? dt) {
  if (dt == null) return '—';
  return DateFormat('y-MM-dd HH:mm').format(dt.toLocal());
}

String _typeLabel(String type) {
  switch (type) {
    case 'SALE_PAYMENT':
      return 'Sale payment';
    case 'CUSTOMER_PAYMENT':
      return 'Customer payment';
    case 'SUPPLIER_PAYMENT':
      return 'Supplier payment';
    case 'EXPENSE':
      return 'Expense';
    case 'CHARGE':
      return 'Charge';
    case 'TRANSFER':
      return 'Transfer';
    default:
      return type;
  }
}

// Note: Old list-style cash UI widgets removed (cash screen now uses the unified web-like layout).

class _TxFormResult {
  final String? cashboxId;
  final String type;
  final String direction;
  final double amount;
  final String currency;
  final String method;
  final String? customerId;
  final String? supplierId;
  final String? expenseCategory;
  final String? reference;
  final String? note;

  _TxFormResult({
    required this.cashboxId,
    required this.type,
    required this.direction,
    required this.amount,
    required this.currency,
    required this.method,
    required this.customerId,
    required this.supplierId,
    required this.expenseCategory,
    required this.reference,
    required this.note,
  });
}

class _TransactionDialog extends StatefulWidget {
  final List<CashboxSummary> cashboxes;
  final List<Customer> customers;
  final List<Supplier> suppliers;
  final String initialType;
  final String initialCurrency;
  final bool lockType;

  const _TransactionDialog({
    required this.cashboxes,
    required this.customers,
    required this.suppliers,
    required this.initialCurrency,
    this.initialType = 'EXPENSE',
    this.lockType = false,
  });

  @override
  State<_TransactionDialog> createState() => _TransactionDialogState();
}

class _TransactionDialogState extends State<_TransactionDialog> {
  final _formKey = GlobalKey<FormState>();

  String? _cashboxId;
  String _type = 'EXPENSE';
  String _direction = 'OUT';
  String _method = 'CASH';
  final _amount = TextEditingController();
  late final TextEditingController _currency;
  final _reference = TextEditingController();
  final _note = TextEditingController();
  String? _customerId;
  String? _supplierId;
  final _category = TextEditingController();
  final _customerSearch = TextEditingController();
  final _supplierSearch = TextEditingController();

  @override
  void initState() {
    super.initState();
    _currency = TextEditingController(text: widget.initialCurrency);
    _applyType(widget.initialType);
  }

  @override
  void dispose() {
    _amount.dispose();
    _currency.dispose();
    _reference.dispose();
    _note.dispose();
    _category.dispose();
    _customerSearch.dispose();
    _supplierSearch.dispose();
    super.dispose();
  }

  void _applyType(String type) {
    setState(() {
      _type = type;
      if (type == 'CUSTOMER_PAYMENT') {
        _direction = 'IN';
      } else if (type == 'SUPPLIER_PAYMENT') {
        _direction = 'OUT';
      } else if (type == 'EXPENSE' || type == 'CHARGE') {
        _direction = 'OUT';
      }
    });
  }

  String _dialogTitle() {
    switch (_type) {
      case 'CUSTOMER_PAYMENT':
        return 'New customer payment';
      case 'SUPPLIER_PAYMENT':
        return 'New supplier payment';
      case 'CHARGE':
        return 'New charge';
      case 'EXPENSE':
        return 'New expense';
      default:
        return 'New transaction';
    }
  }

  List<Customer> _filteredCustomers() {
    final q = _customerSearch.text.trim().toLowerCase();
    if (q.isEmpty) return widget.customers;
    return widget.customers.where((c) {
      final name = c.name.toLowerCase();
      final phone = c.phone.toLowerCase();
      return name.contains(q) || phone.contains(q);
    }).toList();
  }

  List<Supplier> _filteredSuppliers() {
    final q = _supplierSearch.text.trim().toLowerCase();
    if (q.isEmpty) return widget.suppliers;
    return widget.suppliers
        .where((s) => s.name.toLowerCase().contains(q))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final isCustomer = _type == 'CUSTOMER_PAYMENT';
    final isSupplier = _type == 'SUPPLIER_PAYMENT';
    final isCategory = _type == 'EXPENSE' || _type == 'CHARGE';
    final filteredCustomers = _filteredCustomers();
    final filteredSuppliers = _filteredSuppliers();

    return AppDialog(
      title: _dialogTitle(),
      description:
          'Record a transaction (expense, charge, or customer/supplier payment).',
      maxWidth: 760,
      content: Form(
        key: _formKey,
        child: Column(
          children: [
            FormSelect<String>(
              label: 'Cashbox',
              value: _cashboxId,
              items: [
                const DropdownMenuItem(
                  value: null,
                  enabled: false,
                  child: Text('Select cashbox'),
                ),
                ...widget.cashboxes.map(
                  (c) => DropdownMenuItem(
                    value: c.id,
                    enabled: c.openSession != null,
                    child: Text(
                      c.openSession != null
                          ? c.name
                          : '${c.name} (No open session)',
                    ),
                  ),
                ),
              ],
              onChanged: (v) => setState(() => _cashboxId = v),
              validator: (v) => v == null ? 'Cashbox required' : null,
            ),
            const SizedBox(height: 16),
            if (!widget.lockType)
              FormSelect<String>(
                label: 'Type',
                value: _type,
                items: const [
                  DropdownMenuItem(value: 'EXPENSE', child: Text('EXPENSE')),
                  DropdownMenuItem(value: 'CHARGE', child: Text('CHARGE')),
                  DropdownMenuItem(
                    value: 'CUSTOMER_PAYMENT',
                    child: Text('CUSTOMER_PAYMENT'),
                  ),
                  DropdownMenuItem(
                    value: 'SUPPLIER_PAYMENT',
                    child: Text('SUPPLIER_PAYMENT'),
                  ),
                ],
                onChanged: (v) => _applyType(v ?? 'EXPENSE'),
              )
            else
              InputDecorator(
                decoration: const InputDecoration(labelText: 'Type'),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    _type,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            const SizedBox(height: 16),
            FormSelect<String>(
              label: 'Method',
              value: _method,
              items: const [
                DropdownMenuItem(value: 'CASH', child: Text('CASH')),
                DropdownMenuItem(value: 'CARD', child: Text('CARD')),
                DropdownMenuItem(value: 'TRANSFER', child: Text('TRANSFER')),
                DropdownMenuItem(value: 'OTHER', child: Text('OTHER')),
              ],
              onChanged: (v) => setState(() => _method = v ?? 'CASH'),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: FormInput(
                    label: 'Amount',
                    controller: _amount,
                    keyboardType: TextInputType.number,
                    validator: (v) {
                      final value = double.tryParse((v ?? '').trim());
                      if (value == null || value <= 0) {
                        return 'Amount must be > 0';
                      }
                      return null;
                    },
                  ),
                ),
                const SizedBox(width: 16),
                SizedBox(
                  width: 110,
                  child: FormInput(label: 'Currency', controller: _currency),
                ),
              ],
            ),
            if (isCustomer) ...[
              const SizedBox(height: 16),
              FormInput(
                label: 'Client',
                controller: _customerSearch,
                hint: 'Search a customer by name or phone…',
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 12),
              FormSelect<String>(
                label: 'Customer',
                value: _customerId,
                items: [
                  const DropdownMenuItem(
                    value: null,
                    enabled: false,
                    child: Text('Select customer'),
                  ),
                  ...filteredCustomers.map(
                    (c) => DropdownMenuItem(
                      value: c.id,
                      child: Text('${c.name} • ${c.phone}'),
                    ),
                  ),
                ],
                onChanged: (v) => setState(() => _customerId = v),
                validator: (v) => v == null ? 'Customer required' : null,
              ),
              if (filteredCustomers.isEmpty)
                const Padding(
                  padding: EdgeInsets.only(top: 8),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      'No customers match your search.',
                      style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    ),
                  ),
                ),
            ],
            if (isSupplier) ...[
              const SizedBox(height: 16),
              FormInput(
                label: 'Supplier',
                controller: _supplierSearch,
                hint: 'Search a supplier by name…',
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 12),
              FormSelect<String>(
                label: 'Supplier',
                value: _supplierId,
                items: [
                  const DropdownMenuItem(
                    value: null,
                    enabled: false,
                    child: Text('Select supplier'),
                  ),
                  ...filteredSuppliers.map(
                    (s) => DropdownMenuItem(value: s.id, child: Text(s.name)),
                  ),
                ],
                onChanged: (v) => setState(() => _supplierId = v),
                validator: (v) => v == null ? 'Supplier required' : null,
              ),
              if (filteredSuppliers.isEmpty)
                const Padding(
                  padding: EdgeInsets.only(top: 8),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      'No suppliers match your search.',
                      style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    ),
                  ),
                ),
            ],
            if (isCategory) ...[
              const SizedBox(height: 16),
              FormInput(
                label: 'Category',
                controller: _category,
                validator: (v) {
                  if (!isCategory) return null;
                  if (v == null || v.trim().isEmpty) return 'Category required';
                  return null;
                },
              ),
            ],
            const SizedBox(height: 16),
            FormInput(
              label: 'Reference',
              hint: 'Optional',
              controller: _reference,
            ),
            const SizedBox(height: 16),
            FormInput(label: 'Note', hint: 'Optional', controller: _note),
            const SizedBox(height: 6),
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Direction is enforced by backend for each type ($_direction).',
                style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
              ),
            ),
          ],
        ),
      ),
      secondaryLabel: 'Cancel',
      onSecondary: () => Navigator.of(context).pop(),
      primaryLabel: 'Save',
      onPrimary: () {
        if (!_formKey.currentState!.validate()) return;
        final amount = double.tryParse(_amount.text.trim()) ?? 0;
        Navigator.of(context).pop(
          _TxFormResult(
            cashboxId: _cashboxId,
            type: _type,
            direction: _direction,
            amount: amount,
            currency: _currency.text.trim().isEmpty
                ? widget.initialCurrency
                : _currency.text.trim(),
            method: _method,
            customerId: isCustomer ? _customerId : null,
            supplierId: isSupplier ? _supplierId : null,
            expenseCategory: isCategory ? _category.text.trim() : null,
            reference: _reference.text.trim().isEmpty
                ? null
                : _reference.text.trim(),
            note: _note.text.trim().isEmpty ? null : _note.text.trim(),
          ),
        );
      },
    );
  }
}

class _TransferFormResult {
  final String fromCashboxId;
  final String toCashboxId;
  final double amount;
  final String currency;
  final String? reference;
  final String? note;

  _TransferFormResult({
    required this.fromCashboxId,
    required this.toCashboxId,
    required this.amount,
    required this.currency,
    required this.reference,
    required this.note,
  });
}

class _TransferDialog extends StatefulWidget {
  final List<CashboxSummary> cashboxes;
  final String initialCurrency;

  const _TransferDialog({
    required this.cashboxes,
    required this.initialCurrency,
  });

  @override
  State<_TransferDialog> createState() => _TransferDialogState();
}

class _TransferDialogState extends State<_TransferDialog> {
  final _formKey = GlobalKey<FormState>();
  String? _from;
  String? _to;
  final _amount = TextEditingController();
  late final TextEditingController _currency;
  final _reference = TextEditingController();
  final _note = TextEditingController();

  @override
  void initState() {
    super.initState();
    _currency = TextEditingController(text: widget.initialCurrency);
  }

  @override
  void dispose() {
    _amount.dispose();
    _currency.dispose();
    _reference.dispose();
    _note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AppDialog(
      title: 'Transfer between cashboxes',
      description: 'Move funds between two open cashbox sessions.',
      maxWidth: 700,
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            FormSelect<String>(
              label: 'From',
              value: _from,
              items: widget.cashboxes
                  .map(
                    (c) => DropdownMenuItem(
                      value: c.id,
                      enabled: c.openSession != null,
                      child: Text(
                        c.openSession != null
                            ? c.name
                            : '${c.name} (No open session)',
                      ),
                    ),
                  )
                  .toList(),
              onChanged: (v) => setState(() => _from = v),
              validator: (v) => v == null ? 'Select source cashbox' : null,
            ),
            const SizedBox(height: 16),
            FormSelect<String>(
              label: 'To',
              value: _to,
              items: widget.cashboxes
                  .map(
                    (c) => DropdownMenuItem(
                      value: c.id,
                      enabled: c.openSession != null,
                      child: Text(
                        c.openSession != null
                            ? c.name
                            : '${c.name} (No open session)',
                      ),
                    ),
                  )
                  .toList(),
              onChanged: (v) => setState(() => _to = v),
              validator: (v) {
                if (v == null) return 'Select destination cashbox';
                if (_from != null && v == _from) {
                  return 'Destination must differ';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: FormInput(
                    label: 'Amount',
                    controller: _amount,
                    keyboardType: TextInputType.number,
                    validator: (v) {
                      final value = double.tryParse((v ?? '').trim());
                      if (value == null || value <= 0) {
                        return 'Amount must be > 0';
                      }
                      return null;
                    },
                  ),
                ),
                const SizedBox(width: 16),
                SizedBox(
                  width: 110,
                  child: FormInput(label: 'Currency', controller: _currency),
                ),
              ],
            ),
            const SizedBox(height: 16),
            FormInput(
              label: 'Reference',
              hint: 'Optional',
              controller: _reference,
            ),
            const SizedBox(height: 16),
            FormInput(label: 'Note', hint: 'Optional', controller: _note),
            const SizedBox(height: 6),
            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Note: both cashboxes must have an OPEN session.',
                style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
              ),
            ),
          ],
        ),
      ),
      secondaryLabel: 'Cancel',
      onSecondary: () => Navigator.of(context).pop(),
      primaryLabel: 'Transfer',
      onPrimary: () {
        if (!_formKey.currentState!.validate()) return;
        if (_from == _to) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('From and To must differ')),
          );
          return;
        }
        final amount = double.tryParse(_amount.text.trim()) ?? 0;
        Navigator.of(context).pop(
          _TransferFormResult(
            fromCashboxId: _from!,
            toCashboxId: _to!,
            amount: amount,
            currency: _currency.text.trim().isEmpty
                ? widget.initialCurrency
                : _currency.text.trim(),
            reference: _reference.text.trim().isEmpty
                ? null
                : _reference.text.trim(),
            note: _note.text.trim().isEmpty ? null : _note.text.trim(),
          ),
        );
      },
    );
  }
}
