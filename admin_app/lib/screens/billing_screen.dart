import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../models/billing_models.dart';
import '../providers/billing_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/buttons/app_button.dart';
import '../widgets/form/form_input.dart';

class BillingScreen extends ConsumerStatefulWidget {
  const BillingScreen({super.key});

  @override
  ConsumerState<BillingScreen> createState() => _BillingScreenState();
}

class _BillingScreenState extends ConsumerState<BillingScreen> {
  String? _selectedPlanCode;
  String _selectedMethod = 'BARIDIMOB';
  final _notesCtrl = TextEditingController();

  @override
  void dispose() {
    _notesCtrl.dispose();
    super.dispose();
  }

  int _priceFor(SubscriptionPlan plan, String interval) {
    return interval == 'year'
        ? plan.annualAmountDzd * 12
        : plan.monthlyAmountDzd;
  }

  @override
  Widget build(BuildContext context) {
    final billingState = ref.watch(billingProvider);
    final snapshot = billingState.snapshot;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface1 = isDark ? AppColors.surface1 : AppColors.lightSurface1;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textMuted = isDark ? AppColors.textMuted : AppColors.lightTextMuted;

    if (billingState.isLoading && snapshot == null) {
      return const Center(child: CircularProgressIndicator());
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Billing & Subscription',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Usage, plans, and payment submission backed by the live billing endpoints.',
            style: TextStyle(color: textMuted),
          ),
          const SizedBox(height: 24),
          if (billingState.error != null) ...[
            Text(
              billingState.error!,
              style: const TextStyle(color: AppColors.red),
            ),
            const SizedBox(height: 12),
          ],
          if (snapshot != null)
            _SnapshotCard(
              snapshot: snapshot,
              textPrimary: textPrimary,
              textMuted: textMuted,
              surface1: surface1,
              borderColor: borderColor,
            ),
          const SizedBox(height: 20),
          Row(
            children: [
              ChoiceChip(
                label: const Text('Monthly'),
                selected: billingState.interval == 'month',
                onSelected: (_) =>
                    ref.read(billingProvider.notifier).setInterval('month'),
              ),
              const SizedBox(width: 8),
              ChoiceChip(
                label: const Text('Yearly'),
                selected: billingState.interval == 'year',
                onSelected: (_) =>
                    ref.read(billingProvider.notifier).setInterval('year'),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Wrap(
            spacing: 16,
            runSpacing: 16,
            children: billingState.availablePlans.map((plan) {
              final isCurrent = snapshot?.subscription.planCode == plan.code;
              final isSelected = _selectedPlanCode == plan.code;
              return SizedBox(
                width: 320,
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: surface1,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: isSelected
                          ? AppColors.brand
                          : (isCurrent ? AppColors.green : borderColor),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        plan.name,
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: textPrimary,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        plan.description,
                        style: TextStyle(color: textMuted),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        '${_priceFor(plan, billingState.interval)} ${plan.currency}/${billingState.interval == 'year' ? 'yr' : 'mo'}',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: textPrimary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Orders/mo: ${plan.ordersPerMonth}',
                        style: TextStyle(color: textMuted),
                      ),
                      Text(
                        'Max products: ${plan.maxProducts}',
                        style: TextStyle(color: textMuted),
                      ),
                      Text(
                        'Max pixels: ${plan.maxPixels}',
                        style: TextStyle(color: textMuted),
                      ),
                      const SizedBox(height: 16),
                      AppButton.primary(
                        label: isCurrent
                            ? 'Current Plan'
                            : (isSelected ? 'Selected' : 'Choose'),
                        onPressed: isCurrent
                            ? null
                            : () =>
                                  setState(() => _selectedPlanCode = plan.code),
                        fullWidth: true,
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 24),
          if (_selectedPlanCode != null)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: surface1,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: borderColor),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Submit or Simulate Payment',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: textPrimary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    children: ['BARIDIMOB', 'CCP', 'MYFIN', 'PAYSERA']
                        .map(
                          (method) => ChoiceChip(
                            label: Text(method),
                            selected: _selectedMethod == method,
                            onSelected: (_) =>
                                setState(() => _selectedMethod = method),
                          ),
                        )
                        .toList(),
                  ),
                  const SizedBox(height: 12),
                  FormInput(
                    label: 'Notes',
                    controller: _notesCtrl,
                    maxLines: 3,
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: AppButton.secondary(
                          label: 'Simulate Payment',
                          onPressed: billingState.isLoading
                              ? null
                              : () => ref
                                    .read(billingProvider.notifier)
                                    .simulatePayment(_selectedPlanCode!),
                          icon: LucideIcons.flaskConical,
                          fullWidth: true,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: AppButton.primary(
                          label: 'Submit Payment',
                          onPressed: billingState.isLoading
                              ? null
                              : () => ref
                                    .read(billingProvider.notifier)
                                    .submitPayment(
                                      planCode: _selectedPlanCode!,
                                      method: _selectedMethod,
                                      notes: _notesCtrl.text,
                                    ),
                          icon: LucideIcons.creditCard,
                          fullWidth: true,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          const SizedBox(height: 24),
          Text(
            'Recent Payments',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          ...billingState.payments.map(
            (payment) => ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(
                '${payment.planCode.toUpperCase()} • ${payment.method}',
              ),
              subtitle: Text(
                '${payment.status} • ${payment.amountDzd} ${payment.currency}'
                '${payment.createdAt != null ? ' • ${DateFormat.yMMMd().format(payment.createdAt!)}' : ''}',
              ),
              trailing: payment.proofUrl != null
                  ? const Icon(LucideIcons.badgeCheck, color: AppColors.green)
                  : const Icon(LucideIcons.clock3, color: AppColors.amber),
            ),
          ),
        ],
      ),
    );
  }
}

class _SnapshotCard extends StatelessWidget {
  final BillingSnapshot snapshot;
  final Color textPrimary;
  final Color textMuted;
  final Color surface1;
  final Color borderColor;

  const _SnapshotCard({
    required this.snapshot,
    required this.textPrimary,
    required this.textMuted,
    required this.surface1,
    required this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: surface1,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            snapshot.plan.name,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            '${snapshot.subscription.status} • ${snapshot.subscription.interval}',
            style: TextStyle(color: textMuted),
          ),
          const SizedBox(height: 16),
          Text(
            'Usage: ${snapshot.usage.ordersInPeriod} / ${snapshot.usage.ordersLimit} orders this period',
            style: TextStyle(color: textPrimary, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Text(
            'Period: ${DateFormat.yMMMd().format(snapshot.usage.periodStart)} - ${DateFormat.yMMMd().format(snapshot.usage.periodEnd)}',
            style: TextStyle(color: textMuted),
          ),
        ],
      ),
    );
  }
}
