import 'package:flutter/material.dart';

/// Colour tokens shared by every unauthenticated screen (login, register).
///
/// The login and register screens each used to carry a private copy of this
/// palette, which made them drift apart. Keep the single definition here so the
/// auth surfaces stay visually identical to each other and to the web admin.
class AuthPalette {
  final Color pageBackground;
  final Gradient pageGradient;
  final Color blobPrimary;
  final Color blobSecondary;
  final Color cardBackground;
  final Color glassBackground;
  final Color cardBorder;
  final Color primaryText;
  final Color secondaryText;
  final Color mutedText;
  final Color inputBackground;
  final Color inputBorder;
  final Color brand;

  /// Text/icon colour that is legible on top of [brand].
  final Color onBrand;

  const AuthPalette({
    required this.pageBackground,
    required this.pageGradient,
    required this.blobPrimary,
    required this.blobSecondary,
    required this.cardBackground,
    required this.glassBackground,
    required this.cardBorder,
    required this.primaryText,
    required this.secondaryText,
    required this.mutedText,
    required this.inputBackground,
    required this.inputBorder,
    required this.brand,
    this.onBrand = const Color(0xFF05070A),
  });

  /// Danger colours are identical in both themes.
  static const Color danger = Color(0xFFEF4444);
  static const Color dangerText = Color(0xFFFCA5A5);
  static const Color dangerBorder = Color(0x44EF4444);
  static const Color dangerBackground = Color(0x22EF4444);
  static const Color success = Color(0xFF6EE7B7);
  static const Color successBorder = Color(0x5534D399);
  static const Color successBackground = Color(0x2234D399);
  static const Color warningText = Color(0xFFFCD34D);

  factory AuthPalette.fromTheme({required bool isDark}) {
    if (isDark) {
      return AuthPalette(
        pageBackground: const Color(0xFF060A14),
        pageGradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF050816), Color(0xFF0B1220), Color(0xFF080C16)],
        ),
        blobPrimary: const Color(0xFF16D5B3).withValues(alpha: 0.24),
        blobSecondary: const Color(0xFF3559FF).withValues(alpha: 0.2),
        cardBackground: const Color(0xD90F1424),
        glassBackground: const Color(0x14FFFFFF),
        cardBorder: const Color(0x1AFFFFFF),
        primaryText: const Color(0xFFE7ECEE),
        secondaryText: const Color(0xFF8A959C),
        mutedText: const Color(0xFF4F5A60),
        inputBackground: const Color(0x1AFFFFFF),
        inputBorder: const Color(0x26FFFFFF),
        brand: const Color(0xFFC6F432),
      );
    }

    return AuthPalette(
      pageBackground: const Color(0xFFF2F7FF),
      pageGradient: const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFFF7FAFF), Color(0xFFF0F5FD), Color(0xFFE9F0F8)],
      ),
      blobPrimary: const Color(0xFF84A60D).withValues(alpha: 0.15),
      blobSecondary: const Color(0xFF16D5B3).withValues(alpha: 0.13),
      cardBackground: const Color(0xF8FBFDFF),
      glassBackground: const Color(0xFFF2F6FB),
      cardBorder: const Color(0x1F0F172A),
      primaryText: const Color(0xFF0F172A),
      secondaryText: const Color(0xFF475569),
      mutedText: const Color(0xFF94A3B8),
      inputBackground: const Color(0xFFF3F7FB),
      inputBorder: const Color(0x240F172A),
      brand: const Color(0xFFC6F432),
    );
  }

  factory AuthPalette.of(BuildContext context) => AuthPalette.fromTheme(
    isDark: Theme.of(context).brightness == Brightness.dark,
  );
}
