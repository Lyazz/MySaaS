import { describe, it, expect } from 'vitest'
import {
    PRICING_PLANS,
    PLAN_ORDER,
    YEARLY_DISCOUNT_PERCENT,
    annualDiscountPercent,
    buildDisplayPlan,
    getAnnualTotalDzd,
    getPlanByCode,
    isFreePlan,
    isPlanCode,
    maxAnnualDiscountPercent,
    planPriceForInterval,
    planRank,
    quotePlan
} from '../../shared/pricing/plans'
import {
    MONTHS_PER_INTERVAL,
    addUtcMonths,
    addBillingInterval,
    currentUsageWindow,
    daysBetween,
    normalizeInterval
} from '../../shared/pricing/billing-period'

describe('pricing catalogue', () => {
    it('exposes every plan in the tier order', () => {
        expect(PRICING_PLANS.map((p) => p.code)).toEqual([...PLAN_ORDER])
        expect(PLAN_ORDER.every((code) => getPlanByCode(code) !== null)).toBe(true)
    })

    it('rejects codes that are not plans', () => {
        expect(isPlanCode('merchant')).toBe(true)
        // 'premium' was referenced by the billing screen and has never existed.
        expect(isPlanCode('premium')).toBe(false)
        expect(planRank('premium')).toBe(-1)
        expect(planRank('basic')).toBeLessThan(planRank('professional'))
    })

    it('prices a monthly term as one month', () => {
        const merchant = getPlanByCode('merchant')!
        const quote = quotePlan(merchant, 'month')

        expect(quote.months).toBe(1)
        expect(quote.totalDzd).toBe(2990)
        expect(quote.monthlyEquivalentDzd).toBe(2990)
        expect(quote.savingsDzd).toBe(0)
    })

    it('prices a yearly term as twelve discounted months, not one', () => {
        const merchant = getPlanByCode('merchant')!
        const quote = quotePlan(merchant, 'year')

        // The regression this guards: `planPriceForInterval` used to return the
        // per-month annual rate (2 390 DA) as the charge for a whole year.
        expect(quote.months).toBe(12)
        expect(quote.monthlyEquivalentDzd).toBe(2390)
        expect(quote.totalDzd).toBe(28680)
        expect(quote.listTotalDzd).toBe(35880)
        expect(quote.savingsDzd).toBe(7200)
    })

    it('gives one answer for the yearly total everywhere', () => {
        for (const plan of PRICING_PLANS) {
            const total = quotePlan(plan, 'year').totalDzd
            expect(planPriceForInterval(plan, 'year')).toBe(total)
            expect(getAnnualTotalDzd(plan)).toBe(total)
            expect(plan.pricing.annualMonthlyAmountDzd * 12).toBe(total)
        }
    })

    it('delivers the annual discount it advertises', () => {
        for (const plan of PRICING_PLANS) {
            if (isFreePlan(plan)) {
                expect(annualDiscountPercent(plan)).toBe(0)
                continue
            }
            expect(Math.abs(annualDiscountPercent(plan) - YEARLY_DISCOUNT_PERCENT)).toBeLessThanOrEqual(1)
        }
    })

    it('never quotes a yearly term above the month-by-month price', () => {
        for (const plan of PRICING_PLANS) {
            const yearly = quotePlan(plan, 'year')
            expect(yearly.totalDzd).toBeLessThanOrEqual(yearly.listTotalDzd)
        }
    })

    it('keeps limits monotonic up the tier ladder', () => {
        for (let i = 1; i < PRICING_PLANS.length; i += 1) {
            const lower = PRICING_PLANS[i - 1]
            const upper = PRICING_PLANS[i]
            expect(upper.pricing.monthlyAmountDzd).toBeGreaterThan(lower.pricing.monthlyAmountDzd)
            expect(upper.ordersPerMonth).toBeGreaterThan(lower.ordersPerMonth)
            expect(upper.maxProducts).toBeGreaterThan(lower.maxProducts)
            expect(upper.maxPixels).toBeGreaterThan(lower.maxPixels)
        }
    })
})

describe('marketing plan cards', () => {
    // Echoes the key back with its params, so a card's wording is visible in the
    // assertion without pulling the locale files in.
    const t = (key: string, named?: Record<string, unknown>) =>
        named ? `${key}(${JSON.stringify(named)})` : key

    it('leads with the per-month price on both intervals', () => {
        const merchant = getPlanByCode('merchant')!

        // The headline used to switch unit as well as number when the toggle
        // flipped — 2 990 /mo became 28 680 /yr, which reads as a price rise.
        expect(buildDisplayPlan(merchant, 'month', t).price).toBe('2 990')
        expect(buildDisplayPlan(merchant, 'year', t).price).toBe('2 390')
        expect(buildDisplayPlan(merchant, 'year', t).period).toBe('pricing.period.perMonth')
    })

    it('states the real charge underneath the headline', () => {
        const merchant = getPlanByCode('merchant')!

        expect(buildDisplayPlan(merchant, 'year', t).billingNote).toContain('28 680 DA')
        expect(buildDisplayPlan(merchant, 'month', t).billingNote).toBe('pricing.billing.monthly')
        expect(buildDisplayPlan(getPlanByCode('basic')!, 'year', t).billingNote).toBe('pricing.billing.free')
    })

    it('prices whole dinars, with no stray decimals', () => {
        for (const plan of PRICING_PLANS) {
            for (const interval of ['month', 'year'] as const) {
                expect(buildDisplayPlan(plan, interval, t).price).not.toContain(',')
            }
        }
    })

    it('advertises a discount it actually gives', () => {
        const advertised = maxAnnualDiscountPercent()
        expect(advertised).toBe(YEARLY_DISCOUNT_PERCENT)

        // Every paid plan must reach the pill's promise, or the pill overstates.
        for (const plan of PRICING_PLANS) {
            if (isFreePlan(plan)) continue
            expect(annualDiscountPercent(plan)).toBeGreaterThanOrEqual(advertised)
        }
    })
})

describe('billing period maths', () => {
    it('clamps a month-end date instead of rolling it over', () => {
        // Date.UTC(y, 1, 31) silently becomes 3 March; that used to be a period end.
        expect(addUtcMonths(new Date('2026-01-31T10:00:00.000Z'), 1).toISOString()).toBe(
            '2026-02-28T10:00:00.000Z'
        )
        expect(addUtcMonths(new Date('2024-01-31T10:00:00.000Z'), 1).toISOString()).toBe(
            '2024-02-29T10:00:00.000Z'
        )
        expect(addUtcMonths(new Date('2026-08-31T10:00:00.000Z'), 1).toISOString()).toBe(
            '2026-09-30T10:00:00.000Z'
        )
    })

    it('keeps the time of day', () => {
        // Zeroing the clock used to shave up to a day off every paid term.
        expect(addUtcMonths(new Date('2026-03-15T23:45:12.500Z'), 1).toISOString()).toBe(
            '2026-04-15T23:45:12.500Z'
        )
    })

    it('handles year boundaries in both directions', () => {
        expect(addUtcMonths(new Date('2026-12-15T00:00:00.000Z'), 1).toISOString()).toBe(
            '2027-01-15T00:00:00.000Z'
        )
        expect(addUtcMonths(new Date('2026-01-15T00:00:00.000Z'), -1).toISOString()).toBe(
            '2025-12-15T00:00:00.000Z'
        )
    })

    it('maps an interval onto its term length', () => {
        expect(MONTHS_PER_INTERVAL).toEqual({ month: 1, year: 12 })
        expect(addBillingInterval(new Date('2026-03-15T00:00:00.000Z'), 'year').toISOString()).toBe(
            '2027-03-15T00:00:00.000Z'
        )
        expect(normalizeInterval('nonsense')).toBe('month')
        expect(normalizeInterval('year')).toBe('year')
    })

    describe('usage window', () => {
        it('is one month wide even on an annual subscription', () => {
            // The bug: an annual tenant's quota was counted over the full year, so
            // 1 500 orders/mo became 1 500 orders per twelve months.
            const anchor = new Date('2026-03-12T08:00:00.000Z')
            const window = currentUsageWindow(anchor, new Date('2026-09-01T00:00:00.000Z'))

            expect(window.start.toISOString()).toBe('2026-08-12T08:00:00.000Z')
            expect(window.end.toISOString()).toBe('2026-09-12T08:00:00.000Z')
            expect(window.index).toBe(5)
        })

        it('always contains the instant asked about', () => {
            const anchor = new Date('2026-01-31T23:30:00.000Z')
            for (const iso of [
                '2026-01-31T23:30:00.000Z',
                '2026-02-01T00:00:00.000Z',
                '2026-02-28T23:29:59.000Z',
                '2026-03-01T12:00:00.000Z',
                '2027-07-04T05:00:00.000Z'
            ]) {
                const now = new Date(iso)
                const window = currentUsageWindow(anchor, now)
                expect(window.start.getTime()).toBeLessThanOrEqual(now.getTime())
                expect(window.end.getTime()).toBeGreaterThan(now.getTime())
            }
        })

        it('falls back to the first window when the anchor is in the future', () => {
            const anchor = new Date('2026-10-01T00:00:00.000Z')
            const window = currentUsageWindow(anchor, new Date('2026-09-01T00:00:00.000Z'))
            expect(window.start.toISOString()).toBe(anchor.toISOString())
            expect(window.index).toBe(0)
        })
    })

    it('counts days to renewal, negative once lapsed', () => {
        const now = new Date('2026-09-01T00:00:00.000Z')
        expect(daysBetween(now, new Date('2026-09-11T00:00:00.000Z'))).toBe(10)
        expect(daysBetween(now, new Date('2026-08-29T00:00:00.000Z'))).toBe(-3)
    })
})
