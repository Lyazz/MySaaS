import 'package:flutter/material.dart';

class FormSelect<T> extends StatelessWidget {
  final String label;
  final T? value;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?>? onChanged;
  final String? Function(T?)? validator;
  final bool enabled;
  final String? hint;
  final TextStyle? hintStyle;
  final Color fillColor;
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
    this.fillColor = Colors.white,
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
    final defaultLabelStyle =
        Theme.of(context).textTheme.bodyMedium?.copyWith(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          color: const Color(0xFF374151), // Gray-700
        ) ??
        const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          color: Color(0xFF374151), // Gray-700
        );

    final outlineBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(borderRadius),
      borderSide: const BorderSide(color: Color(0xFFD1D5DB)), // Gray-300
    );
    final focusedOutlineBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(borderRadius),
      borderSide: const BorderSide(
        color: Color(0xFF14B8A6), // Teal-500
        width: 2,
      ),
    );
    final errorOutlineBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(borderRadius),
      borderSide: const BorderSide(color: Color(0xFFFCA5A5)), // Red-300
    );
    final focusedErrorOutlineBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(borderRadius),
      borderSide: const BorderSide(
        color: Color(0xFFEF4444), // Red-500
        width: 2,
      ),
    );

    final border = borderless ? InputBorder.none : outlineBorder;
    final enabledBorder = borderless ? InputBorder.none : outlineBorder;
    final focusedBorder = borderless ? InputBorder.none : focusedOutlineBorder;
    final errorBorder = borderless ? InputBorder.none : errorOutlineBorder;
    final focusedErrorBorder = borderless
        ? InputBorder.none
        : focusedErrorOutlineBorder;

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
                  style:
                      hintStyle ??
                      const TextStyle(
                        color: Color(0xFF9CA3AF), // Gray-400
                        fontSize: 14,
                      ),
                ),
          icon:
              icon ??
              const Icon(
                Icons.keyboard_arrow_down_rounded,
                size: 20,
                color: Color(0xFF6B7280), // Gray-500
              ),
          style:
              textStyle ??
              const TextStyle(
                fontSize: 14,
                color: Color(0xFF111827), // Gray-900
              ),
          isDense: isDense,
          dropdownColor: Colors.white,
          decoration: InputDecoration(
            prefixIcon: prefixIcon,
            contentPadding: contentPadding,
            border: border,
            enabledBorder: enabledBorder,
            focusedBorder: focusedBorder,
            errorBorder: errorBorder,
            focusedErrorBorder: focusedErrorBorder,
            filled: filled,
            fillColor: fillColor,
          ),
        ),
      ],
    );
  }
}
