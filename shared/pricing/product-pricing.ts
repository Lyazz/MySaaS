export type ProductLikeWithPromotion = {
    price?: unknown
    promotionalPrice?: unknown
}

export type ProductLikeWithPromotionSchedule = ProductLikeWithPromotion & {
    isPromotionActive?: unknown
    promotionStartDate?: unknown
    promotionEndDate?: unknown
    hasVariants?: unknown
    options?: unknown
    variants?: unknown
}

export type VariantLikeWithPromotionSchedule = ProductLikeWithPromotionSchedule & {
    optionValues?: unknown
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
    if (productUsesVariantPricing(product)) {
        return buildProductPricing({ price: basePriceInput ?? product?.price, promotionalPrice: null }, basePriceInput ?? product?.price)
    }
    if (!isPromotionActiveNow(product, nowInput)) {
        return buildProductPricing({ ...product, promotionalPrice: null }, basePriceInput)
    }
    return buildProductPricing(product, basePriceInput)
}

export const productUsesVariantPricing = (
    product: ProductLikeWithPromotionSchedule | null | undefined,
    variant?: VariantLikeWithPromotionSchedule | null
): boolean => {
    if (product?.hasVariants === true) return true

    if (Array.isArray(product?.options) && product.options.length > 0) {
        return true
    }

    if (Array.isArray(product?.variants)) {
        return product.variants.some((entry: any) => Array.isArray(entry?.optionValues) && entry.optionValues.length > 0)
    }

    if (Array.isArray(variant?.optionValues) && variant.optionValues.length > 0) {
        return true
    }

    return false
}

export const buildScopedProductPricing = (
    product: ProductLikeWithPromotionSchedule | null | undefined,
    variant?: VariantLikeWithPromotionSchedule | null,
    nowInput: Date = new Date()
): ProductPricing => {
    const useVariantPricing = productUsesVariantPricing(product, variant)

    if (useVariantPricing) {
        const basePrice = variant?.price ?? product?.price
        if (!variant) {
            return buildProductPricing({ price: basePrice, promotionalPrice: null }, basePrice)
        }

        if (!isPromotionActiveNow(variant, nowInput)) {
            return buildProductPricing({ price: basePrice, promotionalPrice: null }, basePrice)
        }

        return buildProductPricing(variant, basePrice)
    }

    return buildActiveProductPricing(product, product?.price, nowInput)
}
