import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../providers/settings_provider.dart';
import 'auth_palette.dart';

/// Scales its child slightly while a pointer hovers over it (desktop polish).
class HoverScale extends StatefulWidget {
  final Widget child;
  const HoverScale({super.key, required this.child});

  @override
  State<HoverScale> createState() => _HoverScaleState();
}

class _HoverScaleState extends State<HoverScale> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: AnimatedScale(
        scale: _isHovered ? 1.03 : 1.0,
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOutQuart,
        child: widget.child,
      ),
    );
  }
}

/// Swekly wordmark used in the top-left of every auth card.
class AuthLogoMark extends StatelessWidget {
  final AuthPalette palette;
  const AuthLogoMark({super.key, required this.palette});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(
            color: palette.brand,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(LucideIcons.store, size: 18, color: palette.onBrand),
        ),
        const SizedBox(width: 10),
        Text(
          'app.swekly'.tr(),
          style: GoogleFonts.dmSans(
            color: palette.primaryText,
            fontSize: 18,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.3,
          ),
        ),
      ],
    );
  }
}

/// Small pill used as an eyebrow on the marketing panels.
class AuthBadge extends StatelessWidget {
  final AuthPalette palette;
  final String label;
  const AuthBadge({super.key, required this.palette, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: palette.glassBackground,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: palette.cardBorder),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: palette.brand,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 7),
          Text(
            label,
            style: GoogleFonts.dmSans(
              color: palette.secondaryText,
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 1.2,
            ),
          ),
        ],
      ),
    );
  }
}

/// Light/dark toggle shown in the auth card header.
class AuthThemeToggle extends ConsumerWidget {
  final AuthPalette palette;
  const AuthThemeToggle({super.key, required this.palette});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(settingsProvider).themeMode;
    final isDark =
        mode == ThemeMode.dark ||
        (mode == ThemeMode.system &&
            MediaQuery.platformBrightnessOf(context) == Brightness.dark);

    return Tooltip(
      message: isDark
          ? 'auth.common.switchToLight'.tr()
          : 'auth.common.switchToDark'.tr(),
      child: InkWell(
        onTap: () => ref.read(settingsProvider.notifier).toggleTheme(),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: palette.glassBackground,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: palette.cardBorder),
          ),
          child: Icon(
            isDark ? LucideIcons.sun : LucideIcons.moon,
            size: 18,
            color: palette.primaryText,
          ),
        ),
      ),
    );
  }
}

/// Labelled text field used across the auth forms.
///
/// Handles the password reveal toggle, so no caller has to reimplement it.
class AuthTextField extends StatefulWidget {
  final AuthPalette palette;
  final String label;
  final String hint;
  final TextEditingController controller;
  final TextInputType? keyboardType;
  final bool obscureText;
  final Widget? trailing;
  final String? Function(String?)? validator;
  final TextInputAction textInputAction;
  final ValueChanged<String>? onFieldSubmitted;
  final ValueChanged<String>? onChanged;
  final Iterable<String>? autofillHints;
  final List<TextInputFormatter>? inputFormatters;
  final FocusNode? focusNode;
  final bool enabled;
  final int? maxLength;
  final TextCapitalization textCapitalization;

  const AuthTextField({
    super.key,
    required this.palette,
    required this.label,
    required this.hint,
    required this.controller,
    this.keyboardType,
    this.obscureText = false,
    this.trailing,
    this.validator,
    this.textInputAction = TextInputAction.next,
    this.onFieldSubmitted,
    this.onChanged,
    this.autofillHints,
    this.inputFormatters,
    this.focusNode,
    this.enabled = true,
    this.maxLength,
    this.textCapitalization = TextCapitalization.none,
  });

  @override
  State<AuthTextField> createState() => _AuthTextFieldState();
}

class _AuthTextFieldState extends State<AuthTextField> {
  late bool _obscured = widget.obscureText;

  @override
  void didUpdateWidget(covariant AuthTextField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.obscureText != widget.obscureText) {
      _obscured = widget.obscureText;
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = widget.palette;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Flexible(
              child: Text(
                widget.label,
                style: GoogleFonts.dmSans(
                  color: palette.secondaryText,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.1,
                ),
              ),
            ),
            if (widget.trailing != null) widget.trailing!,
          ],
        ),
        const SizedBox(height: 7),
        TextFormField(
          controller: widget.controller,
          focusNode: widget.focusNode,
          keyboardType: widget.keyboardType,
          obscureText: _obscured,
          validator: widget.validator,
          textInputAction: widget.textInputAction,
          onFieldSubmitted: widget.onFieldSubmitted,
          onChanged: widget.onChanged,
          autofillHints: widget.autofillHints,
          inputFormatters: widget.inputFormatters,
          enabled: widget.enabled,
          maxLength: widget.maxLength,
          textCapitalization: widget.textCapitalization,
          style: GoogleFonts.dmSans(
            color: palette.primaryText,
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
          decoration: InputDecoration(
            hintText: widget.hint,
            counterText: '',
            hintStyle: GoogleFonts.dmSans(
              color: palette.mutedText,
              fontSize: 14,
            ),
            filled: true,
            fillColor: palette.inputBackground,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 14,
              vertical: 12,
            ),
            suffixIcon: widget.obscureText
                ? IconButton(
                    tooltip: _obscured
                        ? 'auth.common.showPassword'.tr()
                        : 'auth.common.hidePassword'.tr(),
                    icon: Icon(
                      _obscured ? LucideIcons.eye : LucideIcons.eyeOff,
                      size: 18,
                      color: palette.secondaryText,
                    ),
                    onPressed: () => setState(() => _obscured = !_obscured),
                  )
                : null,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: palette.inputBorder),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: palette.inputBorder),
            ),
            disabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: palette.inputBorder),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: palette.brand, width: 1.3),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AuthPalette.danger),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(
                color: AuthPalette.danger,
                width: 1.3,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// Primary call-to-action button for the auth forms.
class AuthSubmitButton extends StatelessWidget {
  final AuthPalette palette;
  final String label;
  final bool loading;
  final VoidCallback? onTap;
  final IconData? icon;

  const AuthSubmitButton({
    super.key,
    required this.palette,
    required this.label,
    required this.loading,
    required this.onTap,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final enabled = onTap != null;

    return HoverScale(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(13),
          child: Ink(
            height: 46,
            decoration: BoxDecoration(
              color: enabled
                  ? palette.brand
                  : palette.brand.withValues(alpha: 0.55),
              borderRadius: BorderRadius.circular(13),
              border: Border.all(color: palette.brand.withValues(alpha: 0.5)),
              boxShadow: [
                BoxShadow(
                  color: palette.brand.withValues(alpha: 0.28),
                  blurRadius: 26,
                  spreadRadius: -8,
                ),
              ],
            ),
            child: Center(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (loading) ...[
                    SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: palette.onBrand,
                      ),
                    ),
                    const SizedBox(width: 8),
                  ],
                  Flexible(
                    child: Text(
                      label,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.dmSans(
                        color: palette.onBrand,
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                  ),
                  if (!loading && icon != null) ...[
                    const SizedBox(width: 8),
                    Icon(icon, size: 16, color: palette.onBrand),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Inline error banner shown above the submit button.
class AuthErrorBanner extends StatelessWidget {
  final String message;
  const AuthErrorBanner({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('auth-error-banner'),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AuthPalette.dangerBorder),
        color: AuthPalette.dangerBackground,
      ),
      child: Row(
        children: [
          const Icon(
            LucideIcons.alertCircle,
            color: AuthPalette.dangerText,
            size: 18,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: GoogleFonts.dmSans(
                color: AuthPalette.dangerText,
                fontWeight: FontWeight.w500,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Placeholder social provider button.
///
/// Social sign-in is not implemented on the backend yet, so — exactly like the
/// web login page — these render as disabled affordances instead of buttons
/// that silently do nothing.
class AuthSocialButton extends StatelessWidget {
  final AuthPalette palette;
  final IconData icon;
  final String label;

  const AuthSocialButton({
    super.key,
    required this.palette,
    required this.icon,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: 'auth.social.comingSoon'.tr(),
      child: Opacity(
        opacity: 0.6,
        child: Container(
          height: 40,
          decoration: BoxDecoration(
            color: palette.glassBackground,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: palette.cardBorder),
          ),
          child: Center(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 16, color: palette.secondaryText),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    label,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.dmSans(
                      color: palette.secondaryText,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
