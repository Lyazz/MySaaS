import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:admin_app/screens/supplier_form_screen.dart';

import 'helpers/pump_localized_app.dart';

void main() {
  testWidgets('SupplierFormScreen renders correctly', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(child: buildLocalizedTestApp(home: const SupplierFormScreen())),
    );
    await tester.pumpAndSettle();

    expect(find.text('Create new supplier'), findsAtLeastNWidgets(1));
    expect(find.text('Name'), findsOneWidget);
    expect(find.text('Phone'), findsOneWidget);
    expect(find.text('Email'), findsOneWidget);
    expect(find.text('Address'), findsOneWidget);
    expect(find.text('Notes'), findsOneWidget);
  });
}
