import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:admin_app/models/pos_models.dart';
import 'package:admin_app/providers/pos_provider.dart';

void main() {
  test('fixed discount is capped at cart subtotal', () {
    const discount = PosDiscount(type: PosDiscountType.fixed, value: 250);

    expect(discount.amountFor(100), 100);
    expect(discount.amountFor(0), 0);
  });

  test('percentage discount calculates from subtotal', () {
    const discount = PosDiscount(type: PosDiscountType.percent, value: 15);

    expect(discount.amountFor(200), 30);
  });

  test('POS cart total reflects cart-wide discount', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    final notifier = container.read(posProvider.notifier);
    notifier.addCustomItem(name: 'Desk sale', price: 1000, quantity: 2);
    notifier.applyDiscount(
      const PosDiscount(type: PosDiscountType.percent, value: 10),
    );

    final state = container.read(posProvider);
    expect(state.subtotal, 2000);
    expect(state.discountAmount, 200);
    expect(state.total, 1800);
  });

  test('clearing cart also clears discount', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    final notifier = container.read(posProvider.notifier);
    notifier.addCustomItem(name: 'Desk sale', price: 500);
    notifier.applyDiscount(
      const PosDiscount(type: PosDiscountType.fixed, value: 100),
    );
    notifier.clearCart();

    final state = container.read(posProvider);
    expect(state.cart, isEmpty);
    expect(state.discount, isNull);
    expect(state.total, 0);
  });
}
