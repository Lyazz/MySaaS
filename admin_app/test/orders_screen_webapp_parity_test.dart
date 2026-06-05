import 'package:admin_app/screens/orders_screen.dart';
import 'package:admin_app/widgets/admin_stat_card.dart';
import 'package:admin_app/widgets/ui_tab_filter.dart';
import 'package:admin_app/widgets/responsive_server_paginated_table.dart';
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

    testWidgets('Renders all required webapp parity components in header', (tester) async {
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
            child: const Scaffold(
              body: OrdersScreen(),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('admin.nav.export'), findsOneWidget);
      expect(find.byType(AppButton), findsWidgets);
      expect(find.byType(AdminStatCard), findsNWidgets(4));
      expect(find.text('admin.dashboard.stats.total'), findsOneWidget);
      expect(find.text('admin.dashboard.stats.pending'), findsWidgets);
      expect(find.text('admin.dashboard.stats.delivered'), findsWidgets);
      expect(find.text('admin.dashboard.stats.cancelled'), findsWidgets);
      expect(find.byType(UiTabFilter), findsOneWidget);
      expect(find.text('All orders'), findsWidgets);
      expect(find.text('Confirmed'), findsWidgets);
      expect(find.text('Shipped'), findsWidgets);
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
            child: const Scaffold(
              body: OrdersScreen(),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.byType(Checkbox), findsWidgets);
      expect(find.text('Order ID'.toUpperCase()), findsWidgets);
      expect(find.text('Customer'.toUpperCase()), findsWidgets);
      expect(find.text('Phone'.toUpperCase()), findsWidgets);
      expect(find.text('admin.pages.orders.index.table.delivery'.toUpperCase()), findsWidgets);
      expect(find.text('Total'.toUpperCase()), findsWidgets);
      expect(find.text('Status'.toUpperCase()), findsWidgets);
      expect(find.text('Date'.toUpperCase()), findsWidgets);
      expect(find.text('superAdmin.tenants.table.actions'.toUpperCase()), findsWidgets);
    });
  });
}
