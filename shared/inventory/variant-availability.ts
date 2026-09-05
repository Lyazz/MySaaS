export type VariantAvailabilityLike = {
    stock?: unknown
    reserved?: unknown
    safetyStock?: unknown
    trackInventory?: unknown
}

export const PRODUCT_INFINITE_STOCK = 999999

const toFiniteInt = (value: unknown, fallback = 0) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return fallback
    return Math.trunc(parsed)
}

export const getVariantAvailableStock = (
    variant: VariantAvailabilityLike | null | undefined,
    opts?: { infiniteValue?: number }
): number => {
    const infiniteValue = opts?.infiniteValue ?? Number.POSITIVE_INFINITY
    if (!variant) return 0
    if (variant.trackInventory === false) return infiniteValue

    const stock = toFiniteInt(variant.stock)
    const reserved = toFiniteInt(variant.reserved)
    const safetyStock = toFiniteInt(variant.safetyStock)
    return Math.max(stock - reserved - safetyStock, 0)
}

export const hasVariantInventoryBalance = (variant: VariantAvailabilityLike | null | undefined): boolean => {
    if (!variant) return false
    return (
        toFiniteInt(variant.stock) !== 0 ||
        toFiniteInt(variant.reserved) !== 0 ||
        toFiniteInt(variant.safetyStock) !== 0
    )
}

export const getVariantInventoryBalance = (variant: VariantAvailabilityLike | null | undefined) => ({
    stock: toFiniteInt(variant?.stock),
    reserved: toFiniteInt(variant?.reserved),
    safetyStock: toFiniteInt(variant?.safetyStock)
})
