import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:admin_app/models/product.dart';
import 'package:admin_app/providers/pos_provider.dart';

void main() {
  test('POS cart treats different variants as separate lines', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    final notifier = container.read(posProvider.notifier);

    final sizeOption = ProductOption(
      id: 'opt_size',
      name: 'Size',
      displayType: 'chips',
      position: 0,
      values: [
        ProductOptionValue(id: 'val_s', label: 'S', position: 0),
        ProductOptionValue(id: 'val_m', label: 'M', position: 1),
      ],
    );

    final variantS = ProductVariant(
      id: 'var_s',
      price: 10,
      cost: 0,
      stock: 10,
      sku: 'SKU-S',
      skuLocked: false,
      isActive: true,
      trackInventory: true,
      safetyStock: 0,
      reserved: 0,
      optionValues: [
        ProductVariantOptionValue(
          optionId: sizeOption.id,
          optionValueId: sizeOption.values[0].id,
          option: sizeOption,
          optionValue: sizeOption.values[0],
        ),
      ],
    );

    final variantM = ProductVariant(
      id: 'var_m',
      price: 12,
      cost: 0,
      stock: 10,
      sku: 'SKU-M',
      skuLocked: false,
      isActive: true,
      trackInventory: true,
      safetyStock: 0,
      reserved: 0,
      optionValues: [
        ProductVariantOptionValue(
          optionId: sizeOption.id,
          optionValueId: sizeOption.values[1].id,
          option: sizeOption,
          optionValue: sizeOption.values[1],
        ),
      ],
    );

    final product = Product(
      id: 'prod_1',
      title: 'T-Shirt',
      slug: 't-shirt',
      price: 0,
      stock: 0,
      isActive: true,
      options: [sizeOption],
      variants: [variantS, variantM],
    );

    notifier.addToCart(product, variant: variantS);
    notifier.addToCart(product, variant: variantS);
    notifier.addToCart(product, variant: variantM);

    final state = container.read(posProvider);
    expect(state.cart.length, 2);

    final lineS = state.cart.firstWhere((i) => i.variantId == variantS.id);
    final lineM = state.cart.firstWhere((i) => i.variantId == variantM.id);
    expect(lineS.quantity, 2);
    expect(lineM.quantity, 1);
  });
}
