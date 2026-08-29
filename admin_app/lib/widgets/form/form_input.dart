import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../theme/app_theme.dart';

class FormInput extends StatelessWidget {
  final String label;
  final String? hint;
  final TextStyle? hintStyle;
  final TextEditingController controller;
  final String? Function(String?)? validator;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final int maxLines;
  final int? minLines;
  final bool enabled;
  final bool autofocus;
  final bool readOnly;
  final bool obscureText;
  final FocusNode? focusNode;
  final Iterable<String>? autofillHints;
  final Widget? prefixIcon;
  final Widget? suffixIcon;
  final String? prefixText;
  final Color? fillColor;
  final bool filled;
  final bool borderless;
  final double borderRadius;
  final EdgeInsets contentPadding;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final VoidCallback? onTap;
  final List<TextInputFormatter>? inputFormatters;
  final bool showLabel;
  final TextStyle? labelStyle;
  final TextStyle? textStyle;

  const FormInput({
    super.key,
    required this.label,
    required this.controller,
    this.hint,
    this.hintStyle,
    this.validator,
    this.keyboardType,
    this.textInputAction,
    this.maxLines = 1,
    this.minLines,
    this.enabled = true,
    this.autofocus = false,
    this.readOnly = false,
    this.obscureText = false,
    this.focusNode,
    this.autofillHints,
    this.prefixIcon,
    this.suffixIcon,
    this.prefixText,
    this.fillColor,
    this.filled = true,
    this.borderless = false,
    this.borderRadius = 6,
    this.contentPadding = const EdgeInsets.symmetric(
      horizontal: 12,
      vertical: 12,
    ),
    this.onChanged,
    this.onSubmitted,
    this.onTap,
    this.inputFormatters,
    this.showLabel = true,
    this.labelStyle,
    this.textStyle,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textTertiary = isDark
        ? AppColors.textTertiary
        : AppColors.lightTextTertiary;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final surface2 = isDark ? AppColors.surface2 : AppColors.lightSurface2;

    final resolvedFillColor = fillColor ?? surface2;

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
    final focusedBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(borderRadius),
      borderSide: BorderSide(
        color: Theme.of(context).colorScheme.primary,
        width: 1.5,
      ),
    );
    final errorBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(borderRadius),
      borderSide: const BorderSide(color: AppColors.red),
    );
    final focusedErrorBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(borderRadius),
      borderSide: const BorderSide(color: AppColors.red, width: 1.5),
    );

    final border = borderless ? InputBorder.none : outlineBorder;
    final enabledBorder = borderless ? InputBorder.none : outlineBorder;
    final resolvedFocusedBorder = borderless ? InputBorder.none : focusedBorder;
    final resolvedErrorBorder = borderless ? InputBorder.none : errorBorder;
    final resolvedFocusedErrorBorder = borderless
        ? InputBorder.none
        : focusedErrorBorder;

    final isMobile = MediaQuery.of(context).size.width < 800;
    final effectiveShowLabel = showLabel && !isMobile;
    final inlineLabel = (showLabel && isMobile) ? label : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (effectiveShowLabel) ...[
          Text(label, style: labelStyle ?? defaultLabelStyle),
          const SizedBox(height: 4),
        ],
        TextFormField(
          controller: controller,
          focusNode: focusNode,
          enabled: enabled,
          autofocus: autofocus,
          readOnly: readOnly,
          maxLines: maxLines,
          minLines: minLines,
          keyboardType: keyboardType,
          textInputAction: textInputAction,
          validator: validator,
          onChanged: onChanged,
          onFieldSubmitted: onSubmitted,
          onTap: onTap,
          obscureText: obscureText,
          autofillHints: autofillHints,
          inputFormatters: inputFormatters,
          textAlignVertical: TextAlignVertical.center,
          style: textStyle ?? TextStyle(fontSize: 14, color: textPrimary),
          decoration: InputDecoration(
            labelText: inlineLabel,
            hintText: hint,
            hintStyle:
                hintStyle ?? TextStyle(color: textTertiary, fontSize: 14),
            prefixIcon: prefixIcon,
            suffixIcon: suffixIcon,
            prefixText: prefixText,
            contentPadding: contentPadding,
            border: border,
            enabledBorder: enabledBorder,
            focusedBorder: resolvedFocusedBorder,
            errorBorder: resolvedErrorBorder,
            focusedErrorBorder: resolvedFocusedErrorBorder,
            filled: filled,
            fillColor: resolvedFillColor,
          ),
        ),
      ],
    );
  }
}
