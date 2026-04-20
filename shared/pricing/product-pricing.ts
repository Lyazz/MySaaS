export type ProductLikeWithPromotion = {
    price?: unknown
    promotionalPrice?: unknown
}

export type ProductLikeWithPromotionSchedule = ProductLikeWithPromotion & {
    isPromotionActive?: unknown
    promotionStartDate?: unknown
    promotionEndDate?: unknown
}

export type ProductPricing = {
    originalPrice: number
    effectivePrice: number
    promotionApplied: boolean
    promotionDiscountPercent: number | null
}

export const toFiniteNumber = (value: unknown, fallback = 0): number => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

export const getPromotionalPrice = (product: ProductLikeWithPromotion | null | undefined): number | null => {
    if (!product) return null
    const rawPromotionalPrice = product.promotionalPrice
    if (rawPromotionalPrice === null || rawPromotionalPrice === undefined) return null
    if (typeof rawPromotionalPrice === 'string' && rawPromotionalPrice.trim().length === 0) return null

    const promotionalPrice = Number(rawPromotionalPrice)
    if (!Number.isFinite(promotionalPrice)) return null
    return promotionalPrice
}

const parseDate = (value: unknown): Date | null => {
    if (!value) return null
    const parsed = value instanceof Date ? value : new Date(String(value))
    return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const isPromotionActiveNow = (
    product: ProductLikeWithPromotionSchedule | null | undefined,
    nowInput: Date = new Date()
): boolean => {
    if (!product || product.isPromotionActive !== true) return false
    if (getPromotionalPrice(product) === null) return false

    const now = nowInput.getTime()
    const startDate = parseDate(product.promotionStartDate)
    if (startDate && startDate.getTime() > now) return false

    const endDate = parseDate(product.promotionEndDate)
    if (endDate && endDate.getTime() < now) return false

    return true
}

export const buildProductPricing = (
    product: ProductLikeWithPromotion | null | undefined,
    basePriceInput?: unknown
): ProductPricing => {
    const originalPrice = toFiniteNumber(basePriceInput ?? product?.price)
    const promotionalPrice = getPromotionalPrice(product)
    const promotionApplied = promotionalPrice !== null
    const effectivePrice = promotionApplied ? promotionalPrice : originalPrice
    const promotionDiscountPercent =
        originalPrice > 0 && effectivePrice < originalPrice
            ? Math.round(((originalPrice - effectivePrice) / originalPrice) * 100)
            : null

    return {
        originalPrice,
        effectivePrice,
        promotionApplied,
        promotionDiscountPercent
    }
}

export const buildActiveProductPricing = (
    product: ProductLikeWithPromotionSchedule | null | undefined,
    basePriceInput?: unknown,
    nowInput: Date = new Date()
): ProductPricing => {
    if (!product) return buildProductPricing(product, basePriceInput)
    if (!isPromotionActiveNow(product, nowInput)) {
        return buildProductPricing({ ...product, promotionalPrice: null }, basePriceInput)
    }
    return buildProductPricing(product, basePriceInput)
}
