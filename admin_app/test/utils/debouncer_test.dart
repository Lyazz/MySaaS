import 'package:fake_async/fake_async.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:admin_app/utils/debouncer.dart';

void main() {
  test('Debouncer only runs latest action', () {
    fakeAsync((async) {
      var count = 0;
      final debouncer = Debouncer(milliseconds: 100);

      debouncer.run(() => count++);
      debouncer.run(() => count++);

      expect(count, 0);

      async.elapse(const Duration(milliseconds: 99));
      expect(count, 0);

      async.elapse(const Duration(milliseconds: 1));
      expect(count, 1);

      debouncer.dispose();
    });
  });

  test('Debouncer dispose cancels pending action', () {
    fakeAsync((async) {
      var count = 0;
      final debouncer = Debouncer(milliseconds: 100);

      debouncer.run(() => count++);
      debouncer.dispose();

      async.elapse(const Duration(milliseconds: 200));
      expect(count, 0);
    });
  });
}
