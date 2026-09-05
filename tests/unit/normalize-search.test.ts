import { describe, expect, it } from 'vitest'

import { normalizeSearchText } from '../../shared/text/normalize-search'

describe('normalizeSearchText', () => {
    it('normalizes Arabic alef variants to the same canonical form', () => {
        expect(normalizeSearchText('أبل')).toBe(normalizeSearchText('ابل'))
        expect(normalizeSearchText('إيمان')).toBe(normalizeSearchText('ايمان'))
        expect(normalizeSearchText('آدم')).toBe(normalizeSearchText('ادم'))
        expect(normalizeSearchText('ٱختبار')).toBe(normalizeSearchText('اختبار'))
    })

    it('normalizes teh marbuta and alef maqsura equivalently', () => {
        expect(normalizeSearchText('مدرسة')).toBe(normalizeSearchText('مدرسه'))
        expect(normalizeSearchText('هدى')).toBe(normalizeSearchText('هدي'))
    })

    it('strips Arabic harakat and Latin diacritics', () => {
        expect(normalizeSearchText('مُدَرِّسَة')).toBe(normalizeSearchText('مدرسه'))
        expect(normalizeSearchText('café')).toBe(normalizeSearchText('cafe'))
    })
})
