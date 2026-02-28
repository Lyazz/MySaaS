import 'dart:ui';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:admin_app/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.binding.setSurfaceSize(const Size(1200, 900));
    addTearDown(() async {
      await tester.binding.setSurfaceSize(null);
    });

    // Build our app and trigger a frame.
    await tester.pumpWidget(
      EasyLocalization(
        supportedLocales: const [Locale('en'), Locale('fr'), Locale('ar')],
        path: 'assets/translations',
        fallbackLocale: const Locale('en'),
        startLocale: const Locale('en'),
        useOnlyLangCode: true,
        child: const ProviderScope(child: AdminApp()),
      ),
    );
    await tester.pumpAndSettle();

    // Verify that the dashboard placeholder or title is present.
    // Since we start at '/', we expect DashboardScreen.
    // DashboardScreen has text 'Welcome back, SuperStore' (unless mocked differently).
    // Let's just check if it builds without crashing for now.
    expect(find.byType(AdminApp), findsOneWidget);
  });
}
