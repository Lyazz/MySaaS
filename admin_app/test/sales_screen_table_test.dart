import 'package:admin_app/models/sale.dart';
import 'package:admin_app/providers/sales_provider.dart';
import 'package:admin_app/screens/sales_screen.dart';
import 'package:admin_app/widgets/buttons/app_button.dart';
import 'package:admin_app/widgets/responsive_server_paginated_table.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'helpers/pump_localized_app.dart';

void main() {
  setUpAll(() async {
    await initializeDateFormatting('en');
  });

  testWidgets('SalesScreen renders ResponsiveServerPaginatedTable', (
    WidgetTester tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1000, 700));
    addTearDown(() async {
      await tester.binding.setSurfaceSize(null);
    });

    final initial = SalesState(
      isLoading: false,
      error: null,
      page: 1,
      totalPages: 2,
      total: 50,
      sales: [
        Sale(
          id: 'order_123456789',
          customerName: 'Ahmed',
          customerPhone: '0550000000',
          totalAmount: 1200,
          status: 'COMPLETED',
          updatedAt: DateTime(2025, 1, 1),
          type: 'ORDER',
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [salesProvider.overrideWith(() => SalesNotifier(initial))],
        child: buildLocalizedTestApp(home: const SalesScreen(autoFetch: false)),
      ),
    );
    await tester.pumpAndSettle();

    expect(
      find.byWidgetPredicate((w) => w is ResponsiveServerPaginatedTable),
      findsOneWidget,
    );
    expect(find.text('Sale ID'), findsOneWidget);
    expect(find.text('Page 1 of 2'), findsOneWidget);
    expect(find.byTooltip('View order'), findsOneWidget);
  });
}
