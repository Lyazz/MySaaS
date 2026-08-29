import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:admin_app/screens/settings/store_settings_page.dart';

import '../helpers/pump_localized_app.dart';

void main() {
  testWidgets('StoreSettingsPage renders page shell', (tester) async {
    // A bare MaterialApp leaves easy_localization uninitialised, so every
    // `.tr()` renders its raw key and no user-facing string can be found.
    await tester.pumpWidget(
      ProviderScope(
        child: buildLocalizedTestApp(home: const StoreSettingsPage()),
      ),
    );
    await tester.pump();
    expect(
      find.byWidgetPredicate(
        (w) => w is Text && w.data?.toLowerCase() == 'store settings',
      ),
      findsAtLeastNWidgets(1),
    );
  });
}
