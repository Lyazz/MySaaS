import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class UiTabItem {
  final String key;
  final String label;
  final int? count;

  const UiTabItem({
    required this.key,
    required this.label,
    this.count,
  });
}

/// Underline-style tab bar matching the Nuxt webapp AdminTabFilter design.
/// Active tab: colored text + 2px colored bottom border.
/// Inactive: muted text, no border.
class UiTabFilter extends StatelessWidget {
  final String activeTab;
  final List<UiTabItem> tabs;
  final ValueChanged<String> onTabChanged;

  const UiTabFilter({
    super.key,
    required this.activeTab,
    required this.tabs,
    required this.onTabChanged,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final brand = Theme.of(context).colorScheme.primary;
    final surfaceBorder = isDark ? AppColors.surfaceBorder : AppColors.lightSurfaceBorder;
    final textMuted = isDark ? AppColors.textTertiary : AppColors.lightTextTertiary;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: tabs.map((tab) {
              final isActive = activeTab == tab.key;
              return InkWell(
                onTap: () => onTabChanged(tab.key),
                splashColor: Colors.transparent,
                highlightColor: Colors.transparent,
                hoverColor: Colors.transparent,
                child: Padding(
                  padding: const EdgeInsets.only(right: 24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              tab.label,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
                                color: isActive ? brand : textMuted,
                              ),
                            ),
                            if (tab.count != null) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6, vertical: 1),
                                decoration: BoxDecoration(
                                  color: isActive
                                      ? brand.withValues(alpha: 0.15)
                                      : (isDark
                                          ? AppColors.surface3
                                          : AppColors.lightSurface3),
                                  borderRadius: BorderRadius.circular(9999),
                                ),
                                child: Text(
                                  tab.count.toString(),
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: isActive ? brand : textMuted,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      // Active indicator line
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        height: 2,
                        decoration: BoxDecoration(
                          color: isActive ? brand : Colors.transparent,
                          borderRadius: BorderRadius.circular(1),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ),
        Divider(height: 1, thickness: 1, color: surfaceBorder),
      ],
    );
  }
}
