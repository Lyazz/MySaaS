import 'package:flutter/material.dart';

enum UiBadgeTone { slate, emerald, indigo, lime, amber, red }

class UiBadge extends StatelessWidget {
  final String label;
  final UiBadgeTone tone;
  final bool uppercase;
  final double? maxWidth;
  final TextAlign? textAlign;

  const UiBadge({
    super.key,
    required this.label,
    required this.tone,
    this.uppercase = false,
    this.maxWidth,
    this.textAlign,
  });

  // Mirrors `assets/css/main.css` `.ui-badge` in the Nuxt webapp.
  static const EdgeInsets padding = EdgeInsets.symmetric(
    horizontal: 10, // px-2.5
    vertical: 4, // py-1
  );

  static const double radius = 9999;

  static const TextStyle textStyle = TextStyle(
    fontSize: 12, // text-xs
    fontWeight: FontWeight.w500, // font-medium
  );

  static Color backgroundColor(UiBadgeTone tone) => switch (tone) {
    UiBadgeTone.slate => const Color(0xFFF1F5F9), // slate-100
    UiBadgeTone.emerald => const Color(0xFFECFDF5), // emerald-50
    UiBadgeTone.indigo => const Color(0xFFEEF2FF), // indigo-50
    UiBadgeTone.lime => const Color(0xFFF7FEE7), // lime-50
    UiBadgeTone.amber => const Color(0xFFFFFBEB), // amber-50
    UiBadgeTone.red => const Color(0xFFFEF2F2), // red-50
  };

  static Color foregroundColor(UiBadgeTone tone) => switch (tone) {
    UiBadgeTone.slate => const Color(0xFF334155), // slate-700
    UiBadgeTone.emerald => const Color(0xFF047857), // emerald-700
    UiBadgeTone.indigo => const Color(0xFF4338CA), // indigo-700
    UiBadgeTone.lime => const Color(0xFF4D7C0F), // lime-700
    UiBadgeTone.amber => const Color(0xFFB45309), // amber-700
    UiBadgeTone.red => const Color(0xFFB91C1C), // red-700
  };

  @override
  Widget build(BuildContext context) {
    final resolvedLabel = uppercase ? label.toUpperCase() : label;

    return Container(
      padding: padding,
      constraints: maxWidth == null ? null : BoxConstraints(maxWidth: maxWidth!),
      decoration: BoxDecoration(
        color: backgroundColor(tone),
        borderRadius: BorderRadius.circular(radius),
      ),
      child: Text(
        resolvedLabel,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        textAlign: textAlign,
        style: textStyle.copyWith(color: foregroundColor(tone)),
      ),
    );
  }
}

