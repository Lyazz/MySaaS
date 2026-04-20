import { describe, it, expect } from 'vitest'
import {
    buildActiveProductPricing,
    buildProductPricing,
    getPromotionalPrice,
    isPromotionActiveNow,
    toFiniteNumber
} from '../../shared/pricing/product-pricing'

describe('product pricing helper', () => {
    it('prioritizes promotional price whenever it is set', () => {
        const pricing = buildProductPricing({
            price: 200,
            promotionalPrice: 120,
            isPromotionActive: false,
            promotionStartDate: '2099-01-01T00:00:00.000Z',
            promotionEndDate: '2099-12-31T00:00:00.000Z'
        } as any)

        expect(pricing.originalPrice).toBe(200)
        expect(pricing.effectivePrice).toBe(120)
        expect(pricing.promotionApplied).toBe(true)
        expect(pricing.promotionDiscountPercent).toBe(40)
    })

    it('falls back to regular price when promotional price is missing/invalid', () => {
        const missingPromo = buildProductPricing({ price: 200, promotionalPrice: null })
        const invalidPromo = buildProductPricing({ price: 200, promotionalPrice: 'abc' })

        expect(missingPromo.effectivePrice).toBe(200)
        expect(missingPromo.promotionApplied).toBe(false)
        expect(invalidPromo.effectivePrice).toBe(200)
        expect(invalidPromo.promotionApplied).toBe(false)
    })

    it('supports explicit base price override (variant price)', () => {
        const pricing = buildProductPricing({ price: 500, promotionalPrice: 300 }, 450)
        expect(pricing.originalPrice).toBe(450)
        expect(pricing.effectivePrice).toBe(300)
        expect(pricing.promotionDiscountPercent).toBe(33)
    })

    it('exposes helper primitives', () => {
        expect(toFiniteNumber('42', 0)).toBe(42)
        expect(toFiniteNumber('bad', 5)).toBe(5)
        expect(getPromotionalPrice({ promotionalPrice: '99.5' })).toBe(99.5)
        expect(getPromotionalPrice({ promotionalPrice: 'bad' })).toBeNull()
    })

    it('only applies promotion when active and in date window', () => {
        const now = new Date('2026-04-20T12:00:00.000Z')
        const active = {
            price: 1000,
            promotionalPrice: 800,
            isPromotionActive: true,
            promotionStartDate: '2026-04-19T00:00:00.000Z',
            promotionEndDate: '2026-04-21T00:00:00.000Z'
        }
        const inactiveFlag = { ...active, isPromotionActive: false }
        const futurePromo = { ...active, promotionStartDate: '2026-04-21T00:00:00.000Z' }
        const expiredPromo = { ...active, promotionEndDate: '2026-04-19T00:00:00.000Z' }

        expect(isPromotionActiveNow(active, now)).toBe(true)
        expect(isPromotionActiveNow(inactiveFlag, now)).toBe(false)
        expect(isPromotionActiveNow(futurePromo, now)).toBe(false)
        expect(isPromotionActiveNow(expiredPromo, now)).toBe(false)
    })

    it('buildActiveProductPricing ignores promo price when promotion is inactive', () => {
        const now = new Date('2026-04-20T12:00:00.000Z')
        const pricing = buildActiveProductPricing(
            {
                price: 1000,
                promotionalPrice: 700,
                isPromotionActive: false
            },
            undefined,
            now
        )

        expect(pricing.effectivePrice).toBe(1000)
        expect(pricing.promotionApplied).toBe(false)
        expect(pricing.promotionDiscountPercent).toBeNull()
    })
})
