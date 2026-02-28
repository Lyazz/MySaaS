import 'package:flutter/material.dart';

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
  static const double _heightMd = 40;
  static const double _heightSm = 32;

  @override
  Widget build(BuildContext context) {
    final iconSize = size == AppButtonSize.sm ? 16.0 : 20.0;
    final Widget child = loading
        ? const SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(strokeWidth: 2),
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

    final button = switch (variant) {
      AppButtonVariant.primary => _buildFilled(
        context,
        onPressed: resolvedOnPressed,
        child: child,
        iconSize: iconSize,
        backgroundColor: const Color(0xFF0D9488), // Teal-600
        foregroundColor: Colors.white,
      ),
      AppButtonVariant.neutral => _buildFilled(
        context,
        onPressed: resolvedOnPressed,
        child: child,
        iconSize: iconSize,
        backgroundColor: const Color(0xFF0F172A), // Slate-900
        foregroundColor: Colors.white,
      ),
      AppButtonVariant.destructive => _buildFilled(
        context,
        onPressed: resolvedOnPressed,
        child: child,
        iconSize: iconSize,
        backgroundColor: const Color(0xFFEF4444), // Red-500
        foregroundColor: Colors.white,
      ),
      AppButtonVariant.secondary => _buildOutlined(
        context,
        onPressed: resolvedOnPressed,
        child: child,
        iconSize: iconSize,
      ),
      AppButtonVariant.danger => _buildOutlined(
        context,
        onPressed: resolvedOnPressed,
        child: child,
        iconSize: iconSize,
        backgroundColor: const Color(0xFFFEF2F2), // Red-50
        foregroundColor: const Color(0xFFB91C1C), // Red-700
        borderColor: const Color(0xFFFECACA), // Red-200
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
          horizontal: isSmall ? 12 : 16,
          vertical: isSmall ? 8 : 10,
        ),
      ),
      minimumSize: WidgetStateProperty.all(
        Size(0, isSmall ? _heightSm : _heightMd),
      ),
      textStyle: WidgetStateProperty.all(
        TextStyle(fontSize: isSmall ? 12 : 14, fontWeight: FontWeight.w500),
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
      elevation: WidgetStateProperty.all(1),
      shadowColor: WidgetStateProperty.all(
        Colors.black.withValues(alpha: 0.08),
      ),
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
    Color backgroundColor = Colors.white,
    Color foregroundColor = const Color(0xFF334155), // Slate-700
    Color borderColor = const Color(0xFFE2E8F0), // Slate-200
  }) {
    final style = _baseStyle(context).copyWith(
      backgroundColor: WidgetStateProperty.all(backgroundColor),
      foregroundColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.disabled)) {
          return const Color(0xFF94A3B8); // Slate-400
        }
        return foregroundColor;
      }),
      side: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.disabled)) {
          return const BorderSide(color: Color(0xFFE2E8F0)); // Slate-200
        }
        return BorderSide(color: borderColor);
      }),
    );

    final button = icon != null
        ? OutlinedButton.icon(
            onPressed: onPressed,
            style: style,
            icon: Icon(icon, size: iconSize),
            label: child,
          )
        : OutlinedButton(onPressed: onPressed, style: style, child: child);

    return Material(
      color: Colors.transparent,
      elevation: 1,
      shadowColor: Colors.black.withValues(alpha: 0.08),
      borderRadius: BorderRadius.circular(_radius),
      child: button,
    );
  }

  Widget _buildText(
    BuildContext context, {
    required VoidCallback? onPressed,
    required Widget child,
    required double iconSize,
  }) {
    final style = _baseStyle(context).copyWith(
      padding: WidgetStateProperty.all(
        EdgeInsets.symmetric(
          horizontal: size == AppButtonSize.sm ? 10 : 12,
          vertical: size == AppButtonSize.sm ? 8 : 10,
        ),
      ),
      foregroundColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.disabled)) {
          return const Color(0xFF94A3B8); // Slate-400
        }
        return const Color(0xFF0D9488); // Teal-600
      }),
      overlayColor: WidgetStateProperty.all(
        const Color(0xFF0D9488).withValues(alpha: 0.08),
      ),
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
