import slugify from 'slugify'

export const CONTENT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const CONTENT_SLUG_RULE_HINT = 'Slug must contain only letters, numbers, and hyphens'

export const normalizeContentSlug = (value: unknown): string =>
    slugify(String(value ?? ''), {
        lower: true,
        strict: true,
        trim: true
    })

export const isValidContentSlug = (slug: unknown): boolean =>
    typeof slug === 'string' && CONTENT_SLUG_PATTERN.test(slug)
