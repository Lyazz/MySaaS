import { describe, expect, it } from 'vitest'
import { normalizeMiniDescription, normalizeRichDescription } from '../../shared/product-content'

describe('product content normalization', () => {
    it('normalizes mini descriptions from HTML into readable plain text', () => {
        const result = normalizeMiniDescription('<p>Hello <strong>store</strong>&nbsp;owners</p>')
        expect(result).toBe('Hello store owners')
    })

    it('drops visually empty rich descriptions', () => {
        expect(normalizeRichDescription('<p><br></p>')).toBeNull()
        expect(normalizeRichDescription('   ')).toBeNull()
    })

    it('keeps rich descriptions with meaningful content or images', () => {
        expect(normalizeRichDescription('<p>Launch offer</p>')).toBe('<p>Launch offer</p>')
        expect(normalizeRichDescription('<p><img src="/uploads/demo.webp" alt="demo" /></p>')).toBe(
            '<p><img src="/uploads/demo.webp" alt="demo" /></p>'
        )
    })
})

