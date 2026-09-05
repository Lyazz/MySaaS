import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

class SettingsSection extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData? icon;
  final Widget child;
  final Widget? aside;

  const SettingsSection({
    super.key,
    required this.title,
    this.subtitle,
    this.icon,
    required this.child,
    this.aside,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface2 = isDark ? AppColors.surface2 : AppColors.lightSurface2;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textTertiary = isDark
        ? AppColors.textMuted
        : AppColors.lightTextMuted;

    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      decoration: BoxDecoration(
        color: surface2,
        border: Border.all(color: borderColor),
        borderRadius: BorderRadius.circular(16),
      ),
      padding: const EdgeInsets.all(28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        if (icon != null) ...[
                          Icon(icon, size: 18, color: textTertiary),
                          const SizedBox(width: 10),
                        ],
                        Text(
                          title,
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w600,
                            color: textPrimary,
                            letterSpacing: -0.1,
                          ),
                        ),
                      ],
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: 6),
                      Text(
                        subtitle!,
                        style: TextStyle(
                          fontSize: 13,
                          color: textTertiary,
                          height: 1.55,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              if (aside != null) aside!,
            ],
          ),
          Padding(
            padding: const EdgeInsets.only(top: 18, bottom: 24),
            child: Divider(height: 1, color: borderColor),
          ),
          child,
        ],
      ),
    );
  }
}
