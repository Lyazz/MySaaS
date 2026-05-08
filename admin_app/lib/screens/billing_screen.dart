import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../providers/billing_provider.dart';
import '../widgets/buttons/app_button.dart';
import '../theme/app_theme.dart';

class BillingScreen extends ConsumerWidget {
  const BillingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final billingState = ref.watch(billingProvider);
    final subscription = billingState.currentSubscription;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface1 = isDark ? AppColors.surface1 : AppColors.lightSurface1;
    final borderColor = isDark ? AppColors.surfaceBorder : AppColors.lightSurfaceBorder;
    final textPrimary = isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;
    final textMuted = isDark ? AppColors.textMuted : AppColors.lightTextMuted;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Billing & Subscription',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: textPrimary),
          ),
          const SizedBox(height: 8),
          Text(
            'Manage your plan and payment details',
            style: TextStyle(color: textMuted),
          ),
          const SizedBox(height: 32),
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: surface1,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: borderColor),
              boxShadow: isDark
                  ? null
                  : [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Current Plan',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: textMuted,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          subscription?.planCode.toUpperCase() ?? 'NONE',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: textPrimary,
                          ),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.greenSurface : const Color(0xFFF0FDF4),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: isDark ? AppColors.greenText.withValues(alpha: 0.3) : const Color(0xFFBBF7D0),
                        ),
                      ),
                      child: Text(
                        subscription?.status ?? 'INACTIVE',
                        style: TextStyle(
                          color: isDark ? AppColors.greenText : const Color(0xFF15803D),
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Divider(color: borderColor),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Icon(LucideIcons.calendar, size: 20, color: textMuted),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Next Billing Date',
                          style: TextStyle(fontSize: 12, color: textMuted),
                        ),
                        Text(
                          subscription != null
                              ? DateFormat.yMMMd().format(subscription.nextBillingDate)
                              : '-',
                          style: TextStyle(fontWeight: FontWeight.w600, color: textPrimary),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 48),
          Text(
            'Available Plans',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: textPrimary),
          ),
          const SizedBox(height: 16),
          LayoutBuilder(
            builder: (context, constraints) {
              return Row(
                children: billingState.availablePlans.map((plan) {
                  final isCurrent = subscription?.planCode == plan.code;
                  return Expanded(
                    child: Container(
                      margin: const EdgeInsets.only(right: 16),
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: isCurrent
                            ? AppColors.brand.withValues(alpha: isDark ? 0.08 : 0.06)
                            : surface1,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isCurrent ? AppColors.brand.withValues(alpha: 0.5) : borderColor,
                          width: isCurrent ? 2 : 1,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            plan.name,
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: textPrimary,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            '\$${plan.price}/mo',
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: textPrimary,
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            plan.features,
                            style: TextStyle(fontSize: 14, color: textMuted),
                          ),
                          const SizedBox(height: 24),
                          AppButton.primary(
                            label: isCurrent ? 'Current' : 'Select',
                            onPressed: isCurrent
                                ? null
                                : () => ref.read(billingProvider.notifier).upgradePlan(plan.code),
                            fullWidth: true,
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              );
            },
          ),
        ],
      ),
    );
  }
}
