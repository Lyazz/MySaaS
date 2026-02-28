import 'package:admin_app/widgets/responsive_server_paginated_table.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:lucide_icons/lucide_icons.dart';

import 'helpers/pump_localized_app.dart';

void main() {
  setUpAll(() async {
    await initializeDateFormatting('en');
  });

  testWidgets('desktop footer shows range and pagination controls', (
    tester,
  ) async {
    int? tappedPage;

    await tester.pumpWidget(
      buildLocalizedTestApp(
        home: Scaffold(
          body: SizedBox(
            width: 900,
            child: ResponsiveServerPaginatedTable<int>(
              items: List.generate(3, (i) => i),
              header: const Row(children: [Text('Header')]),
              rowBuilder: (context, item, index) => Text('Row $item'),
              page: 1,
              totalPages: 3,
              totalItems: 60,
              itemsPerPage: 25,
              onPageChanged: (page) => tappedPage = page,
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Showing 1 to 25 of 60 results'), findsOneWidget);
    expect(find.text('Page 1 of 3'), findsOneWidget);

    await tester.tap(find.byIcon(LucideIcons.chevronRight));
    await tester.pump();

    expect(tappedPage, 2);
  });

  testWidgets('mobile footer shows page-of and chevrons', (tester) async {
    int? tappedPage;

    await tester.pumpWidget(
      buildLocalizedTestApp(
        home: Scaffold(
          body: SizedBox(
            width: 520,
            child: ResponsiveServerPaginatedTable<int>(
              items: List.generate(3, (i) => i),
              header: const Row(children: [Text('Header')]),
              rowBuilder: (context, item, index) => Text('Row $item'),
              page: 1,
              totalPages: 3,
              totalItems: 60,
              itemsPerPage: 25,
              onPageChanged: (page) => tappedPage = page,
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Page 1 of 3'), findsOneWidget);
    expect(find.text('Showing 1 to 25 of 60 results'), findsOneWidget);

    await tester.tap(find.byIcon(LucideIcons.chevronRight));
    await tester.pump();

    expect(tappedPage, 2);
  });
}
