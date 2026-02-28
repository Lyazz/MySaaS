import 'package:admin_app/widgets/language_switcher_button.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers/pump_localized_app.dart';

void main() {
  testWidgets('LanguageSwitcherButton changes locale', (tester) async {
    await tester.pumpWidget(
      buildLocalizedTestApp(
        home: const Scaffold(body: LanguageSwitcherButton()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('English'), findsOneWidget);

    await tester.tap(find.byType(PopupMenuButton<Locale>));
    await tester.pumpAndSettle();

    await tester.tap(find.text('French'));
    await tester.pumpAndSettle();

    expect(find.text('Français'), findsOneWidget);
  });
}
