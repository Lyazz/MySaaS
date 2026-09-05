import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * The composable behind the checkout coupon field. The server owns the maths,
 * so what matters here is that a refusal never leaves a discount on screen.
 */

const {
  fetchMock, cartStoreMock, tenantUrlMock, tenantHeadersMock,
  storefrontContentMock, currencyMock, stateStore
} = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  cartStoreMock: vi.fn(),
  tenantUrlMock: vi.fn(),
  tenantHeadersMock: vi.fn(),
  storefrontContentMock: vi.fn(),
  currencyMock: vi.fn(),
  stateStore: new Map<string, any>()
}))

mockNuxtImport('useState', () => (key: string, init: () => any) => {
  if (!stateStore.has(key)) stateStore.set(key, { value: init() })
  return stateStore.get(key)
})
mockNuxtImport('useCartStore', () => cartStoreMock)
mockNuxtImport('useTenantApiUrl', () => tenantUrlMock)
mockNuxtImport('useTenantApiHeaders', () => tenantHeadersMock)
mockNuxtImport('useStorefrontContent', () => storefrontContentMock)
mockNuxtImport('useCurrency', () => currencyMock)

vi.stubGlobal('$fetch', fetchMock)

describe('useCheckoutPromoCode', () => {
  const cart = {
    hasItems: true,
    items: [{ productId: 'p_1', variantId: 'v_1', quantity: 2 }]
  }

  const load = async () => {
    const { useCheckoutPromoCode } = await import('../../composables/useCheckoutPromoCode')
    return useCheckoutPromoCode()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    stateStore.clear()
    cart.hasItems = true
    cartStoreMock.mockReturnValue(cart)
    tenantUrlMock.mockImplementation((path: string) => path)
    tenantHeadersMock.mockReturnValue({})
    // The storefront copy the composable words its refusals with.
    storefrontContentMock.mockReturnValue({
      value: {
        checkout: {
          coupon: {
            invalid: 'Code invalide',
            errors: {
              PROMO_EXPIRED: 'Ce code promo a expire',
              PROMO_MIN_ORDER_NOT_MET: (amount: number, currency: string) =>
                `Minimum ${amount} ${currency}`
            }
          }
        }
      }
    })
    currencyMock.mockReturnValue({ currencyCode: { value: 'DZD' } })
  })

  it('applies a valid code and keeps the discount the server returned', async () => {
    fetchMock.mockResolvedValue({
      valid: true,
      code: 'WELCOME10',
      discountType: 'PERCENTAGE',
      discountAmount: 200,
      shippingDiscount: 0
    })

    const promo = await load()
    promo.codeInput.value = 'welcome10'

    await expect(promo.apply()).resolves.toBe(true)

    expect(promo.appliedCode.value).toBe('WELCOME10')
    expect(promo.discountAmount.value).toBe(200)
    expect(promo.errorMessage.value).toBe('')
    expect(promo.applied.value).toBe(true)
    expect(promo.freeShipping.value).toBe(false)
  })

  it('sends the cart and the phone the shopper typed', async () => {
    fetchMock.mockResolvedValue({ valid: true, code: 'X', discountAmount: 10, shippingDiscount: 0 })

    const promo = await load()
    promo.codeInput.value = 'X'
    promo.phone.value = ' 0550111222 '
    await promo.apply()

    const body = fetchMock.mock.calls[0][1].body
    expect(body.code).toBe('X')
    expect(body.customerPhone).toBe('0550111222')
    expect(body.items).toEqual([{ productId: 'p_1', variantId: 'v_1', quantity: 2 }])
  })

  it('flags a free-shipping code so the totals drop the delivery line', async () => {
    fetchMock.mockResolvedValue({
      valid: true,
      code: 'FREESHIP',
      discountType: 'FREE_SHIPPING',
      discountAmount: 0,
      shippingDiscount: 0
    })

    const promo = await load()
    promo.codeInput.value = 'FREESHIP'
    await promo.apply()

    expect(promo.freeShipping.value).toBe(true)
    expect(promo.applied.value).toBe(true)
  })

  it('shows the server refusal and grants nothing', async () => {
    fetchMock.mockResolvedValue({
      valid: false,
      code: 'GONE',
      discountAmount: 0,
      shippingDiscount: 0,
      message: 'This promo code has expired'
    })

    const promo = await load()
    promo.codeInput.value = 'GONE'

    await expect(promo.apply()).resolves.toBe(false)

    expect(promo.appliedCode.value).toBe('')
    expect(promo.discountAmount.value).toBe(0)
    expect(promo.errorMessage.value).toBe('This promo code has expired')
  })

  it('falls back to the caller message when the request throws', async () => {
    fetchMock.mockRejectedValue(new Error('network'))

    const promo = await load()
    promo.codeInput.value = 'BOOM'

    await expect(promo.apply('Code invalide')).resolves.toBe(false)
    expect(promo.errorMessage.value).toBe('Code invalide')
    expect(promo.discountAmount.value).toBe(0)
  })

  it('does not call the server for an empty input', async () => {
    const promo = await load()
    promo.codeInput.value = '   '

    await expect(promo.apply()).resolves.toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('re-prices the applied code when the cart changes', async () => {
    fetchMock.mockResolvedValueOnce({
      valid: true, code: 'TEN', discountType: 'PERCENTAGE', discountAmount: 200, shippingDiscount: 0
    })

    const promo = await load()
    promo.codeInput.value = 'TEN'
    await promo.apply()
    expect(promo.discountAmount.value).toBe(200)

    fetchMock.mockResolvedValueOnce({
      valid: true, code: 'TEN', discountType: 'PERCENTAGE', discountAmount: 90, shippingDiscount: 0
    })
    await promo.refresh()

    expect(promo.discountAmount.value).toBe(90)
  })

  it('drops the discount when the re-check refuses it', async () => {
    fetchMock.mockResolvedValueOnce({ valid: true, code: 'TEN', discountAmount: 200, shippingDiscount: 0 })

    const promo = await load()
    promo.codeInput.value = 'TEN'
    await promo.apply()

    fetchMock.mockResolvedValueOnce({
      valid: false, code: 'TEN', discountAmount: 0, shippingDiscount: 0, message: 'Cart too small'
    })
    await promo.refresh()

    expect(promo.appliedCode.value).toBe('')
    expect(promo.discountAmount.value).toBe(0)
    expect(promo.errorMessage.value).toBe('Cart too small')
  })

  it('drops the discount when the cart is emptied', async () => {
    fetchMock.mockResolvedValueOnce({ valid: true, code: 'TEN', discountAmount: 200, shippingDiscount: 0 })

    const promo = await load()
    promo.codeInput.value = 'TEN'
    await promo.apply()

    cart.hasItems = false
    await promo.refresh()

    expect(promo.appliedCode.value).toBe('')
    expect(promo.discountAmount.value).toBe(0)
  })

  it('reset clears the input as well as the discount', async () => {
    fetchMock.mockResolvedValue({ valid: true, code: 'TEN', discountAmount: 200, shippingDiscount: 0 })

    const promo = await load()
    promo.codeInput.value = 'TEN'
    await promo.apply()

    promo.reset()

    expect(promo.codeInput.value).toBe('')
    expect(promo.appliedCode.value).toBe('')
    expect(promo.discountAmount.value).toBe(0)
    expect(promo.applied.value).toBe(false)
  })
})
