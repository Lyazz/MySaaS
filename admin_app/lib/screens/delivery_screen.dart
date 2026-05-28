import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/delivery_provider.dart';
import '../theme/app_theme.dart';

class DeliveryScreen extends ConsumerWidget {
  const DeliveryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final deliveryState = ref.watch(deliveryProviderProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface1 = isDark ? AppColors.surface1 : AppColors.lightSurface1;
    final surface3 = isDark ? AppColors.surface3 : AppColors.lightSurface3;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textMuted = isDark ? AppColors.textMuted : AppColors.lightTextMuted;

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Delivery Settings',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Manage delivery providers and rates',
            style: TextStyle(color: textMuted),
          ),
          const SizedBox(height: 32),
          Expanded(
            child: GridView.builder(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                crossAxisSpacing: 24,
                mainAxisSpacing: 24,
                childAspectRatio: 1.5,
              ),
              itemCount: deliveryState.providers.length,
              itemBuilder: (context, index) {
                final provider = deliveryState.providers[index];
                return Stack(
                  children: [
                    Container(
                      decoration: BoxDecoration(
                        color: surface1,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: provider.isEnabled
                              ? AppColors.brand.withValues(alpha: 0.4)
                              : borderColor,
                          width: 2,
                        ),
                        boxShadow: [
                          if (provider.isEnabled)
                            BoxShadow(
                              color: AppColors.brand.withValues(alpha: 0.08),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                        ],
                      ),
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: surface3,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  provider.name[0],
                                  style: TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.bold,
                                    color: textPrimary,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      provider.name,
                                      style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                        color: textPrimary,
                                      ),
                                    ),
                                    Text(
                                      provider.description ?? '',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: textMuted,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const Spacer(),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                provider.isEnabled ? 'Active' : 'Inactive',
                                style: TextStyle(
                                  color: provider.isEnabled
                                      ? AppColors.brand
                                      : textMuted,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Switch(
                                value: provider.isEnabled,
                                activeTrackColor: AppColors.brand,
                                activeThumbColor: AppColors.brandContrast,
                                onChanged: (_) => ref
                                    .read(deliveryProviderProvider.notifier)
                                    .toggleProvider(provider.id),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    if (deliveryState.isLoading)
                      const Positioned.fill(
                        child: Center(child: CircularProgressIndicator()),
                      ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
