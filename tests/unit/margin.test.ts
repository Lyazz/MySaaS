import { describe, expect, it } from 'vitest'
import { Prisma } from '@prisma/client'
import {
    applyMargin,
    marginFromPrices,
    normalizeMarginPercent,
    toDecimal
} from '../../backend/src/lib/margin'

describe('toDecimal', () => {
    it('accepts numbers, strings and Decimals', () => {
        expect(toDecimal(120)?.toString()).toBe('120')
        expect(toDecimal(' 120.5 ')?.toString()).toBe('120.5')
        expect(toDecimal(new Prisma.Decimal('7'))?.toString()).toBe('7')
    })

    it('returns null for blanks and junk', () => {
        expect(toDecimal('')).toBeNull()
        expect(toDecimal(null)).toBeNull()
        expect(toDecimal('abc')).toBeNull()
        expect(toDecimal(Number.NaN)).toBeNull()
    })
})

describe('normalizeMarginPercent', () => {
    it('falls back when the value is unusable', () => {
        expect(normalizeMarginPercent(undefined)).toBe(30)
        expect(normalizeMarginPercent('nope', 45)).toBe(45)
    })

    it('clamps to the allowed band', () => {
        expect(normalizeMarginPercent(-500)).toBe(-100)
        expect(normalizeMarginPercent(99_999)).toBe(10_000)
    })
})

describe('applyMargin', () => {
    it('adds the margin and rounds to whole dinars', () => {
        expect(applyMargin(375, 30).toString()).toBe('488') // 487.5 rounds half up
        expect(applyMargin('1000', 25).toString()).toBe('1250')
    })

    it('returns zero for a zero or unknown cost', () => {
        expect(applyMargin(0, 30).toString()).toBe('0')
        expect(applyMargin(null, 30).toString()).toBe('0')
    })

    it('never returns a negative price', () => {
        expect(applyMargin(100, -100).toString()).toBe('0')
    })

    it('keeps decimal precision instead of drifting through floats', () => {
        expect(applyMargin('1234.05', 0).toString()).toBe('1234')
    })
})

describe('marginFromPrices', () => {
    it('reports the implied margin', () => {
        expect(marginFromPrices(1000, 1250)).toBe(25)
        expect(marginFromPrices(375, 488)).toBeCloseTo(30.13, 2)
    })

    it('returns null when cost is unusable', () => {
        expect(marginFromPrices(0, 500)).toBeNull()
        expect(marginFromPrices(null, 500)).toBeNull()
        expect(marginFromPrices(100, null)).toBeNull()
    })
})
