export const PRODUCT_IMAGE_PLACEHOLDER_URL = '/blank.svg?v=2'

const asNonEmptyString = (value: unknown): string | null => {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
}

export const coalesceProductImageUrls = (legacyImages: unknown, productImages: any[]): string[] => {
    const legacy = Array.isArray(legacyImages)
        ? legacyImages.map((v) => asNonEmptyString(v)).filter((v): v is string => Boolean(v))
        : []

    if (legacy.length > 0) return legacy

    const normalizedProductImages = Array.isArray(productImages)
        ? productImages
            .map((img) => asNonEmptyString(img?.url))
            .filter((v): v is string => Boolean(v))
        : []

    if (normalizedProductImages.length > 0) return normalizedProductImages

    return [PRODUCT_IMAGE_PLACEHOLDER_URL]
}
