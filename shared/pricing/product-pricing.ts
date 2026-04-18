export type ProductLikeWithPromotion = {
    price?: unknown
    promotionalPrice?: unknown
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
