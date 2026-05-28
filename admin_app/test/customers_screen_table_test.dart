import 'package:admin_app/models/customer.dart';
import 'package:admin_app/providers/customers_provider.dart';
import 'package:admin_app/screens/customers_screen.dart';
import 'package:admin_app/widgets/buttons/app_button.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'helpers/pump_localized_app.dart';

void main() {
  testWidgets('CustomersScreen renders table with View button', (
    WidgetTester tester,
  ) async {
    await initializeDateFormatting();
    await tester.binding.setSurfaceSize(const Size(1100, 800));
    addTearDown(() async {
      await tester.binding.setSurfaceSize(null);
    });

    final customers = [
      Customer(
        id: 'c1',
        name: 'Ada Lovelace',
        phone: '0550 000 001',
        email: 'ada@example.com',
        address: 'Algiers',
        ordersCount: 3,
        totalSpent: 12000,
        totalPaid: 8000,
        currentBalance: 4000,
        lastOrderAt: DateTime(2025, 1, 15),
      ),
    ];

    final initialState = CustomersState(
      customers: customers,
      isLoading: false,
      total: 1,
      page: 1,
      totalPages: 1,
      limit: 25,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          customersProvider.overrideWith(() => CustomersNotifier(initialState)),
        ],
        child: buildLocalizedTestApp(
          home: const CustomersScreen(autoFetch: false),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.pump(const Duration(milliseconds: 50));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.byType(CustomersScreen), findsOneWidget);
    final scope = ProviderScope.containerOf(
      tester.element(find.byType(CustomersScreen)),
    );
    final state = scope.read(customersProvider);
    expect(state.customers, hasLength(1));
    expect(state.customers.first.name, 'Ada Lovelace');

    expect(find.text('Ada Lovelace'), findsOneWidget);
    expect(find.widgetWithText(AppButton, 'View'), findsOneWidget);
  });
}
