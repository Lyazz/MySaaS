import 'package:flutter_test/flutter_test.dart';

import 'package:admin_app/utils/barcode_scanner.dart';

void main() {
  test('BarcodeScannerBuffer returns code on submit', () {
    final buffer = BarcodeScannerBuffer(
      interKeyTimeout: const Duration(milliseconds: 80),
      maxScanDuration: const Duration(milliseconds: 900),
      minLength: 3,
    );

    final t0 = DateTime(2024, 1, 1);
    expect(buffer.addCharacter('1', t0), isFalse);
    expect(
      buffer.addCharacter('2', t0.add(const Duration(milliseconds: 20))),
      isTrue,
    );
    expect(
      buffer.addCharacter('3', t0.add(const Duration(milliseconds: 40))),
      isTrue,
    );

    expect(buffer.submit(t0.add(const Duration(milliseconds: 60))), '123');
    expect(buffer.hasPending, isFalse);
  });

  test('BarcodeScannerBuffer enforces maxScanDuration', () {
    final buffer = BarcodeScannerBuffer(
      maxScanDuration: const Duration(milliseconds: 100),
      minLength: 3,
    );

    final t0 = DateTime(2024, 1, 1);
    buffer.addCharacter('A', t0);
    buffer.addCharacter('B', t0.add(const Duration(milliseconds: 20)));
    buffer.addCharacter('C', t0.add(const Duration(milliseconds: 40)));

    expect(buffer.submit(t0.add(const Duration(milliseconds: 150))), isNull);
    expect(buffer.hasPending, isFalse);
  });

  test('BarcodeScannerBuffer resets on interKeyTimeout gap', () {
    final buffer = BarcodeScannerBuffer(
      interKeyTimeout: const Duration(milliseconds: 50),
      maxScanDuration: const Duration(milliseconds: 900),
      minLength: 2,
    );

    final t0 = DateTime(2024, 1, 1);
    buffer.addCharacter('X', t0);

    buffer.addCharacter('Y', t0.add(const Duration(milliseconds: 200)));
    buffer.addCharacter('Z', t0.add(const Duration(milliseconds: 220)));

    expect(buffer.submit(t0.add(const Duration(milliseconds: 240))), 'YZ');
  });

  test('BarcodeScannerBuffer enforces minLength', () {
    final buffer = BarcodeScannerBuffer(minLength: 4);

    final t0 = DateTime(2024, 1, 1);
    buffer.addCharacter('1', t0);
    buffer.addCharacter('2', t0.add(const Duration(milliseconds: 20)));
    buffer.addCharacter('3', t0.add(const Duration(milliseconds: 40)));

    expect(buffer.submit(t0.add(const Duration(milliseconds: 60))), isNull);
  });
}
