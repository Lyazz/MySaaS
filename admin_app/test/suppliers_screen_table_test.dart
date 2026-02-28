import 'package:admin_app/models/supplier.dart';
import 'package:admin_app/providers/suppliers_provider.dart';
import 'package:admin_app/screens/suppliers_screen.dart';
import 'package:admin_app/widgets/buttons/app_button.dart';
import 'package:admin_app/widgets/responsive_paginated_table.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers/pump_localized_app.dart';

void main() {
  testWidgets('SuppliersScreen renders table edit/delete AppButtons', (
    WidgetTester tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1100, 800));
    addTearDown(() async {
      await tester.binding.setSurfaceSize(null);
    });

    final suppliers = [
      Supplier(
        id: 's1',
        name: 'ACME Supplies',
        email: 'acme@example.com',
        phone: '0550 000 123',
        address: 'Algiers',
      ),
    ];

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          suppliersProvider.overrideWith(
            () => SuppliersNotifier(
              SuppliersState(
                suppliers: suppliers,
                isLoading: false,
                error: null,
              ),
            ),
          ),
        ],
        child: buildLocalizedTestApp(home: const SuppliersScreen(autoFetch: false)),
      ),
    );
    await tester.pumpAndSettle();

    expect(
      find.byWidgetPredicate((w) => w is ResponsivePaginatedTable),
      findsOneWidget,
    );
    expect(find.widgetWithText(AppButton, 'Edit'), findsOneWidget);
    expect(find.widgetWithText(AppButton, 'Delete'), findsOneWidget);
  });
}
