const NBSP_PATTERN = /&nbsp;|&#160;/gi
const HTML_TAG_PATTERN = /<[^>]*>/g
const MULTI_SPACE_PATTERN = /\s+/g
const ZERO_WIDTH_PATTERN = /[\u200B-\u200D\uFEFF]/g
const IMG_TAG_PATTERN = /<img\b[^>]*>/i

const toStringOrEmpty = (value: unknown): string => (typeof value === 'string' ? value : '')

const normalizePlainText = (value: string): string =>
    value
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(NBSP_PATTERN, ' ')
        .replace(HTML_TAG_PATTERN, ' ')
        .replace(ZERO_WIDTH_PATTERN, '')
        .replace(MULTI_SPACE_PATTERN, ' ')
        .trim()

export const normalizeMiniDescription = (value: unknown): string | null => {
    const raw = toStringOrEmpty(value).trim()
    if (!raw) return null

    const normalized = normalizePlainText(raw)
    return normalized.length > 0 ? normalized : null
}

export const normalizeRichDescription = (value: unknown): string | null => {
    const raw = toStringOrEmpty(value).trim()
    if (!raw) return null

    const normalizedText = normalizePlainText(raw)
    if (normalizedText.length === 0 && !IMG_TAG_PATTERN.test(raw)) {
        return null
    }

    return raw
}

