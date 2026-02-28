import 'package:flutter/material.dart';

class AdminStatCard extends StatelessWidget {
  final String label;
  final String value;
  final String? hint;
  final IconData icon;
  final String tone; // 'teal', 'blue', 'orange', 'red'
  final bool isLoading;
  final VoidCallback? onTap;

  const AdminStatCard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    this.hint,
    this.tone = 'teal',
    this.isLoading = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = _getToneColors(tone);

    final card = Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16), // rounded-2xl
        border: Border.all(
          color: const Color(0xFFE2E8F0).withValues(alpha: 0.7),
        ), // slate-200/70
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
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF475569), // slate-600
                  ),
                ),
                const SizedBox(height: 8),
                if (isLoading)
                  Container(
                    width: 80,
                    height: 32,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9), // slate-100
                      borderRadius: BorderRadius.circular(8),
                    ),
                  )
                else
                  Text(
                    value,
                    style: const TextStyle(
                      fontSize: 30, // text-3xl
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF0F172A), // slate-900
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
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(8),
                      ),
                    )
                  else
                    Text(
                      hint!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF64748B), // slate-500
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

  ({Color bg, Color border, Color text}) _getToneColors(String tone) {
    switch (tone) {
      case 'blue':
        return (
          bg: const Color(0xFFEFF6FF), // blue-50
          border: const Color(0xFFBFDBFE), // blue-200
          text: const Color(0xFF1D4ED8), // blue-700
        );
      case 'orange':
        return (
          bg: const Color(0xFFFFF7ED), // orange-50
          border: const Color(0xFFFED7AA), // orange-200
          text: const Color(0xFFC2410C), // orange-700
        );
      case 'red':
        return (
          bg: const Color(0xFFFEF2F2), // red-50
          border: const Color(0xFFFECACA), // red-200
          text: const Color(0xFFB91C1C), // red-700
        );
      case 'teal':
      default:
        return (
          bg: const Color(0xFFF0FDFA), // teal-50
          border: const Color(0xFF99F6E4), // teal-200
          text: const Color(0xFF0F766E), // teal-700
        );
    }
  }
}
