import DOMPurify from 'isomorphic-dompurify'

const DEFAULT_ALLOWED_TAGS = [
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

const DEFAULT_ALLOWED_ATTR = ['href', 'target', 'rel']

export const useSafeRichText = () => {
    const sanitize = (
        input: unknown,
        opts?: {
            allowedTags?: string[]
            allowedAttr?: string[]
        }
    ): string => {
        const raw = typeof input === 'string' ? input : ''
        return DOMPurify.sanitize(raw, {
            ALLOWED_TAGS: opts?.allowedTags ?? DEFAULT_ALLOWED_TAGS,
            ALLOWED_ATTR: opts?.allowedAttr ?? DEFAULT_ALLOWED_ATTR
        })
    }

    return {
        sanitize
    }
}
