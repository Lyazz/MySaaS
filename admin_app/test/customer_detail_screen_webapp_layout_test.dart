import 'package:admin_app/models/customer.dart';
import 'package:admin_app/models/customer_detail.dart';
import 'package:admin_app/models/customer_payment.dart';
import 'package:admin_app/models/customer_sale.dart';
import 'package:admin_app/providers/customers_provider.dart';
import 'package:admin_app/screens/customer_detail_screen.dart';
import 'package:admin_app/screens/customer_form_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'helpers/pump_localized_app.dart';

void main() {
  testWidgets('CustomerDetailScreen matches webapp layout and edit flow', (
    WidgetTester tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1100, 850));
    addTearDown(() async {
      await tester.binding.setSurfaceSize(null);
    });

    final detail = CustomerDetail(
      summary: Customer(
        id: 'c1',
        name: 'Ada Lovelace',
        phone: '0550 000 001',
        email: 'ada@example.com',
        address: 'Algiers',
        openingBalance: 1000,
        ordersCount: 0,
        totalSpent: 0,
        totalPaid: 0,
        currentBalance: 0,
      ),
      sales: [
        CustomerSale(
          id: 'sale_12345678',
          status: 'COMPLETED',
          totalAmount: 12000,
          createdAt: DateTime(2025, 1, 1, 10, 0),
        ),
      ],
      payments: [
        CustomerPayment(
          id: 'pay_1',
          amount: 5000,
          currency: 'DZD',
          method: 'CASH',
          reference: 'R-001',
          saleId: 'sale_12345678',
          createdAt: DateTime(2025, 1, 2, 9, 30),
        ),
      ],
    );

    final router = GoRouter(
      initialLocation: '/customers/c1',
      routes: [
        GoRoute(
          path: '/customers/:id',
          builder: (context, state) =>
              CustomerDetailScreen(customerId: state.pathParameters['id']!),
        ),
        GoRoute(
          path: '/customers/edit/:id',
          builder: (context, state) =>
              CustomerFormScreen(customerId: state.pathParameters['id']!),
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          customersProvider.overrideWith(
            () => CustomersNotifier(
              CustomersState(detailsById: {'c1': detail}),
            ),
          ),
        ],
        child: buildLocalizedTestApp(routerConfig: router),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Customers'), findsOneWidget);
    expect(find.text('Ada Lovelace'), findsOneWidget);
    expect(find.text('Edit'), findsOneWidget);

    expect(find.text('Sales'), findsNWidgets(2));
    expect(find.text('Total spent'), findsOneWidget);
    expect(find.text('Total paid'), findsOneWidget);
    expect(find.text('Balance'), findsOneWidget);

    expect(find.text('Payments'), findsOneWidget);

    await tester.tap(find.text('Edit'));
    await tester.pumpAndSettle();

    expect(find.byType(CustomerFormScreen), findsOneWidget);
    expect(find.byType(TextFormField), findsNWidgets(5));

    final fields =
        tester.widgetList<TextFormField>(find.byType(TextFormField)).toList();
    expect(fields.any((f) => f.enabled == false), isTrue);
  });
}
