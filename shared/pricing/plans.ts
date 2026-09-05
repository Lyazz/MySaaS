import { formatPriceAmount } from './money-format'
import { MONTHS_PER_INTERVAL, normalizeInterval, type BillingInterval } from './billing-period'

export type { BillingInterval }

export type PlanCode = 'basic' | 'beginner' | 'merchant' | 'professional'

export type PricingAmountDzd = number

export type PlanCurrency = 'DA'

export interface PlanPricing {
    currency: PlanCurrency
    /** Charged every month on monthly billing. */
    monthlyAmountDzd: PricingAmountDzd
    /**
     * Effective price *per month* when the year is paid upfront — not the yearly
     * total.
     *
     * This field used to be called `annualAmountDzd`, and the ambiguity cost us
     * three different answers to "what does a year cost?": the backend charged
     * it as-is (1 190 DA for twelve months), the marketing page recomputed
     * `monthly × 12 × 0.8` (14 304 DA) and the billing screen did `× 12`
     * (14 280 DA). Nothing multiplies this by hand any more — `quotePlan` is the
     * only way to get a chargeable amount out of a plan.
     */
    annualMonthlyAmountDzd: PricingAmountDzd
}

export interface PlanDefinition {
    code: PlanCode
    name: string
    description: string
    pricing: PlanPricing
    ordersPerMonth: number
    maxProducts: number
    maxPixels: number
    /**
     * Document pages the tenant may push through AI import each month.
     * 0 turns the feature off entirely, the same way a 0 order limit is read as
     * "not metered" — see `AiDocumentsService.enforceScanQuota`.
     */
    aiScansPerMonth: number
    flags?: {
        popular?: boolean
        highlight?: boolean
    }
}

/** Subscription prices are whole dinars — "1 190 DA", never "1 190,00 DA". */
const dzd = (amount: number) =>
    formatPriceAmount(amount, { minimumFractionDigits: 0, maximumFractionDigits: 0 })

/**
 * The annual discount we advertise. Each paid plan's `annualMonthlyAmountDzd` is
 * authored to land on it after rounding to a tidy number;
 * `annualDiscountPercent` reports what a plan actually gives so a card can never
 * promise a discount the checkout does not apply.
 */
export const YEARLY_DISCOUNT_PERCENT = 20

/** Cheapest to most expensive. Drives upgrade/downgrade wording. */
export const PLAN_ORDER: readonly PlanCode[] = ['basic', 'beginner', 'merchant', 'professional'] as const

export const PRICING_PLANS: readonly PlanDefinition[] = [
    {
        code: 'basic',
        name: 'Basic',
        description: 'Best for trying out',
        pricing: { currency: 'DA', monthlyAmountDzd: 0, annualMonthlyAmountDzd: 0 },
        ordersPerMonth: 150,
        maxProducts: 30,
        maxPixels: 1,
        aiScansPerMonth: 0
    },
    {
        code: 'beginner',
        name: 'Beginner',
        description: 'A simple start to boost your store',
        pricing: { currency: 'DA', monthlyAmountDzd: 1490, annualMonthlyAmountDzd: 1190 },
        ordersPerMonth: 500,
        maxProducts: 150,
        maxPixels: 2,
        aiScansPerMonth: 20
    },
    {
        code: 'merchant',
        name: 'Merchant',
        description: 'Smart choice for growing businesses',
        pricing: { currency: 'DA', monthlyAmountDzd: 2990, annualMonthlyAmountDzd: 2390 },
        ordersPerMonth: 1500,
        maxProducts: 500,
        maxPixels: 5,
        aiScansPerMonth: 100,
        flags: { popular: true }
    },
    {
        code: 'professional',
        name: 'Professional',
        description: 'Built for scaling with confidence',
        pricing: { currency: 'DA', monthlyAmountDzd: 4490, annualMonthlyAmountDzd: 3590 },
        ordersPerMonth: 5000,
        maxProducts: 2000,
        maxPixels: 10,
        aiScansPerMonth: 400,
        flags: { highlight: true }
    }
] as const

export const getPlanByCode = (code: PlanCode): PlanDefinition | null =>
    (PRICING_PLANS as readonly PlanDefinition[]).find((p) => p.code === code) ?? null

export const isPlanCode = (value: unknown): value is PlanCode =>
    typeof value === 'string' && (PLAN_ORDER as readonly string[]).includes(value)

/** Position in the tier ladder, or -1 for an unknown code. */
export const planRank = (code: string): number => (PLAN_ORDER as readonly string[]).indexOf(code)

export const isFreePlan = (plan: Pick<PlanDefinition, 'pricing'>): boolean =>
    plan.pricing.monthlyAmountDzd === 0

/**
 * Everything a caller needs to charge, display or compare one plan on one
 * interval. The single source of truth for money in this codebase.
 */
export interface PlanQuote {
    planCode: PlanCode
    interval: BillingInterval
    /** Months covered by one payment. */
    months: number
    currency: PlanCurrency
    /** Headline per-month figure for this interval. */
    monthlyEquivalentDzd: PricingAmountDzd
    /** What is actually charged for one term — the amount that hits the ledger. */
    totalDzd: PricingAmountDzd
    /** The same span paid month by month, for the savings comparison. */
    listTotalDzd: PricingAmountDzd
    savingsDzd: PricingAmountDzd
    savingsPercent: number
}

export const quotePlan = (plan: PlanDefinition, interval: BillingInterval): PlanQuote => {
    const normalized = normalizeInterval(interval)
    const months = MONTHS_PER_INTERVAL[normalized]
    const monthlyEquivalentDzd =
        normalized === 'year' ? plan.pricing.annualMonthlyAmountDzd : plan.pricing.monthlyAmountDzd

    const totalDzd = monthlyEquivalentDzd * months
    const listTotalDzd = plan.pricing.monthlyAmountDzd * months
    const savingsDzd = Math.max(0, listTotalDzd - totalDzd)

    return {
        planCode: plan.code,
        interval: normalized,
        months,
        currency: plan.pricing.currency,
        monthlyEquivalentDzd,
        totalDzd,
        listTotalDzd,
        savingsDzd,
        savingsPercent: listTotalDzd > 0 ? Math.round((savingsDzd / listTotalDzd) * 100) : 0
    }
}

/** What a plan actually discounts for paying yearly, as a whole percentage. */
export const annualDiscountPercent = (plan: PlanDefinition): number =>
    quotePlan(plan, 'year').savingsPercent

/**
 * Best annual discount on offer, for the "save N%" pill.
 *
 * Read off the catalogue rather than hardcoded, so the pill cannot advertise a
 * discount the checkout does not actually apply.
 */
export const maxAnnualDiscountPercent = (): number =>
    PRICING_PLANS.reduce((best, plan) => Math.max(best, annualDiscountPercent(plan)), 0)

/** Amount charged for one term of [interval]. */
export const planPriceForInterval = (plan: PlanDefinition, interval: BillingInterval): PricingAmountDzd =>
    quotePlan(plan, interval).totalDzd

/** Total charged for twelve months paid upfront. */
export const getAnnualTotalDzd = (plan: PlanDefinition): PricingAmountDzd => quotePlan(plan, 'year').totalDzd

const PLAN_FEATURE_KEYS: Record<PlanCode, string[]> = {
    basic: ['pricing.page.features.store', 'pricing.page.features.delivery'],
    beginner: ['pricing.page.features.store', 'pricing.page.features.delivery', 'pricing.page.features.upsell'],
    merchant: ['pricing.page.features.store', 'pricing.page.features.delivery', 'pricing.page.features.upsell', 'pricing.page.features.analytics'],
    professional: ['pricing.page.features.store', 'pricing.page.features.delivery', 'pricing.page.features.upsell', 'pricing.page.features.analytics', 'pricing.page.features.team']
}

export interface DisplayPlan {
    code: PlanCode
    name: string
    description: string
    /** Always the per-month figure — see `billingNote` for what is charged. */
    price: string
    currency: PlanCurrency
    period: string
    /** "Billed 14 280 DA once a year", "Billed every month", or the free line. */
    billingNote: string
    features: string[]
    cta: string
    popular: boolean
    highlight: boolean
}

type Translator = (key: string, named?: Record<string, unknown>) => string

/**
 * Builds a marketing plan card.
 *
 * The headline is the per-month price on both intervals, with the real charge
 * spelled out underneath. Leading with the yearly *total* — as this used to —
 * made the discounted option look like the expensive one at a glance, changed
 * the unit as well as the number when the toggle flipped, and disagreed with the
 * admin billing screen, which always showed per-month.
 */
export const buildDisplayPlan = (
    plan: PlanDefinition,
    interval: BillingInterval,
    t: Translator
): DisplayPlan => {
    const quote = quotePlan(plan, interval)

    const billingNote = isFreePlan(plan)
        ? t('pricing.billing.free')
        : quote.interval === 'year'
          ? t('pricing.billing.yearly', { total: `${dzd(quote.totalDzd)} ${quote.currency}` })
          : t('pricing.billing.monthly')

    return {
        code: plan.code,
        name: t(`pricing.plans.${plan.code}.name`),
        description: t(`pricing.plans.${plan.code}.description`),
        price: dzd(quote.monthlyEquivalentDzd),
        currency: quote.currency,
        period: t('pricing.period.perMonth'),
        billingNote,
        features: [
            t('pricing.features.ordersPerMonth', { count: plan.ordersPerMonth }),
            t('pricing.features.maxProducts', { count: plan.maxProducts }),
            t('pricing.features.maxPixels', { count: plan.maxPixels }),
            ...(plan.aiScansPerMonth > 0
                ? [t('pricing.features.aiScansPerMonth', { count: plan.aiScansPerMonth })]
                : []),
            ...PLAN_FEATURE_KEYS[plan.code].map((k) => t(k))
        ],
        cta: t(`pricing.plans.${plan.code}.cta`),
        popular: Boolean(plan.flags?.popular),
        highlight: Boolean(plan.flags?.highlight)
    }
}
