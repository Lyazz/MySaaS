import 'package:admin_app/widgets/responsive_filter_bar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lucide_icons/lucide_icons.dart';

import 'helpers/pump_localized_app.dart';

void main() {
  testWidgets('desktop layout shows inline filters and clear button', (
    WidgetTester tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1200, 700));
    addTearDown(() async {
      await tester.binding.setSurfaceSize(null);
    });

    var cleared = false;

    await tester.pumpWidget(
      buildLocalizedTestApp(
        home: Scaffold(
          body: ResponsiveFilterBar(
            searchField: const TextField(),
            filters: const [Text('Status')],
            onClearFilters: () => cleared = true,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(ErrorWidget), findsNothing);
    expect(find.text('Status'), findsOneWidget);
    expect(find.byIcon(LucideIcons.x), findsOneWidget);

    await tester.tap(find.byIcon(LucideIcons.x));
    await tester.pump();

    expect(cleared, isTrue);
  });

  testWidgets('mobile layout opens filters modal and clears', (
    WidgetTester tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(500, 700));
    addTearDown(() async {
      await tester.binding.setSurfaceSize(null);
    });

    var cleared = false;

    await tester.pumpWidget(
      buildLocalizedTestApp(
        home: Scaffold(
          body: ResponsiveFilterBar(
            searchField: const TextField(),
            filters: const [Text('Status')],
            onClearFilters: () => cleared = true,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(ErrorWidget), findsNothing);
    expect(find.byIcon(LucideIcons.listFilter), findsOneWidget);

    await tester.tap(find.byIcon(LucideIcons.listFilter));
    await tester.pumpAndSettle();

    expect(find.text('Filters'), findsOneWidget);
    expect(find.text('Status'), findsOneWidget);
    expect(find.text('Clear'), findsOneWidget);

    await tester.tap(find.text('Clear'));
    await tester.pumpAndSettle();

    expect(cleared, isTrue);
    expect(find.text('Filters'), findsNothing);
  });
}
