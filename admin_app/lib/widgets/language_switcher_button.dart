import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../theme/app_theme.dart';

class LanguageSwitcherButton extends StatefulWidget {
  final bool compact;

  const LanguageSwitcherButton({super.key, this.compact = false});

  @override
  State<LanguageSwitcherButton> createState() => _LanguageSwitcherButtonState();
}

class _LanguageSwitcherButtonState extends State<LanguageSwitcherButton> {
  static const _locales = [Locale('en'), Locale('fr'), Locale('ar')];
  bool _hovered = false;

  String _localeLabel(Locale locale) =>
      'i18n.locales.${locale.languageCode}'.tr();

  @override
  Widget build(BuildContext context) {
    final current = context.locale;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSidebarBorder;
    final hoverBg = isDark ? AppColors.navHoverBg : AppColors.lightNavHoverBg;
    final color = isDark ? AppColors.textSecondary : AppColors.lightTextSecondary;
    final hoverColor = isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;

    return PopupMenuButton<Locale>(
      tooltip: 'i18n.switcher.label'.tr(),
      onSelected: (next) => context.setLocale(next),
      itemBuilder: (ctx) {
        return _locales.map((locale) {
          final isActive = locale.languageCode == current.languageCode;
          return PopupMenuItem<Locale>(
            value: locale,
            child: Row(
              children: [
                Expanded(child: Text(_localeLabel(locale))),
                if (isActive) const Icon(LucideIcons.check, size: 16),
              ],
            ),
          );
        }).toList();
      },
      child: MouseRegion(
        cursor: SystemMouseCursors.click,
        onEnter: (_) => setState(() => _hovered = true),
        onExit: (_) => setState(() => _hovered = false),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: widget.compact
              ? const EdgeInsets.all(8)
              : const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: _hovered ? hoverBg : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: borderColor),
          ),
          child: widget.compact
              ? Icon(
                  LucideIcons.languages,
                  size: 16,
                  color: _hovered ? hoverColor : color,
                )
              : Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      LucideIcons.languages,
                      size: 14,
                      color: _hovered ? hoverColor : color,
                    ),
                    const SizedBox(width: 6),
                    Icon(
                      LucideIcons.chevronDown,
                      size: 14,
                      color: _hovered ? hoverColor : color,
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
