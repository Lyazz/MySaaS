import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

enum AppButtonVariant {
  primary,
  secondary,
  neutral,
  destructive,
  ghost,
  danger,
}

enum AppButtonSize { sm, md }

class AppButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final AppButtonSize size;
  final IconData? icon;
  final Widget? trailing;
  final bool fullWidth;
  final bool loading;

  const AppButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = AppButtonVariant.secondary,
    this.size = AppButtonSize.md,
    this.icon,
    this.trailing,
    this.fullWidth = false,
    this.loading = false,
  });

  const AppButton.primary({
    super.key,
    required this.label,
    required this.onPressed,
    this.size = AppButtonSize.md,
    this.icon,
    this.trailing,
    this.fullWidth = false,
    this.loading = false,
  }) : variant = AppButtonVariant.primary;

  const AppButton.secondary({
    super.key,
    required this.label,
    required this.onPressed,
    this.size = AppButtonSize.md,
    this.icon,
    this.trailing,
    this.fullWidth = false,
    this.loading = false,
  }) : variant = AppButtonVariant.secondary;

  const AppButton.neutral({
    super.key,
    required this.label,
    required this.onPressed,
    this.size = AppButtonSize.md,
    this.icon,
    this.trailing,
    this.fullWidth = false,
    this.loading = false,
  }) : variant = AppButtonVariant.neutral;

  const AppButton.destructive({
    super.key,
    required this.label,
    required this.onPressed,
    this.size = AppButtonSize.md,
    this.icon,
    this.trailing,
    this.fullWidth = false,
    this.loading = false,
  }) : variant = AppButtonVariant.destructive;

  const AppButton.danger({
    super.key,
    required this.label,
    required this.onPressed,
    this.size = AppButtonSize.md,
    this.icon,
    this.trailing,
    this.fullWidth = false,
    this.loading = false,
  }) : variant = AppButtonVariant.danger;

  const AppButton.ghost({
    super.key,
    required this.label,
    required this.onPressed,
    this.size = AppButtonSize.md,
    this.icon,
    this.trailing,
    this.fullWidth = false,
    this.loading = false,
  }) : variant = AppButtonVariant.ghost;

  static const double _radius = 8;
  static const double _heightMd = 36;
  static const double _heightSm = 30;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final iconSize = size == AppButtonSize.sm ? 14.0 : 16.0;
    final Widget child = loading
        ? SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: isDark
                  ? AppColors.textPrimary
                  : AppColors.lightTextPrimary,
            ),
          )
        : (trailing == null
              ? Text(label)
              : Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(label),
                    SizedBox(width: size == AppButtonSize.sm ? 6 : 8),
                    trailing!,
                  ],
                ));

    final resolvedOnPressed = loading ? null : onPressed;

    final surface2 = isDark ? AppColors.surface2 : AppColors.lightSurface2;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final textSecondary = isDark
        ? AppColors.textSecondary
        : AppColors.lightTextSecondary;

    final button = switch (variant) {
      AppButtonVariant.primary => _buildFilled(
        context,
        onPressed: resolvedOnPressed,
        child: child,
        iconSize: iconSize,
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Theme.of(context).colorScheme.onPrimary,
      ),
      AppButtonVariant.neutral => _buildFilled(
        context,
        onPressed: resolvedOnPressed,
        child: child,
        iconSize: iconSize,
        backgroundColor: isDark ? AppColors.surface3 : AppColors.lightSurface3,
        foregroundColor: isDark
            ? AppColors.textPrimary
            : AppColors.lightTextPrimary,
      ),
      AppButtonVariant.destructive => _buildFilled(
        context,
        onPressed: resolvedOnPressed,
        child: child,
        iconSize: iconSize,
        backgroundColor: AppColors.red,
        foregroundColor: Colors.white,
      ),
      AppButtonVariant.secondary => _buildOutlined(
        context,
        onPressed: resolvedOnPressed,
        child: child,
        iconSize: iconSize,
        backgroundColor: surface2,
        foregroundColor: textSecondary,
        borderColor: borderColor,
      ),
      AppButtonVariant.danger => _buildOutlined(
        context,
        onPressed: resolvedOnPressed,
        child: child,
        iconSize: iconSize,
        backgroundColor: AppColors.redSurface,
        foregroundColor: AppColors.redText,
        borderColor: AppColors.red.withValues(alpha: 0.3),
      ),
      AppButtonVariant.ghost => _buildText(
        context,
        onPressed: resolvedOnPressed,
        child: child,
        iconSize: iconSize,
      ),
    };

    if (!fullWidth) return button;
    return SizedBox(width: double.infinity, child: button);
  }

  ButtonStyle _baseStyle(BuildContext context) {
    final isSmall = size == AppButtonSize.sm;
    return ButtonStyle(
      padding: WidgetStateProperty.all(
        EdgeInsets.symmetric(
          horizontal: isSmall ? 10 : 14,
          vertical: isSmall ? 6 : 8,
        ),
      ),
      minimumSize: WidgetStateProperty.all(
        Size(0, isSmall ? _heightSm : _heightMd),
      ),
      textStyle: WidgetStateProperty.all(
        TextStyle(fontSize: isSmall ? 12 : 13, fontWeight: FontWeight.w500),
      ),
      shape: WidgetStateProperty.all(
        RoundedRectangleBorder(borderRadius: BorderRadius.circular(_radius)),
      ),
      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      visualDensity: VisualDensity.standard,
    );
  }

  Widget _buildFilled(
    BuildContext context, {
    required VoidCallback? onPressed,
    required Widget child,
    required double iconSize,
    required Color backgroundColor,
    required Color foregroundColor,
  }) {
    final style = _baseStyle(context).copyWith(
      backgroundColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.disabled)) {
          return backgroundColor.withValues(alpha: 0.45);
        }
        return backgroundColor;
      }),
      foregroundColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.disabled)) {
          return foregroundColor.withValues(alpha: 0.7);
        }
        return foregroundColor;
      }),
      elevation: WidgetStateProperty.all(0),
    );

    if (icon != null) {
      return FilledButton.icon(
        onPressed: onPressed,
        style: style,
        icon: Icon(icon, size: iconSize),
        label: child,
      );
    }

    return FilledButton(onPressed: onPressed, style: style, child: child);
  }

  Widget _buildOutlined(
    BuildContext context, {
    required VoidCallback? onPressed,
    required Widget child,
    required double iconSize,
    required Color backgroundColor,
    required Color foregroundColor,
    required Color borderColor,
  }) {
    final style = _baseStyle(context).copyWith(
      backgroundColor: WidgetStateProperty.all(backgroundColor),
      foregroundColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.disabled)) {
          return foregroundColor.withValues(alpha: 0.5);
        }
        return foregroundColor;
      }),
      side: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.disabled)) {
          return BorderSide(color: borderColor.withValues(alpha: 0.5));
        }
        return BorderSide(color: borderColor);
      }),
      elevation: WidgetStateProperty.all(0),
    );

    if (icon != null) {
      return OutlinedButton.icon(
        onPressed: onPressed,
        style: style,
        icon: Icon(icon, size: iconSize),
        label: child,
      );
    }
    return OutlinedButton(onPressed: onPressed, style: style, child: child);
  }

  Widget _buildText(
    BuildContext context, {
    required VoidCallback? onPressed,
    required Widget child,
    required double iconSize,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final fgColor = isDark
        ? AppColors.textSecondary
        : AppColors.lightTextSecondary;

    final style = _baseStyle(context).copyWith(
      padding: WidgetStateProperty.all(
        EdgeInsets.symmetric(
          horizontal: size == AppButtonSize.sm ? 10 : 12,
          vertical: size == AppButtonSize.sm ? 6 : 8,
        ),
      ),
      foregroundColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.disabled)) {
          return fgColor.withValues(alpha: 0.5);
        }
        if (states.contains(WidgetState.hovered)) {
          return isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;
        }
        return fgColor;
      }),
      overlayColor: WidgetStateProperty.all(
        isDark ? AppColors.navHoverBg : AppColors.lightNavHoverBg,
      ),
      elevation: WidgetStateProperty.all(0),
    );

    if (icon != null) {
      return TextButton.icon(
        onPressed: onPressed,
        style: style,
        icon: Icon(icon, size: iconSize),
        label: child,
      );
    }
    return TextButton(onPressed: onPressed, style: style, child: child);
  }
}
