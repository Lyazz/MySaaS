import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:admin_app/models/product.dart';
import 'package:admin_app/providers/pos_provider.dart';

void main() {
  test('POS cart uses product main image from productImages', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    final notifier = container.read(posProvider.notifier);

    final product = Product(
      id: 'prod_1',
      title: 'Coffee Mug',
      slug: 'coffee-mug',
      price: 15,
      stock: 8,
      isActive: true,
      images: const [],
      productImages: [
        ProductImage(
          id: 'img_1',
          url: '/uploads/tenant-1/mug.webp',
          isMain: true,
          position: 0,
        ),
      ],
    );

    notifier.addToCart(product);

    final state = container.read(posProvider);
    expect(state.cart, hasLength(1));
    expect(state.cart.single.imageUrl, '/uploads/tenant-1/mug.webp');
  });
}
