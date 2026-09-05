import 'package:admin_app/models/product.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('ProductImage.fromJson supports imageUrl and src fallbacks', () {
    final fromImageUrl = ProductImage.fromJson({
      'id': 'img-1',
      'imageUrl': '/uploads/tenant/a.jpg',
      'isMain': true,
      'position': 0,
    });
    expect(fromImageUrl.url, '/uploads/tenant/a.jpg');

    final fromSrc = ProductImage.fromJson({
      'id': 'img-2',
      'src': '/uploads/tenant/b.jpg',
      'isMain': false,
      'position': 1,
    });
    expect(fromSrc.url, '/uploads/tenant/b.jpg');
  });

  test('ProductVariant.fromJson supports nested imageUrl values', () {
    final variant = ProductVariant.fromJson({
      'id': 'v1',
      'price': 100,
      'cost': 70,
      'stock': 4,
      'sku': 'SKU-1',
      'skuLocked': false,
      'isActive': true,
      'trackInventory': true,
      'safetyStock': 1,
      'reserved': 0,
      'images': [
        {'imageUrl': '/uploads/tenant/variant.jpg'},
      ],
      'optionValues': const [],
    });

    expect(variant.images, ['/uploads/tenant/variant.jpg']);
  });
}
