import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from '#imports'

describe('useProductCardVariantGuard', () => {
  beforeEach(async () => {
    ;(process as any).client = true
    const settings = useState<any>('storeSettings', () => ({}))
    settings.value = { templateKey: 'modern' }

    const { useProductCardVariantModalState } = await import('../../composables/useProductCardVariantGuard')
    const modal = useProductCardVariantModalState()
    modal.close()
    modal.productId.value = ''
    modal.productTitle.value = ''
    modal.productSlug.value = ''
    modal.fallbackImage.value = ''
    modal.bundleDeals.value = []
    modal.metaPixelIds.value = []
    modal.templateKey.value = 'modern'
  })

  it('opens modal with variants when product has variants', async () => {
    const fetchProductBySlug = vi.fn().mockResolvedValue({
      id: 'p_1',
      title: 'Shirt',
      slug: 'shirt',
      options: [{ id: 'o_size', position: 0 }],
      variants: [
        {
          id: 'v_1',
          price: 1200,
          promotionalPrice: 900,
          isPromotionActive: true,
          trackInventory: true,
          stock: 5,
          reserved: 2,
          safetyStock: 1,
          optionValues: [{ optionValue: { optionId: 'o_size', label: 'L' } }],
          images: []
        }
      ]
    })

    const { useProductCardVariantGuard } = await import('../../composables/useProductCardVariantGuard')
    const { useProductCardVariantModalState } = await import('../../composables/useProductCardVariantGuard')
    const guard = useProductCardVariantGuard({ fetchProductBySlug })
    const modal = useProductCardVariantModalState()

    const opened = await guard({ slug: 'shirt', hasVariants: true, title: 'Shirt', id: 'p_1' })

    expect(opened).toBe(true)
    expect(fetchProductBySlug).toHaveBeenCalledWith('shirt')
    expect(modal.open.value).toBe(true)
    expect(modal.variants.value).toHaveLength(1)
    expect(modal.variants.value[0]?.label).toBe('L')
    expect(modal.variants.value[0]?.price).toBe(900)
    expect(modal.variants.value[0]?.stock).toBe(2)
    expect(modal.variants.value[0]?.inStock).toBe(true)
  })

  it('does not open modal when list payload says no variants', async () => {
    const fetchProductBySlug = vi.fn()

    const { useProductCardVariantGuard } = await import('../../composables/useProductCardVariantGuard')
    const { useProductCardVariantModalState } = await import('../../composables/useProductCardVariantGuard')
    const guard = useProductCardVariantGuard({ fetchProductBySlug })
    const modal = useProductCardVariantModalState()

    const opened = await guard({ slug: 'mug', hasVariants: false })

    expect(opened).toBe(false)
    expect(fetchProductBySlug).not.toHaveBeenCalled()
    expect(modal.open.value).toBe(false)
  })

  it('keeps modal open with error when variant product lookup fails', async () => {
    const fetchProductBySlug = vi.fn().mockRejectedValue(new Error('network'))

    const { useProductCardVariantGuard } = await import('../../composables/useProductCardVariantGuard')
    const { useProductCardVariantModalState } = await import('../../composables/useProductCardVariantGuard')
    const guard = useProductCardVariantGuard({ fetchProductBySlug })
    const modal = useProductCardVariantModalState()

    const opened = await guard({ slug: 'hoodie', hasVariants: true })

    expect(opened).toBe(true)
    expect(fetchProductBySlug).toHaveBeenCalledWith('hoodie')
    expect(modal.open.value).toBe(true)
    expect(modal.error.value).toBe('Impossible de charger les variantes.')
  })
})
