import { describe, it, expect } from 'vitest';
import {
  findBestVariantForSelection,
  getOptionValueState,
  getPreferredInitialSelection,
  isVariantInStock,
  selectionFromVariant,
} from '../../components/storefront/templates/modern/variant-ux';

describe('variant-ux', () => {
  const product = {
    options: [
      {
        id: 'opt_size',
        values: [
          { id: 's', optionId: 'opt_size', label: 'S' },
          { id: 'm', optionId: 'opt_size', label: 'M' },
        ],
      },
      {
        id: 'opt_color',
        values: [
          { id: 'red', optionId: 'opt_color', label: 'Red' },
          { id: 'blue', optionId: 'opt_color', label: 'Blue' },
        ],
      },
    ],
    variants: [
      {
        id: 'v_s_red',
        isActive: true,
        trackInventory: true,
        stock: 0,
        optionValues: [
          { optionValueId: 's', optionValue: { optionId: 'opt_size' } },
          { optionValueId: 'red', optionValue: { optionId: 'opt_color' } },
        ],
      },
      {
        id: 'v_s_blue',
        isActive: true,
        trackInventory: true,
        stock: 3,
        optionValues: [
          { optionValueId: 's', optionValue: { optionId: 'opt_size' } },
          { optionValueId: 'blue', optionValue: { optionId: 'opt_color' } },
        ],
      },
      {
        id: 'v_m_red_inactive',
        isActive: false,
        trackInventory: true,
        stock: 10,
        optionValues: [
          { optionValueId: 'm', optionValue: { optionId: 'opt_size' } },
          { optionValueId: 'red', optionValue: { optionId: 'opt_color' } },
        ],
      },
    ],
  };

  it('returns out_of_stock when only matching variants are active but stock is 0', () => {
    const state = getOptionValueState({
      product,
      selectedOptions: { opt_size: 's' },
      optionId: 'opt_color',
      valueId: 'red',
    });
    expect(state).toBe('out_of_stock');
  });

  it('returns available when there is an in-stock active variant matching selection', () => {
    const state = getOptionValueState({
      product,
      selectedOptions: { opt_size: 's' },
      optionId: 'opt_color',
      valueId: 'blue',
    });
    expect(state).toBe('available');
  });

  it('treats inactive variants as unavailable', () => {
    const state = getOptionValueState({
      product,
      selectedOptions: { opt_size: 'm' },
      optionId: 'opt_color',
      valueId: 'red',
    });
    expect(state).toBe('unavailable');
  });

  it('treats trackInventory=false variants as in stock', () => {
    const p = {
      ...product,
      variants: [
        ...product.variants,
        {
          id: 'v_m_blue_untracked',
          isActive: true,
          trackInventory: false,
          stock: 0,
          optionValues: [
            { optionValueId: 'm', optionValue: { optionId: 'opt_size' } },
            { optionValueId: 'blue', optionValue: { optionId: 'opt_color' } },
          ],
        },
      ],
    };

    expect(
      getOptionValueState({
        product: p,
        selectedOptions: { opt_size: 'm' },
        optionId: 'opt_color',
        valueId: 'blue',
      })
    ).toBe('available');
  });

  it('getPreferredInitialSelection leaves variant products unselected by default', () => {
    const selection = getPreferredInitialSelection(product);
    expect(selection).toEqual({});
  });

  it('findBestVariantForSelection returns an in-stock match when possible', () => {
    const variant = findBestVariantForSelection({
      product,
      selectedOptions: { opt_size: 's', opt_color: 'red' },
    });
    // Only red is out of stock here, so best should be that (no in-stock match for red)
    expect(variant?.id).toBe('v_s_red');

    const variant2 = findBestVariantForSelection({
      product,
      selectedOptions: { opt_size: 's', opt_color: 'blue' },
    });
    expect(variant2?.id).toBe('v_s_blue');
  });

  it('isVariantInStock respects activity and inventory tracking', () => {
    const v = product.variants[1];
    expect(isVariantInStock(v)).toBe(true);

    const inactive = product.variants[2];
    expect(isVariantInStock(inactive)).toBe(false);

    const untracked = { ...v, trackInventory: false, stock: 0 };
    expect(isVariantInStock(untracked)).toBe(true);
  });

  it('selectionFromVariant maps option ids to value ids', () => {
    const sel = selectionFromVariant(product.variants[1]);
    expect(sel).toEqual({ opt_size: 's', opt_color: 'blue' });
  });
});
