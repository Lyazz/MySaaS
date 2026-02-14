import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:admin_app/screens/supplier_form_screen.dart';

void main() {
  testWidgets('SupplierFormScreen renders correctly', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const ProviderScope(child: MaterialApp(home: SupplierFormScreen())),
    );

    expect(find.text('Create Supplier'), findsAtLeastNWidgets(1));
    expect(find.text('Supplier Name'), findsOneWidget);
    expect(find.text('Phone'), findsOneWidget);
    expect(find.text('Email'), findsOneWidget);
    expect(find.text('Address'), findsOneWidget);
    expect(find.text('Notes'), findsOneWidget);
  });
}
