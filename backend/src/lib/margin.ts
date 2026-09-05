import { Prisma } from '@prisma/client'

/**
 * Sale price derived from a purchase cost.
 *
 * Kept as Decimal end to end — money in this codebase is Prisma.Decimal, and a
 * round trip through JS floats turns 1 234,05 into 1 234,0500000000002 on the
 * purchase order.
 */

const ZERO = new Prisma.Decimal(0)
const HUNDRED = new Prisma.Decimal(100)

export const MIN_MARGIN_PERCENT = -100
export const MAX_MARGIN_PERCENT = 10_000

/** Coerces anything the API layer might hand us into a Decimal, or null. */
export function toDecimal(value: unknown): Prisma.Decimal | null {
    if (value === undefined || value === null || value === '') return null
    if (value instanceof Prisma.Decimal) return value
    if (typeof value === 'number') return Number.isFinite(value) ? new Prisma.Decimal(value) : null
    if (typeof value === 'string') {
        const trimmed = value.trim()
        if (!trimmed) return null
        try {
            return new Prisma.Decimal(trimmed)
        } catch {
            return null
        }
    }
    return null
}

/** Clamps a margin to a sane band; anything unparseable falls back to `fallback`. */
export function normalizeMarginPercent(value: unknown, fallback = 30): number {
    const decimal = toDecimal(value)
    if (!decimal) return fallback
    const num = decimal.toNumber()
    if (!Number.isFinite(num)) return fallback
    return Math.min(MAX_MARGIN_PERCENT, Math.max(MIN_MARGIN_PERCENT, num))
}

/**
 * `cost × (1 + margin/100)`, rounded to whole dinars.
 *
 * Algerian shelf prices are whole dinars, and a purchase order carrying
 * 487.5 DA would show as 487,5 everywhere downstream. Rounds half up.
 */
export function applyMargin(cost: unknown, marginPercent: unknown): Prisma.Decimal {
    const base = toDecimal(cost)
    if (!base || base.lte(ZERO)) return ZERO

    const margin = new Prisma.Decimal(normalizeMarginPercent(marginPercent))
    const multiplier = HUNDRED.plus(margin).dividedBy(HUNDRED)
    const raw = base.times(multiplier)
    if (raw.lte(ZERO)) return ZERO

    return raw.toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)
}

/**
 * The margin percentage implied by a cost/price pair, for showing the merchant
 * what a hand-typed sale price actually earns. Null when cost is unknown.
 */
export function marginFromPrices(cost: unknown, price: unknown): number | null {
    const base = toDecimal(cost)
    const sale = toDecimal(price)
    if (!base || !sale || base.lte(ZERO)) return null

    return sale.minus(base).dividedBy(base).times(HUNDRED).toDecimalPlaces(2).toNumber()
}
