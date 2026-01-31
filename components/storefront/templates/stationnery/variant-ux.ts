export type SelectedOptions = Record<string, string>

type ProductOptionValue = {
    id: string
    label?: string
    optionId: string
}

type ProductOption = {
    id: string
    values: ProductOptionValue[]
}

type VariantOptionValue = {
    optionValueId: string
    optionValue?: { optionId: string }
}

export type ProductVariantLike = {
    id: string
    isActive?: boolean
    stock?: number
    reserved?: number
    safetyStock?: number
    trackInventory?: boolean
    price?: number | string
    images?: any[]
    optionValues?: VariantOptionValue[]
}

export type ProductLike = {
    options?: ProductOption[]
    variants?: ProductVariantLike[]
}

export type OptionValueState = 'available' | 'out_of_stock' | 'unavailable'

export const isVariantActive = (variant: ProductVariantLike): boolean => variant.isActive !== false

export const isVariantInStock = (variant: ProductVariantLike): boolean => {
    if (!isVariantActive(variant)) return false
    if (variant.trackInventory === false) return true
    const stock = Number(variant.stock ?? 0)
    const reserved = Number(variant.reserved ?? 0)
    const safety = Number(variant.safetyStock ?? 0)
    return Math.max(stock - reserved - safety, 0) > 0
}

export const selectionFromVariant = (variant: ProductVariantLike): SelectedOptions => {
    const selection: SelectedOptions = {}
    for (const ov of variant.optionValues ?? []) {
        const optionId = ov.optionValue?.optionId
        if (!optionId) continue
        selection[optionId] = ov.optionValueId
    }
    return selection
}

const variantMatchesSelection = (
    product: ProductLike,
    variant: ProductVariantLike,
    selection: SelectedOptions
): boolean => {
    const options = product.options ?? []
    const variantValueIds = new Set((variant.optionValues ?? []).map((ov) => ov.optionValueId))

    // If selection includes an optionId not present on product, ignore it (defensive).
    for (const opt of options) {
        const selectedValueId = selection[opt.id]
        if (!selectedValueId) continue
        if (!variantValueIds.has(selectedValueId)) return false
    }

    return true
}

export const getOptionValueState = (params: {
    product: ProductLike
    selectedOptions: SelectedOptions
    optionId: string
    valueId: string
}): OptionValueState => {
    const { product, selectedOptions, optionId, valueId } = params
    const variants = product.variants ?? []

    const candidateSelection: SelectedOptions = { ...selectedOptions, [optionId]: valueId }

    const matchingActive = variants.filter((v) => isVariantActive(v) && variantMatchesSelection(product, v, candidateSelection))

    if (matchingActive.length === 0) return 'unavailable'
    if (matchingActive.some((v) => isVariantInStock(v))) return 'available'
    return 'out_of_stock'
}

export const getPreferredInitialSelection = (product: ProductLike): SelectedOptions => {
    const options = product.options ?? []
    if (options.length === 0) return {}

    const variants = product.variants ?? []
    const inStockVariant = variants.find((v) => isVariantInStock(v))
    const activeVariant = variants.find((v) => isVariantActive(v))

    const base = inStockVariant ?? activeVariant

    const selection: SelectedOptions = base ? selectionFromVariant(base) : {}

    // Ensure every option gets a value (fallback to first value)
    for (const opt of options) {
        if (selection[opt.id]) continue
        const firstValueId = opt.values?.[0]?.id
        if (firstValueId) selection[opt.id] = firstValueId
    }

    return selection
}

export const findBestVariantForSelection = (params: {
    product: ProductLike
    selectedOptions: SelectedOptions
}): ProductVariantLike | null => {
    const { product, selectedOptions } = params
    const variants = product.variants ?? []

    const candidates = variants.filter((v) => isVariantActive(v) && variantMatchesSelection(product, v, selectedOptions))
    if (candidates.length === 0) return null

    const inStock = candidates.find((v) => isVariantInStock(v))
    return inStock ?? candidates[0] ?? null
}
