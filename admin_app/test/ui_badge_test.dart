import 'package:admin_app/widgets/badges/status_badges.dart';
import 'package:admin_app/widgets/badges/ui_badge.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers/pump_localized_app.dart';

BoxDecoration _decorationOf(WidgetTester tester, Finder root) {
  final container = tester.widget<Container>(
    find.descendant(of: root, matching: find.byType(Container)).first,
  );
  final decoration = container.decoration;
  expect(decoration, isA<BoxDecoration>());
  return decoration! as BoxDecoration;
}

Text _textOf(WidgetTester tester, Finder root, String text) {
  return tester.widget<Text>(
    find.descendant(of: root, matching: find.text(text)),
  );
}

void main() {
  test('UiBadge tone colors match Nuxt compiled CSS', () {
    // Verified from `.output/server/chunks/build/entry-styles*.mjs`:
    // `.ui-badge--{tone}` uses bg `*-50` (slate uses `slate-100`) and text `*-700`.
    expect(UiBadge.backgroundColor(UiBadgeTone.slate), const Color(0xFFF1F5F9));
    expect(UiBadge.foregroundColor(UiBadgeTone.slate), const Color(0xFF334155));

    expect(
      UiBadge.backgroundColor(UiBadgeTone.emerald),
      const Color(0xFFECFDF5),
    );
    expect(
      UiBadge.foregroundColor(UiBadgeTone.emerald),
      const Color(0xFF047857),
    );

    expect(
      UiBadge.backgroundColor(UiBadgeTone.indigo),
      const Color(0xFFEEF2FF),
    );
    expect(
      UiBadge.foregroundColor(UiBadgeTone.indigo),
      const Color(0xFF4338CA),
    );

    expect(UiBadge.backgroundColor(UiBadgeTone.lime), const Color(0xFFF7FEE7));
    expect(UiBadge.foregroundColor(UiBadgeTone.lime), const Color(0xFF4D7C0F));

    expect(UiBadge.backgroundColor(UiBadgeTone.amber), const Color(0xFFFFFBEB));
    expect(UiBadge.foregroundColor(UiBadgeTone.amber), const Color(0xFFB45309));

    expect(UiBadge.backgroundColor(UiBadgeTone.red), const Color(0xFFFEF2F2));
    expect(UiBadge.foregroundColor(UiBadgeTone.red), const Color(0xFFB91C1C));
  });

  testWidgets('UiBadge matches webapp ui-badge styles', (tester) async {
    const key = Key('badge');

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: UiBadge(
            key: key,
            label: 'pending',
            tone: UiBadgeTone.amber,
            uppercase: true,
          ),
        ),
      ),
    );

    final root = find.byKey(key);
    final decoration = _decorationOf(tester, root);

    expect(decoration.color, UiBadge.backgroundColor(UiBadgeTone.amber));
    expect(decoration.borderRadius, BorderRadius.circular(UiBadge.radius));

    final container = tester.widget<Container>(
      find.descendant(of: root, matching: find.byType(Container)).first,
    );
    expect(container.padding, UiBadge.padding);

    final text = _textOf(tester, root, 'PENDING');
    expect(text.style?.fontSize, UiBadge.textStyle.fontSize);
    expect(text.style?.fontWeight, UiBadge.textStyle.fontWeight);
    expect(text.style?.color, UiBadge.foregroundColor(UiBadgeTone.amber));
  });

  testWidgets('Status badge tone mapping matches webapp', (tester) async {
    Future<void> pump(Widget child) async {
      await tester.pumpWidget(
        buildLocalizedTestApp(home: Scaffold(body: child)),
      );
      await tester.pumpAndSettle();
    }

    await pump(const OrderStatusBadge(status: 'shipped'));
    expect(
      _decorationOf(tester, find.byType(OrderStatusBadge)).color,
      UiBadge.backgroundColor(UiBadgeTone.lime),
    );

    await pump(const PurchaseStatusBadge(status: 'received'));
    expect(
      _decorationOf(tester, find.byType(PurchaseStatusBadge)).color,
      UiBadge.backgroundColor(UiBadgeTone.emerald),
    );

    await pump(const SaleTypeBadge(type: 'pos'));
    expect(
      _decorationOf(tester, find.byType(SaleTypeBadge)).color,
      UiBadge.backgroundColor(UiBadgeTone.lime),
    );

    await pump(const ActiveBadge(isActive: true));
    expect(
      _decorationOf(tester, find.byType(ActiveBadge)).color,
      UiBadge.backgroundColor(UiBadgeTone.emerald),
    );
    expect(find.text('Active'), findsOneWidget);
  });
}
