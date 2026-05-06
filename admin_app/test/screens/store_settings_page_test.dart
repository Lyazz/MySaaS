import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:admin_app/screens/settings/store_settings_page.dart';

void main() {
  testWidgets('StoreSettingsPage renders General tab', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: StoreSettingsPage()),
      ),
    );
    await tester.pump();
    expect(find.text('General'), findsOneWidget);
  });
}
