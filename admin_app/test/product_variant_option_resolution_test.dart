import 'package:flutter_test/flutter_test.dart';
import 'package:admin_app/models/product.dart';

void main() {
  test(
    'Product.fromJson resolves variant optionValue labels from product options',
    () {
      final productJson = {
        'id': 'p1',
        'title': 'Tee',
        'slug': 'tee',
        'price': 10,
        'stock': 0,
        'isActive': true,
        'options': [
          {
            'id': 'opt-color',
            'name': 'Color',
            'displayType': 'color',
            'position': 0,
            'values': [
              {'id': 'red', 'label': 'Red', 'position': 0, 'meta': '#FF0000'},
              {'id': 'blue', 'label': 'Blue', 'position': 1, 'meta': '#0000FF'},
            ],
          },
          {
            'id': 'opt-size',
            'name': 'Size',
            'displayType': 'dropdown',
            'position': 1,
            'values': [
              {'id': 's', 'label': 'S', 'position': 0},
              {'id': 'm', 'label': 'M', 'position': 1},
            ],
          },
        ],
        'variants': [
          {
            'id': 'v1',
            'price': 12,
            'compareAtPrice': null,
            'stock': 5,
            'sku': 'TEE-RED-M',
            'isActive': true,
            'trackInventory': true,
            'safetyStock': 0,
            'reserved': 0,
            'images': [],
            'optionValues': [
              {'optionId': 'opt-size', 'optionValueId': 'm'},
              {'optionId': 'opt-color', 'optionValueId': 'red'},
            ],
          },
        ],
      };

      final product = Product.fromJson(productJson);
      final variant = product.variants.single;

      expect(variant.title, 'Red / M');
      expect(variant.optionValues.first.option?.name, 'Color');
      expect(variant.optionValues.first.optionValue?.meta, '#FF0000');
    },
  );
}
