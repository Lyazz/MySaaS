import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color moodColor;
  final String? hint;
  final bool dense;
  final bool showIcon;

  const StatCard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    required this.moodColor,
    this.hint,
    this.dense = false,
    this.showIcon = true,
  });

  @override
  Widget build(BuildContext context) {
    final padding = dense ? 16.0 : 24.0;
    final radius = dense ? 12.0 : 16.0;
    final labelFontSize = dense ? 13.0 : 14.0;
    final valueFontSize = dense ? 20.0 : 24.0;
    final iconPadding = dense ? 6.0 : 8.0;
    final iconSize = dense ? 18.0 : 20.0;

    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: EdgeInsets.all(padding),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(
          color: isDark
              ? AppColors.surfaceBorder
              : AppColors.lightSurfaceBorder,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.5),
                    fontSize: labelFontSize,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              if (showIcon) ...[
                const SizedBox(width: 12),
                Container(
                  padding: EdgeInsets.all(iconPadding),
                  decoration: BoxDecoration(
                    color: moodColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: moodColor, size: iconSize),
                ),
              ],
            ],
          ),
          const SizedBox(height: 16),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: valueFontSize,
              fontWeight: FontWeight.bold,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
          if (hint != null) ...[
            const SizedBox(height: 8),
            Text(
              hint!,
              style: TextStyle(
                fontSize: 13,
                color: moodColor, // Often used for warnings like "low stock"
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
