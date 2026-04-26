import slugify from 'slugify'

export const CONTENT_SLUG_PATTERN = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u

export const CONTENT_SLUG_RULE_HINT = 'Slug must contain only letters (including Arabic), numbers, and hyphens'

const ARABIC_UNICODE_RANGES: Array<[number, number]> = [
    [0x0600, 0x06ff],
    [0x0750, 0x077f],
    [0x08a0, 0x08ff],
    [0xfb50, 0xfdff],
    [0xfe70, 0xfeff]
]

let isArabicMapExtended = false

const buildArabicIdentityMap = (): Record<string, string> => {
    const identityMap: Record<string, string> = {}
    for (const [start, end] of ARABIC_UNICODE_RANGES) {
        for (let codePoint = start; codePoint <= end; codePoint += 1) {
            const char = String.fromCodePoint(codePoint)
            identityMap[char] = char
        }
    }
    return identityMap
}

const ensureArabicCharactersArePreserved = (): void => {
    if (isArabicMapExtended) return
    slugify.extend(buildArabicIdentityMap())
    isArabicMapExtended = true
}

export const normalizeContentSlug = (value: unknown): string =>
    slugify(String(value ?? ''), {
        lower: true,
        strict: false,
        remove: /[^\p{L}\p{N}\s-]/gu,
        trim: true
    })
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')

export const isValidContentSlug = (slug: unknown): boolean =>
    typeof slug === 'string' && CONTENT_SLUG_PATTERN.test(slug)

ensureArabicCharactersArePreserved()
