import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

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
  final Color fillColor;
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
    this.fillColor = Colors.white,
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
      borderSide: const BorderSide(
        color: Color(0xFFD1D5DB), // Gray-300
      ),
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
      borderSide: const BorderSide(
        color: Color(0xFFFCA5A5), // Red-300
      ),
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

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (showLabel) ...[
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
          style:
              textStyle ??
              const TextStyle(
                fontSize: 14,
                color: Color(0xFF111827), // Gray-900
              ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle:
                hintStyle ??
                const TextStyle(
                  color: Color(0xFF9CA3AF), // Gray-400
                  fontSize: 14,
                ),
            prefixIcon: prefixIcon,
            suffixIcon: suffixIcon,
            prefixText: prefixText,
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
