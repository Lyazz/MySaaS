import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../theme/app_theme.dart';
import '../utils/feature_access.dart';
import '../widgets/buttons/app_button.dart';

class FeatureLockedScreen extends ConsumerWidget {
  final String featureName;

  const FeatureLockedScreen({super.key, required this.featureName});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feature = FeatureAccess.fromName(featureName);
    final info = feature != null
        ? FeatureAccess.infoFor(feature)
        : const FeatureAccessInfo(
            feature: OnlineTierFeature.preview,
            title: 'Feature Locked',
            description:
                'This feature is not available for the current subscription.',
          );
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? AppColors.surface1 : AppColors.lightSurface1;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textMuted = isDark ? AppColors.textMuted : AppColors.lightTextMuted;

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: borderColor),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppColors.amber.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(
                    LucideIcons.lock,
                    color: AppColors.amber,
                    size: 22,
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  info.title,
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    color: textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  info.description,
                  style: TextStyle(fontSize: 14, height: 1.5, color: textMuted),
                ),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.brand.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: AppColors.brand.withValues(alpha: 0.14),
                    ),
                  ),
                  child: Text(
                    'Upgrade to an online tier to unlock hosted storefront capabilities from this app.',
                    style: TextStyle(
                      fontSize: 13,
                      height: 1.45,
                      color: textPrimary,
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: AppButton.secondary(
                        label: 'Back to Settings',
                        onPressed: () => context.go('/settings'),
                        icon: LucideIcons.arrowLeft,
                        fullWidth: true,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
