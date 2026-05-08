import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

class FormSelect<T> extends StatelessWidget {
  final String label;
  final T? value;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?>? onChanged;
  final String? Function(T?)? validator;
  final bool enabled;
  final String? hint;
  final TextStyle? hintStyle;
  final Color? fillColor;
  final bool filled;
  final bool borderless;
  final double borderRadius;
  final EdgeInsets contentPadding;
  final Widget? prefixIcon;
  final Widget? icon;
  final bool showLabel;
  final TextStyle? labelStyle;
  final TextStyle? textStyle;
  final bool isDense;

  const FormSelect({
    super.key,
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
    this.validator,
    this.enabled = true,
    this.hint,
    this.hintStyle,
    this.fillColor,
    this.filled = true,
    this.borderless = false,
    this.borderRadius = 6,
    this.contentPadding = const EdgeInsets.symmetric(
      horizontal: 12,
      vertical: 12,
    ),
    this.prefixIcon,
    this.icon,
    this.showLabel = true,
    this.labelStyle,
    this.textStyle,
    this.isDense = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textPrimary = isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;
    final textTertiary = isDark ? AppColors.textTertiary : AppColors.lightTextTertiary;
    final borderColor = isDark ? AppColors.surfaceBorder : AppColors.lightSurfaceBorder;
    final surface2 = isDark ? AppColors.surface2 : AppColors.lightSurface2;
    final surface1 = isDark ? AppColors.surface1 : AppColors.lightSurface1;

    final resolvedFillColor = fillColor ?? surface2;
    final resolvedDropdownColor = surface1;

    final defaultLabelStyle = TextStyle(
      fontSize: 12,
      fontWeight: FontWeight.w600,
      color: textTertiary,
      letterSpacing: 0.05,
    );

    final outlineBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(borderRadius),
      borderSide: BorderSide(color: borderColor),
    );
    final focusedOutlineBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(borderRadius),
      borderSide: BorderSide(color: AppColors.brand, width: 1.5),
    );
    final errorOutlineBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(borderRadius),
      borderSide: const BorderSide(color: AppColors.red),
    );
    final focusedErrorOutlineBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(borderRadius),
      borderSide: const BorderSide(color: AppColors.red, width: 1.5),
    );

    final border = borderless ? InputBorder.none : outlineBorder;
    final enabledBorder = borderless ? InputBorder.none : outlineBorder;
    final focusedBorder = borderless ? InputBorder.none : focusedOutlineBorder;
    final errorBorder = borderless ? InputBorder.none : errorOutlineBorder;
    final focusedErrorBorder =
        borderless ? InputBorder.none : focusedErrorOutlineBorder;

    final safeInitialValue =
        (value != null && items.any((it) => it.value == value)) ? value : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (showLabel) ...[
          Text(label, style: labelStyle ?? defaultLabelStyle),
          const SizedBox(height: 4),
        ],
        DropdownButtonFormField<T>(
          initialValue: safeInitialValue,
          items: items,
          onChanged: enabled ? onChanged : null,
          validator: validator,
          isExpanded: true,
          hint: hint == null
              ? null
              : Text(
                  hint!,
                  style: hintStyle ?? TextStyle(color: textTertiary, fontSize: 14),
                ),
          icon: icon ??
              Icon(
                Icons.keyboard_arrow_down_rounded,
                size: 20,
                color: textTertiary,
              ),
          style: textStyle ?? TextStyle(fontSize: 14, color: textPrimary),
          isDense: isDense,
          dropdownColor: resolvedDropdownColor,
          decoration: InputDecoration(
            prefixIcon: prefixIcon,
            contentPadding: contentPadding,
            border: border,
            enabledBorder: enabledBorder,
            focusedBorder: focusedBorder,
            errorBorder: errorBorder,
            focusedErrorBorder: focusedErrorBorder,
            filled: filled,
            fillColor: resolvedFillColor,
          ),
        ),
      ],
    );
  }
}
