import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../lib/screens/order_create_screen.dart';

void main() {
  testWidgets('OrderCreateScreen renders', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: OrderCreateScreen()),
      ),
    );
    await tester.pump();
    expect(find.byType(OrderCreateScreen), findsOneWidget);
  });
}
