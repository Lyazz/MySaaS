import 'package:admin_app/models/cash.dart';
import 'package:admin_app/providers/cash_provider.dart';
import 'package:admin_app/screens/cash_screen.dart';
import 'package:admin_app/widgets/responsive_paginated_table.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers/pump_localized_app.dart';

void main() {
  testWidgets('CashScreen uses ResponsivePaginatedTable on desktop tabs', (
    WidgetTester tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1200, 900));
    addTearDown(() async {
      await tester.binding.setSurfaceSize(null);
    });

    final now = DateTime(2025, 1, 1, 12);
    final cashbox = CashboxSummary(
      id: 'cashbox_12345678',
      name: 'Main cashbox',
      isActive: true,
      openSession: CashOpenSession(
        id: 'session_12345678',
        openedAt: now,
        openingFloat: 0,
      ),
    );

    final initial = CashState(
      cashboxes: [cashbox],
      cashUsers: [
        CashUserSummary(
          id: 'u1',
          email: 'cashier@tenant.com',
          role: 'staff',
          isActive: true,
        ),
      ],
      transactions: [
        CashTransactionSummary(
          id: 'tx_12345678',
          cashboxId: 'cashbox_12345678',
          sessionId: 'session_12345678',
          direction: 'IN',
          type: 'SALE_PAYMENT',
          amount: 1000,
          currency: 'DZD',
          method: 'CASH',
          createdByUserId: 'u1',
          createdAt: now,
        ),
      ],
      sessions: [
        CashSessionSummary(
          id: 'session_12345678',
          cashboxId: 'cashbox_12345678',
          status: 'OPEN',
          openingFloat: 0,
          openedAt: now,
          openedByUserId: 'u1',
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [cashProvider.overrideWith(() => CashNotifier(initial))],
        child: buildLocalizedTestApp(home: const CashScreen(autoFetch: false)),
      ),
    );

    await tester.pumpAndSettle();

    await tester.dragUntilVisible(
      find.text('DATE'),
      find.byType(Scrollable).first,
      const Offset(0, -300),
    );
    await tester.pumpAndSettle();

    expect(
      find.byWidgetPredicate((w) => w is ResponsivePaginatedTable),
      findsOneWidget,
    );
    expect(find.text('DATE'), findsOneWidget);

    await tester.tap(find.text('Cash sessions'));
    await tester.pumpAndSettle();

    await tester.dragUntilVisible(
      find.text('CASHBOX'),
      find.byType(Scrollable).first,
      const Offset(0, -300),
    );
    await tester.pumpAndSettle();

    expect(
      find.byWidgetPredicate((w) => w is ResponsivePaginatedTable),
      findsOneWidget,
    );
    expect(find.text('CASHBOX'), findsOneWidget);
  });
}
