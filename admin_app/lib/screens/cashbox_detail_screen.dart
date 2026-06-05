import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../models/cash.dart';
import '../providers/cash_provider.dart';
import '../providers/store_settings_provider.dart';
import '../theme/app_theme.dart';
import '../utils/tenant_currency.dart';
import '../widgets/form/form_input.dart';
import '../widgets/dialogs/app_dialog.dart';
import '../widgets/buttons/app_button.dart';
import 'package:easy_localization/easy_localization.dart';

class CashboxDetailScreen extends ConsumerStatefulWidget {
  final String cashboxId;

  const CashboxDetailScreen({super.key, required this.cashboxId});

  @override
  ConsumerState<CashboxDetailScreen> createState() =>
      _CashboxDetailScreenState();
}

class _CashboxDetailScreenState extends ConsumerState<CashboxDetailScreen> {
  final DateTimeRange _range = _defaultRange();

  static DateTimeRange _defaultRange() {
    final now = DateTime.now();
    final start = DateTime(
      now.year,
      now.month,
      now.day,
    ).subtract(const Duration(days: 7));
    final end = DateTime(now.year, now.month, now.day, 23, 59, 59, 999);
    return DateTimeRange(start: start, end: end);
  }

  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      final notifier = ref.read(cashProvider.notifier);
      await notifier.fetchCashboxes();
      await notifier.fetchTransactions(
        cashboxId: widget.cashboxId,
        startDate: _range.start,
        endDate: _range.end,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final cash = ref.watch(cashProvider);
    final cashbox = cash.cashboxes
        .where((c) => c.id == widget.cashboxId)
        .cast<CashboxSummary?>()
        .firstOrNull;
    final money = tenantCurrencyFormatter(
      ref.watch(storeSettingsProvider).settings,
    );

    return Scaffold(
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                AppButton.ghost(
                  label: 'admin.pages.cash.methods.CASH'.tr(),
                  size: AppButtonSize.sm,
                  onPressed: () => context.go('/cash'),
                ),
                Icon(
                  LucideIcons.chevronRight,
                  size: 16,
                  color: Theme.of(
                    context,
                  ).colorScheme.onSurface.withValues(alpha: 0.3),
                ),
                const SizedBox(width: 4),
                Text(
                  cashbox?.name ?? widget.cashboxId.substring(0, 8),
                  style: TextStyle(
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.5),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        cashbox?.name ?? 'Cashbox',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color: Theme.of(context).colorScheme.onSurface,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        cashbox?.openSession != null
                            ? 'Session OPEN • ${cashbox!.openSession!.id.substring(0, 8)}'
                            : 'Session CLOSED',
                        style: TextStyle(
                          color: Theme.of(
                            context,
                          ).colorScheme.onSurface.withValues(alpha: 0.5),
                        ),
                      ),
                    ],
                  ),
                ),
                if (cashbox != null && cashbox.openSession == null)
                  AppButton.primary(
                    label: 'admin.pages.cash.openSession'.tr(),
                    icon: LucideIcons.play,
                    onPressed: cashbox.isActive
                        ? () => _openSession(context, cashbox)
                        : null,
                  ),
                if (cashbox?.openSession != null) ...[
                  AppButton.secondary(
                    label: 'admin.pages.cash.closeSession'.tr(),
                    icon: LucideIcons.lock,
                    onPressed: () => _closeSession(context, cashbox!),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 20),
            _Card(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text( 'admin.pages.cash.transactions.title'.tr(),
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                color: Theme.of(context).colorScheme.onSurface,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text( 'app.transactions_for_this_cashbox'.tr(),
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
                      AppButton.secondary(
                        label: 'superAdmin.paymentsPage.actions.refresh'.tr(),
                        icon: LucideIcons.refreshCw,
                        size: AppButtonSize.sm,
                        onPressed: () => ref
                            .read(cashProvider.notifier)
                            .fetchTransactions(
                              cashboxId: widget.cashboxId,
                              startDate: _range.start,
                              endDate: _range.end,
                            ),
                      ),
                    ],
                  ),
                  SizedBox(height: 12),
                  if (cash.isLoadingTransactions)
                    Padding(
                      padding: EdgeInsets.all(32),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  else if (cash.transactions.isEmpty)
                    Padding(
                      padding: EdgeInsets.all(32),
                      child: Center(child: Text( 'app.no_transactions_found'.tr())),
                    )
                  else
                    Column(
                      children: [
                        _TableHeader(
                          columns: [
                            _Col(label: 'superAdmin.paymentsPage.history.table.date'.tr(), flex: 2),
                            _Col(label: 'admin.pages.inventory.movements.table.type'.tr(), flex: 3),
                            _Col(label: 'superAdmin.paymentsPage.history.table.method'.tr(), flex: 2),
                            _Col(label: 'superAdmin.paymentsPage.history.table.amount'.tr(), flex: 2, alignRight: true),
                          ],
                        ),
                        ...cash.transactions.map(
                          (tx) => _TableRow(
                            child: Row(
                              children: [
                                _Cell(
                                  flex: 2,
                                  child: Text(
                                    _formatDate(tx.createdAt),
                                    style: TextStyle(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurface
                                          .withValues(alpha: 0.5),
                                    ),
                                  ),
                                ),
                                _Cell(
                                  flex: 3,
                                  child: Text(
                                    _typeLabel(tx.type),
                                    style: TextStyle(
                                      fontWeight: FontWeight.w600,
                                      color: Theme.of(
                                        context,
                                      ).colorScheme.onSurface,
                                    ),
                                  ),
                                ),
                                _Cell(
                                  flex: 2,
                                  child: _MethodChip(method: tx.method),
                                ),
                                _Cell(
                                  flex: 2,
                                  alignRight: true,
                                  child: Text(
                                    '${tx.direction == 'IN' ? '+' : '-'}${money.format(tx.amount)}',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                      color: tx.direction == 'IN'
                                          ? const Color(0xFF059669)
                                          : const Color(0xFFE11D48),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openSession(
    BuildContext context,
    CashboxSummary cashbox,
  ) async {
    final openingController = TextEditingController(text: 'admin.forms.product.stock.placeholder'.tr());
    final noteController = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AppDialog(
        title: 'admin.pages.cash.openSession'.tr(),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            FormInput(
              label: 'admin.pages.cash.sessions.table.openingFloat'.tr(),
              controller: openingController,
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 16),
            FormInput(label: 'admin.pages.sales.refundModal.noteLabel'.tr(), controller: noteController),
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
        title: 'admin.pages.cash.closeSession'.tr(),
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
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Opening float: ${expected.openingFloat.toStringAsFixed(2)}',
                    ),
                    Text('In: +${expected.inSum.toStringAsFixed(2)}'),
                    Text('Out: -${expected.outSum.toStringAsFixed(2)}'),
                  ],
                ),
              ),
            const SizedBox(height: 16),
            FormInput(
              label: 'admin.pages.cash.closingCount'.tr(),
              controller: closingController,
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 16),
            FormInput(label: 'admin.pages.sales.refundModal.noteLabel'.tr(), controller: noteController),
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

class _Col {
  final String label;
  final int flex;
  final bool alignRight;

  const _Col({
    required this.label,
    required this.flex,
    this.alignRight = false,
  });
}

class _TableHeader extends StatelessWidget {
  final List<_Col> columns;

  const _TableHeader({required this.columns});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        border: Border(
          bottom: BorderSide(
            color: isDark
                ? AppColors.surfaceBorder
                : AppColors.lightSurfaceBorder,
          ),
        ),
      ),
      child: Row(
        children: [
          for (final col in columns)
            Expanded(
              flex: col.flex,
              child: Align(
                alignment: col.alignRight
                    ? Alignment.centerRight
                    : Alignment.centerLeft,
                child: Text(
                  col.label,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.4),
                    letterSpacing: 0.6,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _TableRow extends StatelessWidget {
  final Widget child;

  const _TableRow({required this.child});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: isDark
                ? AppColors.surfaceBorder
                : AppColors.lightSurfaceBorder,
          ),
        ),
      ),
      child: child,
    );
  }
}

class _Cell extends StatelessWidget {
  final int flex;
  final bool alignRight;
  final Widget child;

  const _Cell({
    required this.flex,
    required this.child,
    this.alignRight = false,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      flex: flex,
      child: Align(
        alignment: alignRight ? Alignment.centerRight : Alignment.centerLeft,
        child: child,
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
        borderRadius: BorderRadius.circular(8),
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
              fontSize: 12,
              fontWeight: FontWeight.w600,
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

String _formatDate(DateTime? date) {
  if (date == null) return '—';
  return DateFormat('y-MM-dd HH:mm').format(date.toLocal());
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

extension on Iterable<CashboxSummary?> {
  CashboxSummary? get firstOrNull {
    for (final item in this) {
      return item;
    }
    return null;
  }
}
