import { formatPriceAmount } from './money-format'

export type BillingInterval = 'month' | 'year'

export type PlanCode = 'basic' | 'beginner' | 'merchant' | 'professional'

export type PricingAmountDzd = number

export interface PlanDefinition {
    code: PlanCode
    name: string
    description: string
    pricing: {
        currency: 'DA'
        monthlyAmountDzd: PricingAmountDzd
        annualAmountDzd: PricingAmountDzd
    }
    ordersPerMonth: number
    maxProducts: number
    maxPixels: number
    flags?: {
        popular?: boolean
        highlight?: boolean
    }
}

export interface PricingPlanCard {
    code: PlanCode
    name: string
    description: string
    priceText: string
    periodText: string
    currency: 'DA'
    features: Array<{ text: string; included: true }>
    cta: string
    popular: boolean
    highlight: boolean
}

const dzd = (amount: number) => formatPriceAmount(amount)

export const YEARLY_DISCOUNT_PERCENT = 20

export const getAnnualTotalDzd = (plan: PlanDefinition): PricingAmountDzd =>
    Math.round(plan.pricing.monthlyAmountDzd * 12 * (1 - YEARLY_DISCOUNT_PERCENT / 100))

export const PRICING_PLANS: readonly PlanDefinition[] = [
    {
        code: 'basic',
        name: 'Basic',
        description: 'Best for trying out',
        pricing: { currency: 'DA', monthlyAmountDzd: 0, annualAmountDzd: 0 },
        ordersPerMonth: 150,
        maxProducts: 30,
        maxPixels: 1
    },
    {
        code: 'beginner',
        name: 'Beginner',
        description: 'A simple start to boost your store',
        pricing: { currency: 'DA', monthlyAmountDzd: 1490, annualAmountDzd: 1190 },
        ordersPerMonth: 500,
        maxProducts: 150,
        maxPixels: 2
    },
    {
        code: 'merchant',
        name: 'Merchant',
        description: 'Smart choice for growing businesses',
        pricing: { currency: 'DA', monthlyAmountDzd: 2990, annualAmountDzd: 2390 },
        ordersPerMonth: 1500,
        maxProducts: 500,
        maxPixels: 5,
        flags: { popular: true }
    },
    {
        code: 'professional',
        name: 'Professional',
        description: 'Built for scaling with confidence',
        pricing: { currency: 'DA', monthlyAmountDzd: 4490, annualAmountDzd: 3590 },
        ordersPerMonth: 5000,
        maxProducts: 2000,
        maxPixels: 10,
        flags: { highlight: true }
    }
] as const

export const getPlanByCode = (code: PlanCode): PlanDefinition | null =>
    (PRICING_PLANS as readonly PlanDefinition[]).find((p) => p.code === code) ?? null

export const planPriceForInterval = (plan: PlanDefinition, interval: BillingInterval): PricingAmountDzd =>
    interval === 'year' ? plan.pricing.annualAmountDzd : plan.pricing.monthlyAmountDzd

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
    price: string
    currency: 'DA'
    period: string
    features: string[]
    cta: string
    popular: boolean
    highlight: boolean
}

type Translator = (key: string, named?: Record<string, unknown>) => string

export const buildDisplayPlan = (
    plan: PlanDefinition,
    interval: BillingInterval,
    t: Translator
): DisplayPlan => {
    const card = pricingPlanCardForUi(plan, interval)
    return {
        code: plan.code,
        name: t(`pricing.plans.${plan.code}.name`),
        description: t(`pricing.plans.${plan.code}.description`),
        price: card.priceText,
        currency: card.currency,
        period: interval === 'year' ? t('pricing.period.perYear') : t('pricing.period.perMonth'),
        features: [
            t('pricing.features.ordersPerMonth', { count: plan.ordersPerMonth }),
            t('pricing.features.maxProducts', { count: plan.maxProducts }),
            t('pricing.features.maxPixels', { count: plan.maxPixels }),
            ...PLAN_FEATURE_KEYS[plan.code].map((k) => t(k))
        ],
        cta: t(`pricing.plans.${plan.code}.cta`),
        popular: card.popular,
        highlight: card.highlight
    }
}

export const pricingPlanCardForUi = (plan: PlanDefinition, interval: BillingInterval): PricingPlanCard => {
    const amount = interval === 'year' ? getAnnualTotalDzd(plan) : plan.pricing.monthlyAmountDzd
    const priceText = dzd(amount)

    const popular = Boolean(plan.flags?.popular)
    const highlight = Boolean(plan.flags?.highlight)
    const cta = plan.code === 'professional' ? 'Get 15 days for free' : 'Get Started'

    return {
        code: plan.code,
        name: plan.name,
        description: plan.description,
        priceText,
        currency: plan.pricing.currency,
        periodText: interval === 'year' ? '/yr' : '/mo',
        features: [{ text: `${plan.ordersPerMonth} Orders/mo`, included: true }],
        cta,
        popular,
        highlight
    }
}
