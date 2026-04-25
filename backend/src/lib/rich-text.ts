import sanitizeHtml from 'sanitize-html'

const BASE_ALLOWED_RICH_TEXT_TAGS = [
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

const BASE_ALLOWED_RICH_TEXT_ATTRIBUTES = {
    a: ['href', 'target', 'rel']
}

type RichTextSanitizeOptions = {
    allowImages?: boolean
}

const buildSanitizeOptions = (opts?: RichTextSanitizeOptions): sanitizeHtml.IOptions => {
    const allowImages = opts?.allowImages === true

    return {
        allowedTags: allowImages ? [...BASE_ALLOWED_RICH_TEXT_TAGS, 'img'] : BASE_ALLOWED_RICH_TEXT_TAGS,
        allowedAttributes: allowImages
            ? {
                  ...BASE_ALLOWED_RICH_TEXT_ATTRIBUTES,
                  img: ['src', 'alt']
              }
            : BASE_ALLOWED_RICH_TEXT_ATTRIBUTES,
        allowedSchemes: ['http', 'https', 'mailto', 'tel'],
        allowedSchemesAppliedToAttributes: ['href', 'src'],
        allowProtocolRelative: false
    }
}

export const sanitizeRichText = (value: unknown, opts?: RichTextSanitizeOptions): string => {
    if (typeof value !== 'string') return ''
    return sanitizeHtml(value, buildSanitizeOptions(opts)).trim()
}

export const sanitizeOptionalRichText = (value: unknown, opts?: RichTextSanitizeOptions): string | null => {
    const sanitized = sanitizeRichText(value, opts)
    return sanitized.length > 0 ? sanitized : null
}
