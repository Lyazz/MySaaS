import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:admin_app/providers/pos_provider.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test(
    'POS restores saved sort, columns, cart view, product view, and numpad',
    () async {
      final first = ProviderContainer();
      addTearDown(first.dispose);

      final notifier = first.read(posProvider.notifier);
      notifier.setSortType(ProductSortType.priceDesc);
      notifier.setCrossAxisCount(6);
      notifier.toggleCartView();
      notifier.toggleProductView();
      notifier.toggleNumpadVisibility();
      await notifier.saveSettings();

      final second = ProviderContainer();
      addTearDown(second.dispose);

      await second.read(posProvider.notifier).loadSettings();
      final state = second.read(posProvider);

      expect(state.sortType, ProductSortType.priceDesc);
      expect(state.crossAxisCount, 6);
      expect(state.isCartSimpleView, true);
      expect(state.isProductListView, true);
      expect(state.showNumpadOnDesktop, false);
    },
  );
}
