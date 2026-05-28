import 'package:admin_app/widgets/form/date_range_filter_field.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lucide_icons/lucide_icons.dart';

void main() {
  testWidgets('renders formatted range and clears', (tester) async {
    DateTimeRange? changedTo;

    final range = DateTimeRange(
      start: DateTime(2025, 1, 1),
      end: DateTime(2025, 1, 31),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: DateRangeFilterField(
            range: range,
            firstDate: DateTime(2020),
            lastDate: DateTime(2030),
            onChanged: (r) => changedTo = r,
          ),
        ),
      ),
    );

    expect(find.text('2025-01-01 - 2025-01-31'), findsOneWidget);
    expect(find.byIcon(LucideIcons.x), findsOneWidget);

    await tester.tap(find.byIcon(LucideIcons.x));
    await tester.pump();

    expect(changedTo, isNull);
  });

  testWidgets('does not show clear when range is null', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: DateRangeFilterField(
            range: null,
            firstDate: DateTime(2020),
            lastDate: DateTime(2030),
            onChanged: (_) {},
          ),
        ),
      ),
    );

    expect(find.byIcon(LucideIcons.x), findsNothing);
  });

  testWidgets('applies today preset', (tester) async {
    DateTimeRange? changedTo;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: DateRangeFilterField(
            range: null,
            firstDate: DateTime(2020),
            lastDate: DateTime(2030),
            onChanged: (r) => changedTo = r,
          ),
        ),
      ),
    );

    await tester.tap(find.text('Custom').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Today').last);
    await tester.pumpAndSettle();

    final today = DateTime.now();
    expect(changedTo, isNotNull);
    expect(changedTo!.start.year, today.year);
    expect(changedTo!.start.month, today.month);
    expect(changedTo!.start.day, today.day);
    expect(changedTo!.end.year, today.year);
    expect(changedTo!.end.month, today.month);
    expect(changedTo!.end.day, today.day);
  });
}
