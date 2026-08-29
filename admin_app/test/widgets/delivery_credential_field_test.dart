import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:admin_app/models/delivery_provider.dart';
import 'package:admin_app/widgets/delivery_credential_field.dart';

void main() {
  const secretField = DeliveryCredentialField(
    key: 'apiToken',
    label: 'API Token',
    required: true,
    secret: true,
  );
  const plainField = DeliveryCredentialField(
    key: 'storeId',
    label: 'Store ID',
    required: false,
    secret: false,
  );

  testWidgets(
    'a saved secret never shows its value — it renders a masked hint and a Clear action',
    (tester) async {
      final controller = TextEditingController();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DeliveryCredentialFieldInput(
              field: secretField,
              controller: controller,
              isSaved: true,
              isCleared: false,
              onClear: () {},
            ),
          ),
        ),
      );

      // The saved secret's real value is never round-tripped into the field.
      expect(controller.text, isEmpty);
      expect(find.text('Saved — leave blank to keep'), findsOneWidget);
      expect(find.text('Clear'), findsOneWidget);

      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.obscureText, isTrue);
    },
  );

  testWidgets('tapping Clear on a saved secret invokes onClear', (
    tester,
  ) async {
    var cleared = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: DeliveryCredentialFieldInput(
            field: secretField,
            controller: TextEditingController(),
            isSaved: true,
            isCleared: false,
            onClear: () => cleared = true,
          ),
        ),
      ),
    );

    await tester.tap(find.text('Clear'));
    expect(cleared, isTrue);
  });

  testWidgets(
    'a non-secret field shows its value in plain text with no mask or Clear action',
    (tester) async {
      final controller = TextEditingController(text: 'S1');

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DeliveryCredentialFieldInput(
              field: plainField,
              controller: controller,
              isSaved: false,
              isCleared: false,
              onClear: () {},
            ),
          ),
        ),
      );

      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.obscureText, isFalse);
      expect(find.text('Clear'), findsNothing);
      expect(find.text('S1'), findsOneWidget);
    },
  );

  testWidgets(
    'once cleared, the saved-secret hint disappears so a fresh value can be typed',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DeliveryCredentialFieldInput(
              field: secretField,
              controller: TextEditingController(),
              isSaved: true,
              isCleared: true,
              onClear: () {},
            ),
          ),
        ),
      );

      expect(find.text('Saved — leave blank to keep'), findsNothing);
      expect(find.text('Clear'), findsNothing);
    },
  );
}
