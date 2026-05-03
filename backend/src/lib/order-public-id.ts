import { randomBytes } from 'node:crypto'

export const DEFAULT_ORDER_ID_PREFIX = 'ORDR'
export const ORDER_ID_PREFIX_REGEX = /^[A-Z0-9]{4,5}$/

const ORDER_ID_SUFFIX_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ORDER_ID_SUFFIX_LENGTH = 6

export const sanitizeOrderIdPrefix = (value: unknown) =>
    typeof value === 'string' ? value.trim().toUpperCase() : ''

export const isValidOrderIdPrefix = (value: string) => ORDER_ID_PREFIX_REGEX.test(value)

export const normalizeOrderIdPrefix = (value: unknown) => {
    const sanitized = sanitizeOrderIdPrefix(value)
    return isValidOrderIdPrefix(sanitized) ? sanitized : DEFAULT_ORDER_ID_PREFIX
}

export const generatePublicOrderId = (prefix: unknown) => {
    const normalizedPrefix = normalizeOrderIdPrefix(prefix)
    const bytes = randomBytes(ORDER_ID_SUFFIX_LENGTH)
    let suffix = ''

    for (const byte of bytes) {
        suffix += ORDER_ID_SUFFIX_ALPHABET[byte % ORDER_ID_SUFFIX_ALPHABET.length]
    }

    return `${normalizedPrefix}-${suffix}`
}
