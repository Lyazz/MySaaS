import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class AdminStatCard extends StatelessWidget {
  final String label;
  final String value;
  final String? hint;
  final IconData icon;
  final String tone; // 'lime', 'blue', 'orange', 'red'
  final bool isLoading;
  final VoidCallback? onTap;

  const AdminStatCard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    this.hint,
    this.tone = 'lime',
    this.isLoading = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final colors = _getToneColors(tone, isDark);
    final card = Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16), // rounded-2xl
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
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                ),
                const SizedBox(height: 8),
                if (isLoading)
                  Container(
                    width: 80,
                    height: 32,
                    decoration: BoxDecoration(
                      color: Theme.of(
                        context,
                      ).colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(8),
                    ),
                  )
                else
                  Text(
                    value,
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      letterSpacing: -0.5,
                    ),
                  ),
                if ((hint ?? '').trim().isNotEmpty) ...[
                  const SizedBox(height: 4),
                  if (isLoading)
                    Container(
                      width: 140,
                      height: 14,
                      decoration: BoxDecoration(
                        color: Theme.of(
                          context,
                        ).colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(8),
                      ),
                    )
                  else
                    Text(
                      hint!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(
                          context,
                        ).colorScheme.onSurface.withValues(alpha: 0.5),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 12),
          Container(
            width: 44, // h-11
            height: 44,
            decoration: BoxDecoration(
              color: colors.bg,
              border: Border.all(color: colors.border),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: colors.text, size: 20),
          ),
        ],
      ),
    );

    if (onTap == null) return card;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: card,
    );
  }

  ({Color bg, Color border, Color text}) _getToneColors(String tone, bool isDark) {
    switch (tone) {
      case 'blue':
        return (
          bg: isDark ? const Color(0xFF1E3A8A).withValues(alpha: 0.3) : const Color(0xFFEFF6FF), // blue-50
          border: isDark ? const Color(0xFF1E3A8A) : const Color(0xFFBFDBFE), // blue-200
          text: isDark ? const Color(0xFF60A5FA) : const Color(0xFF1D4ED8), // blue-700
        );
      case 'orange':
        return (
          bg: isDark ? const Color(0xFF7C2D12).withValues(alpha: 0.3) : const Color(0xFFFFF7ED), // orange-50
          border: isDark ? const Color(0xFF7C2D12) : const Color(0xFFFED7AA), // orange-200
          text: isDark ? const Color(0xFFFB923C) : const Color(0xFFC2410C), // orange-700
        );
      case 'red':
        return (
          bg: isDark ? const Color(0xFF7F1D1D).withValues(alpha: 0.3) : const Color(0xFFFEF2F2), // red-50
          border: isDark ? const Color(0xFF7F1D1D) : const Color(0xFFFECACA), // red-200
          text: isDark ? const Color(0xFFF87171) : const Color(0xFFB91C1C), // red-700
        );
      case 'lime':
      default:
        return (
          bg: isDark ? const Color(0xFF365314).withValues(alpha: 0.3) : const Color(0xFFF7FEE7), // lime-50
          border: isDark ? const Color(0xFF365314) : const Color(0xFFD9F99D), // lime-200
          text: isDark ? const Color(0xFFA3E635) : const Color(0xFF4D7C0F), // lime-700
        );
    }
  }
}
