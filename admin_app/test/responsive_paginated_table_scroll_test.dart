import 'package:admin_app/widgets/responsive_paginated_table.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'helpers/pump_localized_app.dart';

void main() {
  setUpAll(() async {
    await initializeDateFormatting('en');
  });

  testWidgets(
    'ResponsivePaginatedTable scrolls vertically within bounded height',
    (WidgetTester tester) async {
      await tester.binding.setSurfaceSize(const Size(800, 320));
      addTearDown(() async {
        await tester.binding.setSurfaceSize(null);
      });

      final items = List<int>.generate(50, (i) => i);

      await tester.pumpWidget(
        buildLocalizedTestApp(
          home: Scaffold(
            body: SizedBox(
              height: 240,
              child: ResponsivePaginatedTable<int>(
                items: items,
                minWidth: 400,
                rowsPerPageOptions: const [50],
                header: const Row(children: [Text('HEADER')]),
                rowBuilder: (context, item, index) => SizedBox(
                  height: 60,
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text('Row $index'),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
      expect(find.byType(ListView), findsOneWidget);

      final verticalScrollableFinder = find.descendant(
        of: find.byType(ListView),
        matching: find.byType(Scrollable),
      );
      expect(verticalScrollableFinder, findsOneWidget);
      final scrollableState = tester.state<ScrollableState>(
        verticalScrollableFinder,
      );
      expect(scrollableState.position.maxScrollExtent, greaterThan(0));

      await tester.dragUntilVisible(
        find.text('Row 49'),
        find.byType(ListView),
        const Offset(0, -300),
      );
      await tester.pump();
      expect(find.text('Row 49'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
