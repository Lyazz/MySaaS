import { describe, it, expect } from 'vitest'
import { computeClearanceDiscount } from '../../shared/pricing/clearance-pricing'

describe('computeClearanceDiscount', () => {
    it('gives no discount when quantity is below the multiple', () => {
        const result = computeClearanceDiscount({
            lines: [{ key: 'a', unitPriceCents: 100000, quantity: 5 }],
            multiple: 6,
            divisor: 3
        })

        expect(result.eligibleQuantity).toBe(0)
        expect(result.freeCount).toBe(0)
        expect(result.discountCents).toBe(0)
        expect(result.freeUnits).toEqual([])
    })

    it('rewards an exact multiple of the threshold', () => {
        const result = computeClearanceDiscount({
            lines: [{ key: 'a', unitPriceCents: 100000, quantity: 6 }],
            multiple: 6,
            divisor: 3
        })

        expect(result.eligibleQuantity).toBe(6)
        expect(result.freeCount).toBe(2)
        expect(result.discountCents).toBe(200000)
    })

    it('rewards a partial threshold and ignores the remainder', () => {
        const result = computeClearanceDiscount({
            lines: [{ key: 'a', unitPriceCents: 100000, quantity: 8 }],
            multiple: 6,
            divisor: 3
        })

        // floor(8/6)*6 = 6 eligible units -> floor(6/3) = 2 free, the extra 2 units earn nothing
        expect(result.eligibleQuantity).toBe(6)
        expect(result.freeCount).toBe(2)
        expect(result.discountCents).toBe(200000)
    })

    it('picks the cheapest units across multiple product lines', () => {
        const result = computeClearanceDiscount({
            lines: [
                { key: 'expensive', unitPriceCents: 200000, quantity: 2 },
                { key: 'cheap', unitPriceCents: 100000, quantity: 4 }
            ],
            multiple: 6,
            divisor: 3
        })

        expect(result.eligibleQuantity).toBe(6)
        expect(result.freeCount).toBe(2)
        // both free units must come from the cheaper line
        expect(result.freeUnits.every((u) => u.key === 'cheap')).toBe(true)
        expect(result.discountCents).toBe(200000)
    })

    it('scales with multiple full thresholds', () => {
        const result = computeClearanceDiscount({
            lines: [{ key: 'a', unitPriceCents: 100000, quantity: 24 }],
            multiple: 6,
            divisor: 3
        })

        expect(result.eligibleQuantity).toBe(24)
        expect(result.freeCount).toBe(8)
        expect(result.discountCents).toBe(800000)
    })

    it('returns zero for an empty cart', () => {
        const result = computeClearanceDiscount({ lines: [], multiple: 6, divisor: 3 })
        expect(result.discountCents).toBe(0)
        expect(result.freeCount).toBe(0)
    })

    it('clamps invalid multiple/divisor to a minimum of 1', () => {
        const result = computeClearanceDiscount({
            lines: [{ key: 'a', unitPriceCents: 100000, quantity: 3 }],
            multiple: 0,
            divisor: -5
        })

        // multiple clamped to 1 -> all 3 units eligible; divisor clamped to 1 -> all 3 free
        expect(result.eligibleQuantity).toBe(3)
        expect(result.freeCount).toBe(3)
        expect(result.discountCents).toBe(300000)
    })
})
