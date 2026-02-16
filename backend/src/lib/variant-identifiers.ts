import crypto from 'node:crypto'

export class VariantIdentifierError extends Error {
    statusCode: number
    statusMessage: string

    constructor(statusCode: number, statusMessage: string) {
        super(statusMessage)
        this.statusCode = statusCode
        this.statusMessage = statusMessage
    }
}

const SKU_MAX_LEN = 32
const SKU_PATTERN = /^[A-Z0-9_-]{1,32}$/

export function normalizeSkuInput(value: unknown, fieldName: string): string {
    if (typeof value !== 'string') {
        throw new VariantIdentifierError(400, `${fieldName} is required`)
    }

    const trimmed = value.trim()
    if (!trimmed) throw new VariantIdentifierError(400, `${fieldName} is required`)

    const normalized = trimmed.toUpperCase()
    if (normalized.length > SKU_MAX_LEN) {
        throw new VariantIdentifierError(400, `${fieldName} must be <= ${SKU_MAX_LEN} characters`)
    }
    if (!SKU_PATTERN.test(normalized)) {
        throw new VariantIdentifierError(400, `${fieldName} must match ${SKU_PATTERN.source}`)
    }

    return normalized
}

export function normalizeBarcodeInput(value: unknown): string | null {
    if (value === undefined || value === null) return null
    if (typeof value !== 'string') throw new VariantIdentifierError(400, 'barcode must be a string')
    const trimmed = value.trim()
    if (!trimmed) return null
    const normalized = trimmed.toUpperCase()
    if (normalized.length > SKU_MAX_LEN) {
        throw new VariantIdentifierError(400, `barcode must be <= ${SKU_MAX_LEN} characters`)
    }
    if (!SKU_PATTERN.test(normalized)) {
        throw new VariantIdentifierError(400, `barcode must match ${SKU_PATTERN.source}`)
    }
    return normalized
}

function normalizeSkuFromSlug(slug: unknown): string {
    const raw = typeof slug === 'string' ? slug.trim() : ''
    const upper = raw.toUpperCase()
    const safe = upper.replace(/[^A-Z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/(^-|-$)/g, '')
    return safe ? safe : 'SKU'
}

export function suggestSkuFromProduct(productSlug: unknown, signature: string): string {
    const base = normalizeSkuFromSlug(productSlug)
    if (!signature) return base.slice(0, SKU_MAX_LEN)

    const suffix = crypto.createHash('sha1').update(signature).digest('hex').slice(0, 6).toUpperCase()
    const baseMax = SKU_MAX_LEN - 1 - suffix.length
    return `${base.slice(0, baseMax)}-${suffix}`
}

