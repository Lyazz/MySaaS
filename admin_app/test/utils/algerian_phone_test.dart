import 'package:admin_app/utils/algerian_phone.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AlgerianPhone.tryNormalize', () {
    test('normalizes local, bare and international formats', () {
      expect(AlgerianPhone.tryNormalize('0540801436'), '213540801436');
      expect(AlgerianPhone.tryNormalize('540801436'), '213540801436');
      expect(AlgerianPhone.tryNormalize('213540801436'), '213540801436');
      expect(AlgerianPhone.tryNormalize('00213540801436'), '213540801436');
      expect(AlgerianPhone.tryNormalize('+213 540 80 14 36'), '213540801436');
    });

    test('accepts every valid mobile prefix', () {
      expect(AlgerianPhone.tryNormalize('0512345678'), '213512345678');
      expect(AlgerianPhone.tryNormalize('0612345678'), '213612345678');
      expect(AlgerianPhone.tryNormalize('0712345678'), '213712345678');
    });

    test('strips separators before validating', () {
      expect(AlgerianPhone.tryNormalize('05-40-80-14-36'), '213540801436');
      expect(AlgerianPhone.tryNormalize(' 05 40 80 14 36 '), '213540801436');
    });

    test('rejects invalid numbers', () {
      expect(AlgerianPhone.tryNormalize(null), isNull);
      expect(AlgerianPhone.tryNormalize(''), isNull);
      expect(AlgerianPhone.tryNormalize('0140801436'), isNull); // landline
      expect(AlgerianPhone.tryNormalize('054080143'), isNull); // too short
      expect(AlgerianPhone.tryNormalize('05408014367'), isNull); // too long
      expect(AlgerianPhone.tryNormalize('+33612345678'), isNull); // not DZ
      expect(AlgerianPhone.tryNormalize('not a number'), isNull);
    });
  });

  test('isValid mirrors tryNormalize', () {
    expect(AlgerianPhone.isValid('0540801436'), isTrue);
    expect(AlgerianPhone.isValid('0140801436'), isFalse);
  });
}
