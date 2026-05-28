import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import 'buttons/app_button.dart';

class LanguageSwitcherButton extends StatelessWidget {
  final bool compact;

  const LanguageSwitcherButton({super.key, this.compact = false});

  static const _locales = [Locale('en'), Locale('fr'), Locale('ar')];

  String _localeLabel(Locale locale) =>
      'i18n.locales.${locale.languageCode}'.tr();

  @override
  Widget build(BuildContext context) {
    final current = context.locale;

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
      child: IgnorePointer(
        child: compact
            ? IconButton(
                icon: const Icon(LucideIcons.languages),
                onPressed: null,
                tooltip: 'i18n.switcher.label'.tr(),
              )
            : AppButton.secondary(
                label: _localeLabel(current),
                icon: LucideIcons.languages,
                size: AppButtonSize.sm,
                trailing: const Icon(LucideIcons.chevronDown, size: 18),
                onPressed: null,
              ),
      ),
    );
  }
}
