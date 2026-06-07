import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Design tokens sourced from the web admin CSS variables (dark theme).
abstract final class AppColors {
  // Brand
  static const brand = Color(0xFFC6F432); // --brand: #C6F432
  static const brandContrast = Color(0xFF05070A); // --brand-contrast

  // Layout
  static const contentBg = Color(0xFF020617); // slate-950
  static const sidebarBg = Color(0xFF0F172A); // slate-900

  // Surfaces
  static const surface1 = Color(0xFF0F172A); // slate-900
  static const surface2 = Color(0xFF151E2E); // slate-850
  static const surface3 = Color(0xFF1E293B); // slate-800
  static const surfaceBorder = Color(0x1AFFFFFF); // rgba(255,255,255,0.1)
  static const surfaceBorderHover = Color(0x26FFFFFF); // rgba(255,255,255,0.15)

  // Text
  static const textPrimary = Color(0xFFF4F4F5); // --text-primary
  static const textSecondary = Color(0xFFA1A1AA); // Zinc-400
  static const textMuted = Color(0xFF71717A); // Zinc-500
  static const textTertiary = Color(0xFF52525B); // Zinc-600

  // Dark mode nav
  static const navHoverBg = Color(0x0AFFFFFF); // rgba(255,255,255,0.04)
  static const sidebarActiveColor = brand; // --sidebar-active-color dark

  // Light mode layout/surfaces
  static const lightContentBg = Color(0xFFE6EDF4);
  static const lightSidebarBg = Color(0xFFF4F7FB);
  static const lightSidebarBorder = Color(0x1A0F172A); // rgba(15,23,42,0.1)
  static const lightSurface1 = Color(0xFFFBFDFF);
  static const lightSurface2 = Color(0xFFF3F7FB);
  static const lightSurface3 = Color(0xFFEAF0F6);
  static const lightSurfaceBorder = Color(0x1F0F172A);
  static const lightSurfaceBorderHover = Color(0x2E0F172A);
  static const lightTextPrimary = Color(0xFF0F172A);
  static const lightTextSecondary = Color(0xFF334155);
  static const lightTextTertiary = Color(0xFF64748B); // --text-tertiary light
  static const lightTextMuted = Color(0xFF94A3B8);
  static const lightNavHoverBg = Color(0x0F0F172A); // rgba(15,23,42,0.06)
  static const lightSidebarActiveColor = Color(
    0xFF5A7A0A,
  ); // --sidebar-active-color light
  static const lightTopbarBg = Color(0xFFF8FBFF); // --admin-topbar-bg light

  // Status (same across themes)
  static const red = Color(0xFFEF4444);
  static const redSurface = Color(0xFF2D1515);
  static const redText = Color(0xFFFCA5A5);
  static const amber = Color(0xFFF59E0B);
  static const amberSurface = Color(0xFF2D2008);
  static const amberText = Color(0xFFFCD34D);
  static const green = Color(0xFF22C55E);
  static const greenSurface = Color(0xFF0F2D1A);
  static const greenText = Color(0xFF86EFAC);
  static const blue = Color(0xFF3B82F6);
  static const blueSurface = Color(0xFF0F1D2D);
  static const blueText = Color(0xFF93C5FD);
  static const lightBrand = Color(0xFF4F7A0A);
  static const lightBrandContrast = Color(0xFFFFFFFF);
}

abstract final class AppTheme {
  static ThemeData get dark {
    final base = ThemeData.dark(useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: AppColors.contentBg,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.brand,
        onPrimary: AppColors.brandContrast,
        surface: AppColors.surface1,
        onSurface: AppColors.textPrimary,
        surfaceContainerHighest: AppColors.surface2,
        outline: AppColors.surfaceBorder,
        error: AppColors.red,
        onError: Colors.white,
      ),
      textTheme: GoogleFonts.dmSansTextTheme(base.textTheme)
          .copyWith(
            displayLarge: GoogleFonts.outfit(color: AppColors.textPrimary),
            displayMedium: GoogleFonts.outfit(color: AppColors.textPrimary),
            displaySmall: GoogleFonts.outfit(color: AppColors.textPrimary),
            headlineLarge: GoogleFonts.outfit(color: AppColors.textPrimary),
            headlineMedium: GoogleFonts.outfit(color: AppColors.textPrimary),
            headlineSmall: GoogleFonts.outfit(color: AppColors.textPrimary),
            titleLarge: GoogleFonts.outfit(color: AppColors.textPrimary),
            titleMedium: GoogleFonts.outfit(color: AppColors.textPrimary),
            titleSmall: GoogleFonts.outfit(color: AppColors.textPrimary),
          )
          .apply(
            bodyColor: AppColors.textPrimary,
            displayColor: AppColors.textPrimary,
          ),
      cardTheme: const CardThemeData(
        color: AppColors.surface1,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(12)),
          side: BorderSide(color: AppColors.surfaceBorder),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.surface1,
        foregroundColor: AppColors.textPrimary,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shadowColor: Colors.transparent,
        titleTextStyle: TextStyle(
          color: AppColors.textPrimary,
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
      drawerTheme: const DrawerThemeData(
        backgroundColor: AppColors.sidebarBg,
        scrimColor: Color(0xB3000000),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.surfaceBorder,
        thickness: 1,
        space: 1,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface2,
        hintStyle: const TextStyle(color: AppColors.textMuted),
        labelStyle: const TextStyle(color: AppColors.textSecondary),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.surfaceBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.surfaceBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.brand, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.red),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.red, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 10,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.brand,
          foregroundColor: AppColors.brandContrast,
          textStyle: const TextStyle(fontWeight: FontWeight.w600),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
      popupMenuTheme: const PopupMenuThemeData(
        color: AppColors.surface2,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(8)),
          side: BorderSide(color: AppColors.surfaceBorder),
        ),
      ),
      dialogTheme: const DialogThemeData(
        backgroundColor: AppColors.surface2,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(12)),
          side: BorderSide(color: AppColors.surfaceBorder),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.surface2,
        labelStyle: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
        side: const BorderSide(color: AppColors.surfaceBorder),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      ),
      tooltipTheme: TooltipThemeData(
        decoration: BoxDecoration(
          color: AppColors.surface3,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: AppColors.surfaceBorder),
        ),
        textStyle: const TextStyle(color: AppColors.textPrimary, fontSize: 12),
      ),
      scrollbarTheme: ScrollbarThemeData(
        thumbColor: WidgetStateProperty.all(AppColors.surfaceBorderHover),
        radius: const Radius.circular(99),
        thickness: WidgetStateProperty.all(4),
      ),
      dropdownMenuTheme: DropdownMenuThemeData(
        textStyle: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
        menuStyle: MenuStyle(
          backgroundColor: WidgetStateProperty.all(AppColors.surface2),
          surfaceTintColor: WidgetStateProperty.all(Colors.transparent),
          shape: WidgetStateProperty.all(
            RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
              side: const BorderSide(color: AppColors.surfaceBorder),
            ),
          ),
        ),
      ),
    );
  }

  static ThemeData get light {
    final base = ThemeData.light(useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: AppColors.lightContentBg,
      colorScheme: const ColorScheme.light(
        primary: AppColors.lightBrand,
        onPrimary: AppColors.lightBrandContrast,
        surface: AppColors.lightSurface1,
        onSurface: AppColors.lightTextPrimary,
        surfaceContainerHighest: AppColors.lightSurface2,
        outline: AppColors.lightSurfaceBorder,
        error: AppColors.red,
        onError: Colors.white,
      ),
      textTheme: GoogleFonts.dmSansTextTheme(base.textTheme)
          .copyWith(
            displayLarge: GoogleFonts.outfit(color: AppColors.lightTextPrimary),
            displayMedium: GoogleFonts.outfit(
              color: AppColors.lightTextPrimary,
            ),
            displaySmall: GoogleFonts.outfit(color: AppColors.lightTextPrimary),
            headlineLarge: GoogleFonts.outfit(
              color: AppColors.lightTextPrimary,
            ),
            headlineMedium: GoogleFonts.outfit(
              color: AppColors.lightTextPrimary,
            ),
            headlineSmall: GoogleFonts.outfit(
              color: AppColors.lightTextPrimary,
            ),
            titleLarge: GoogleFonts.outfit(color: AppColors.lightTextPrimary),
            titleMedium: GoogleFonts.outfit(color: AppColors.lightTextPrimary),
            titleSmall: GoogleFonts.outfit(color: AppColors.lightTextPrimary),
          )
          .apply(
            bodyColor: AppColors.lightTextPrimary,
            displayColor: AppColors.lightTextPrimary,
          ),
      cardTheme: const CardThemeData(
        color: AppColors.lightSurface1,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(12)),
          side: BorderSide(color: AppColors.lightSurfaceBorder),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.lightSurface1,
        foregroundColor: AppColors.lightTextPrimary,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shadowColor: Colors.transparent,
        titleTextStyle: TextStyle(
          color: AppColors.lightTextPrimary,
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
      drawerTheme: const DrawerThemeData(
        backgroundColor: AppColors.lightSidebarBg,
        scrimColor: Color(0x66000000),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.lightSurfaceBorder,
        thickness: 1,
        space: 1,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.lightSurface2,
        hintStyle: const TextStyle(color: AppColors.lightTextMuted),
        labelStyle: const TextStyle(color: AppColors.lightTextSecondary),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.lightSurfaceBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.lightSurfaceBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.lightBrand, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.red),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.red, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 10,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.lightBrand,
          foregroundColor: AppColors.lightBrandContrast,
          textStyle: const TextStyle(fontWeight: FontWeight.w600),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
      popupMenuTheme: const PopupMenuThemeData(
        color: AppColors.lightSurface2,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(8)),
          side: BorderSide(color: AppColors.lightSurfaceBorder),
        ),
      ),
      dialogTheme: const DialogThemeData(
        backgroundColor: AppColors.lightSurface2,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(12)),
          side: BorderSide(color: AppColors.lightSurfaceBorder),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.lightSurface2,
        labelStyle: const TextStyle(
          color: AppColors.lightTextPrimary,
          fontSize: 13,
        ),
        side: const BorderSide(color: AppColors.lightSurfaceBorder),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      ),
      tooltipTheme: TooltipThemeData(
        decoration: BoxDecoration(
          color: AppColors.lightSurface3,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: AppColors.lightSurfaceBorder),
        ),
        textStyle: const TextStyle(
          color: AppColors.lightTextPrimary,
          fontSize: 12,
        ),
      ),
      scrollbarTheme: ScrollbarThemeData(
        thumbColor: WidgetStateProperty.all(AppColors.lightSurfaceBorderHover),
        radius: const Radius.circular(99),
        thickness: WidgetStateProperty.all(4),
      ),
      dropdownMenuTheme: DropdownMenuThemeData(
        textStyle: const TextStyle(
          color: AppColors.lightTextPrimary,
          fontSize: 14,
        ),
        menuStyle: MenuStyle(
          backgroundColor: WidgetStateProperty.all(AppColors.lightSurface2),
          surfaceTintColor: WidgetStateProperty.all(Colors.transparent),
          shape: WidgetStateProperty.all(
            RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
              side: const BorderSide(color: AppColors.lightSurfaceBorder),
            ),
          ),
        ),
      ),
    );
  }
}
