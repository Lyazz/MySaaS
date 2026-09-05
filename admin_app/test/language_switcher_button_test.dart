import 'package:admin_app/widgets/language_switcher_button.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import 'helpers/pump_localized_app.dart';

void main() {
  testWidgets('LanguageSwitcherButton changes locale', (tester) async {
    await tester.pumpWidget(
      buildLocalizedTestApp(
        home: const Scaffold(body: LanguageSwitcherButton()),
      ),
    );
    await tester.pumpAndSettle();

    // The trigger renders icons only — the locale names live in the menu, so
    // the current language is asserted there, by which entry carries the check
    // mark, rather than on the closed button.
    await tester.tap(find.byType(PopupMenuButton<Locale>));
    await tester.pumpAndSettle();

    expect(find.text('English'), findsOneWidget);
    expect(
      find.descendant(
        of: find.ancestor(
          of: find.text('English'),
          matching: find.byType(PopupMenuItem<Locale>),
        ),
        matching: find.byIcon(LucideIcons.check),
      ),
      findsOneWidget,
    );

    await tester.tap(find.text('French'));
    await tester.pumpAndSettle();

    // Reopened in the new locale: the labels are themselves translated, so
    // French now reads as "Français" and holds the check.
    await tester.tap(find.byType(PopupMenuButton<Locale>));
    await tester.pumpAndSettle();

    expect(find.text('Français'), findsOneWidget);
    expect(
      find.descendant(
        of: find.ancestor(
          of: find.text('Français'),
          matching: find.byType(PopupMenuItem<Locale>),
        ),
        matching: find.byIcon(LucideIcons.check),
      ),
      findsOneWidget,
    );
  });
}
