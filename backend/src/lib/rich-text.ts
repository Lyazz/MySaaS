import sanitizeHtml from 'sanitize-html'

const ALLOWED_RICH_TEXT_TAGS = [
    'p',
    'br',
    'ul',
    'ol',
    'li',
    'strong',
    'em',
    'b',
    'i',
    'u',
    'blockquote',
    'h2',
    'h3',
    'h4',
    'a'
]

const ALLOWED_RICH_TEXT_ATTRIBUTES = {
    a: ['href', 'target', 'rel']
}

const sanitizeOptions: sanitizeHtml.IOptions = {
    allowedTags: ALLOWED_RICH_TEXT_TAGS,
    allowedAttributes: ALLOWED_RICH_TEXT_ATTRIBUTES,
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesAppliedToAttributes: ['href'],
    allowProtocolRelative: false
}

export const sanitizeRichText = (value: unknown): string => {
    if (typeof value !== 'string') return ''
    return sanitizeHtml(value, sanitizeOptions).trim()
}

export const sanitizeOptionalRichText = (value: unknown): string | null => {
    const sanitized = sanitizeRichText(value)
    return sanitized.length > 0 ? sanitized : null
}
