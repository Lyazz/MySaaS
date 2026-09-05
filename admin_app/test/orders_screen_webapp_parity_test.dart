import 'package:admin_app/screens/orders_screen.dart';
import 'package:admin_app/widgets/form/form_select.dart';
import 'package:admin_app/widgets/buttons/app_button.dart';
import 'package:admin_app/models/order.dart';
import 'package:admin_app/providers/orders_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'helpers/pump_localized_app.dart';

class _TestOrdersNotifier extends OrdersNotifier {
  final OrdersState _initialState;

  _TestOrdersNotifier(this._initialState);

  @override
  OrdersState build() => _initialState;

  @override
  Future<void> fetchOrders({
    String? status,
    String? search,
    String? dateRange,
    DateTime? startDate,
    DateTime? endDate,
    int? page,
    int? limit,
  }) async {}
}

void main() {
  group('OrdersScreen Webapp Parity UI Tests', () {
    final mockOrder = Order(
      id: 'ord-1234567890',
      customerName: 'John Doe',
      customerPhone: '+123456789',
      customerAddress: '123 Test St',
      totalAmount: 1000.0,
      status: 'PENDING',
      createdAt: DateTime.now(),
      deliveryMode: 'Home delivery',
      shippingProvider: 'Yalidine',
    );

    testWidgets('Renders all required webapp parity components in header', (
      tester,
    ) async {
      tester.binding.window.physicalSizeTestValue = const Size(1920, 1080);
      tester.binding.window.devicePixelRatioTestValue = 1.0;
      addTearDown(tester.binding.window.clearPhysicalSizeTestValue);

      await tester.pumpWidget(
        buildLocalizedTestApp(
          home: ProviderScope(
            overrides: [
              ordersProvider.overrideWith(
                () => _TestOrdersNotifier(
                  OrdersState(orders: [mockOrder], total: 1, isLoading: false),
                ),
              ),
            ],
            child: const Scaffold(body: OrdersScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Translated labels, not raw keys: these assertions were pinned to the
      // `admin.nav.*` / `admin.dashboard.*` keys, which only match when
      // easy_localization has failed to load.
      expect(find.text('Export'), findsOneWidget);
      expect(find.byType(AppButton), findsWidgets);
      // The four stats are drawn by a private `_StatChip`, so they are asserted
      // by what they render — one string carrying the count and the label
      // ("1 Total") — rather than by a type the test cannot name.
      for (final label in const [
        'Total',
        'Pending',
        'Delivered',
        'Cancelled',
      ]) {
        expect(
          find.byWidgetPredicate(
            (w) =>
                w is Text &&
                w.data != null &&
                RegExp(r'^\d+ ' + label + r'$').hasMatch(w.data!),
          ),
          findsOneWidget,
          reason: 'stat chip for $label',
        );
      }
      // The status filter is a dropdown, not a tab strip: `UiTabFilter` has not
      // been on this screen since the filter bar was reworked.
      expect(find.byType(FormSelect<String>), findsWidgets);
      expect(find.text('All orders'), findsWidgets);
      // The remaining statuses are dropdown items — in the tree, but off-stage
      // until the menu is opened.
      expect(find.text('Confirmed', skipOffstage: false), findsWidgets);
      expect(find.text('Shipped', skipOffstage: false), findsWidgets);
    });

    testWidgets('Table has required parity columns', (tester) async {
      tester.binding.window.physicalSizeTestValue = const Size(1920, 1080);
      tester.binding.window.devicePixelRatioTestValue = 1.0;
      addTearDown(tester.binding.window.clearPhysicalSizeTestValue);

      await tester.pumpWidget(
        buildLocalizedTestApp(
          home: ProviderScope(
            overrides: [
              ordersProvider.overrideWith(
                () => _TestOrdersNotifier(
                  OrdersState(orders: [mockOrder], total: 1, isLoading: false),
                ),
              ),
            ],
            child: const Scaffold(body: OrdersScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.byType(Checkbox), findsWidgets);
      // Matched case-insensitively on the whole label: the column headers are
      // styled uppercase, which is presentation this test has no stake in.
      for (final column in const [
        'Order ID',
        'Customer',
        'Phone',
        'Delivery',
        'Total',
        'Status',
        'Date',
        'Actions',
      ]) {
        expect(
          find.byWidgetPredicate(
            (w) => w is Text && w.data?.toLowerCase() == column.toLowerCase(),
          ),
          findsWidgets,
          reason: 'column header $column',
        );
      }
    });
  });
}
