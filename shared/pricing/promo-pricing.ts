/**
 * Promo code ("code promo") discount maths.
 *
 * Pure and cents-based like the other pricing modules: the service decides
 * which cart lines a code is allowed to touch, this decides how much comes off.
 */

export type PromoDiscountType = 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING'

export type PromoCodeRules = {
    discountType: PromoDiscountType
    /** Percent (0-100) for PERCENTAGE, a money amount for FIXED, unused for FREE_SHIPPING. */
    discountValue: number
    /** Caps a PERCENTAGE discount. Null/undefined means uncapped. */
    maxDiscountAmount?: number | null
}

export type PromoDiscountInput = {
    rules: PromoCodeRules
    /** Subtotal of the cart lines the code applies to, in cents. */
    eligibleSubtotalCents: number
    /** Whole cart subtotal in cents — the discount never exceeds it. */
    cartSubtotalCents: number
    /** Shipping in cents, only read by FREE_SHIPPING. */
    shippingCents?: number
}

export type PromoDiscountResult = {
    /** Money off the items, in cents. */
    itemsDiscountCents: number
    /** Money off the shipping, in cents. */
    shippingDiscountCents: number
}

const toCents = (value: unknown): number => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric) || numeric <= 0) return 0
    return Math.max(0, Math.floor(numeric))
}

const toPositiveNumber = (value: unknown): number => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric) || numeric <= 0) return 0
    return numeric
}

export const computePromoDiscount = (input: PromoDiscountInput): PromoDiscountResult => {
    const eligible = toCents(input.eligibleSubtotalCents)
    const cart = toCents(input.cartSubtotalCents)
    const shipping = toCents(input.shippingCents ?? 0)
    const type = input.rules?.discountType

    if (type === 'FREE_SHIPPING') {
        return { itemsDiscountCents: 0, shippingDiscountCents: shipping }
    }

    if (eligible <= 0) {
        return { itemsDiscountCents: 0, shippingDiscountCents: 0 }
    }

    let discountCents = 0

    if (type === 'PERCENTAGE') {
        // A percentage over 100 would hand money back; clamp it instead.
        const percent = Math.min(100, toPositiveNumber(input.rules.discountValue))
        discountCents = Math.round((eligible * percent) / 100)

        const cap = toPositiveNumber(input.rules.maxDiscountAmount)
        if (cap > 0) {
            discountCents = Math.min(discountCents, Math.round(cap * 100))
        }
    } else if (type === 'FIXED') {
        discountCents = Math.round(toPositiveNumber(input.rules.discountValue) * 100)
    }

    // Never more than the lines it applies to, and never more than the cart.
    discountCents = Math.min(discountCents, eligible, cart > 0 ? cart : eligible)

    return { itemsDiscountCents: Math.max(0, discountCents), shippingDiscountCents: 0 }
}

export type PromoWindow = {
    isActive: boolean
    startsAt?: Date | string | null
    endsAt?: Date | string | null
}

const asDate = (value: Date | string | null | undefined): Date | null => {
    if (!value) return null
    const date = value instanceof Date ? value : new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
}

/** Why a code cannot be used right now, or null when it can. */
export type PromoUnavailableReason =
    | 'INACTIVE'
    | 'NOT_STARTED'
    | 'EXPIRED'
    | 'USAGE_LIMIT_REACHED'
    | 'CUSTOMER_LIMIT_REACHED'
    | 'MIN_ORDER_NOT_MET'
    | 'NOT_APPLICABLE'

export const checkPromoWindow = (promo: PromoWindow, now: Date = new Date()): PromoUnavailableReason | null => {
    if (!promo.isActive) return 'INACTIVE'

    const startsAt = asDate(promo.startsAt)
    if (startsAt && now < startsAt) return 'NOT_STARTED'

    const endsAt = asDate(promo.endsAt)
    if (endsAt && now >= endsAt) return 'EXPIRED'

    return null
}

/** Codes are typed by hand: match them case- and whitespace-insensitively. */
export const normalizePromoCode = (value: unknown): string =>
    typeof value === 'string' ? value.trim().toUpperCase().replace(/\s+/g, '') : ''
