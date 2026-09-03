import { describe, it, expect } from 'vitest'
import {
    checkPromoWindow,
    computePromoDiscount,
    normalizePromoCode
} from '../../shared/pricing/promo-pricing'

describe('computePromoDiscount', () => {
    const percentage = (value: number, cap?: number | null) => ({
        discountType: 'PERCENTAGE' as const,
        discountValue: value,
        maxDiscountAmount: cap ?? null
    })

    it('takes a percentage off the eligible lines', () => {
        const result = computePromoDiscount({
            rules: percentage(10),
            eligibleSubtotalCents: 500_00,
            cartSubtotalCents: 500_00
        })

        expect(result).toEqual({ itemsDiscountCents: 50_00, shippingDiscountCents: 0 })
    })

    it('only discounts the eligible lines of a scoped code', () => {
        const result = computePromoDiscount({
            rules: percentage(50),
            eligibleSubtotalCents: 200_00,
            cartSubtotalCents: 1000_00
        })

        expect(result.itemsDiscountCents).toBe(100_00)
    })

    it('honours the percentage cap', () => {
        const result = computePromoDiscount({
            rules: percentage(50, 300),
            eligibleSubtotalCents: 2000_00,
            cartSubtotalCents: 2000_00
        })

        expect(result.itemsDiscountCents).toBe(300_00)
    })

    it('clamps a percentage above 100 instead of paying the shopper', () => {
        const result = computePromoDiscount({
            rules: percentage(150),
            eligibleSubtotalCents: 100_00,
            cartSubtotalCents: 100_00
        })

        expect(result.itemsDiscountCents).toBe(100_00)
    })

    it('never lets a fixed discount exceed the cart', () => {
        const result = computePromoDiscount({
            rules: { discountType: 'FIXED', discountValue: 5000 },
            eligibleSubtotalCents: 800_00,
            cartSubtotalCents: 800_00
        })

        expect(result.itemsDiscountCents).toBe(800_00)
    })

    it('takes a fixed amount off when the cart covers it', () => {
        const result = computePromoDiscount({
            rules: { discountType: 'FIXED', discountValue: 500 },
            eligibleSubtotalCents: 3000_00,
            cartSubtotalCents: 3000_00
        })

        expect(result.itemsDiscountCents).toBe(500_00)
    })

    it('discounts the shipping and nothing else for a free-shipping code', () => {
        const result = computePromoDiscount({
            rules: { discountType: 'FREE_SHIPPING', discountValue: 0 },
            eligibleSubtotalCents: 4000_00,
            cartSubtotalCents: 4000_00,
            shippingCents: 600_00
        })

        expect(result).toEqual({ itemsDiscountCents: 0, shippingDiscountCents: 600_00 })
    })

    it('grants nothing when no cart line is eligible', () => {
        const result = computePromoDiscount({
            rules: percentage(20),
            eligibleSubtotalCents: 0,
            cartSubtotalCents: 900_00
        })

        expect(result.itemsDiscountCents).toBe(0)
    })

    it('ignores a negative discount value', () => {
        const result = computePromoDiscount({
            rules: { discountType: 'FIXED', discountValue: -100 },
            eligibleSubtotalCents: 900_00,
            cartSubtotalCents: 900_00
        })

        expect(result.itemsDiscountCents).toBe(0)
    })
})

describe('checkPromoWindow', () => {
    const now = new Date('2026-06-15T12:00:00.000Z')

    it('accepts an active code with no dates', () => {
        expect(checkPromoWindow({ isActive: true }, now)).toBeNull()
    })

    it('refuses an inactive code', () => {
        expect(checkPromoWindow({ isActive: false }, now)).toBe('INACTIVE')
    })

    it('refuses a code that has not started', () => {
        expect(checkPromoWindow({ isActive: true, startsAt: '2026-07-01T00:00:00.000Z' }, now))
            .toBe('NOT_STARTED')
    })

    it('refuses a code past its end date', () => {
        expect(checkPromoWindow({ isActive: true, endsAt: '2026-06-01T00:00:00.000Z' }, now))
            .toBe('EXPIRED')
    })

    it('accepts a code inside its window', () => {
        expect(checkPromoWindow({
            isActive: true,
            startsAt: '2026-06-01T00:00:00.000Z',
            endsAt: '2026-07-01T00:00:00.000Z'
        }, now)).toBeNull()
    })

    it('treats the end date as exclusive', () => {
        expect(checkPromoWindow({ isActive: true, endsAt: now.toISOString() }, now)).toBe('EXPIRED')
    })
})

describe('normalizePromoCode', () => {
    it('upper-cases and strips whitespace so hand-typed codes match', () => {
        expect(normalizePromoCode('  wel come10 ')).toBe('WELCOME10')
    })

    it('returns an empty string for anything that is not a string', () => {
        expect(normalizePromoCode(null)).toBe('')
        expect(normalizePromoCode(42)).toBe('')
    })
})
