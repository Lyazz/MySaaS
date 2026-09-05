import { describe, expect, it } from 'vitest'
import {
    AUTO_MATCH_THRESHOLD,
    aliasKey,
    normalizeLabel,
    rankCandidates,
    similarity
} from '../../backend/src/lib/text-match'

describe('normalizeLabel', () => {
    it('upper-cases, strips accents and collapses punctuation', () => {
        expect(normalizeLabel('Chocolat  noir, 100g.')).toBe('CHOCOLAT NOIR 100G')
        expect(normalizeLabel('Café Éclair')).toBe('CAFE ECLAIR')
    })

    it('keeps Arabic letters', () => {
        expect(normalizeLabel('شوكولاتة سوداء')).toBe('شوكولاتة سوداء')
    })

    it('returns an empty string for non-strings', () => {
        expect(normalizeLabel(null)).toBe('')
        expect(normalizeLabel(42)).toBe('')
    })
})

describe('aliasKey', () => {
    it('ignores spacing so "100 G" and "100G" share a key', () => {
        expect(aliasKey('CHOC. NOIR 100 G')).toBe(aliasKey('choc noir 100g'))
    })
})

describe('similarity', () => {
    it('scores an exact match after normalization at 1', () => {
        expect(similarity('CHOC NOIR 100G', 'Choc. noir 100g')).toBe(1)
    })

    it('scores unrelated labels low', () => {
        expect(similarity('Chocolat noir 100g', 'Huile de tournesol 5L')).toBeLessThan(0.4)
    })

    it('tolerates a trailing unit spelling', () => {
        expect(similarity('CHOCOLAT NOIR 100G', 'CHOCOLAT NOIR 100 GR')).toBeGreaterThan(
            AUTO_MATCH_THRESHOLD
        )
    })

    it('tolerates word order and an extra word', () => {
        expect(similarity('Noir chocolat 100g', 'Chocolat noir 100g')).toBeGreaterThan(0.8)
    })

    it('returns 0 when either side is empty', () => {
        expect(similarity('', 'Chocolat')).toBe(0)
        expect(similarity('Chocolat', null)).toBe(0)
    })
})

describe('rankCandidates', () => {
    const items = [
        { id: 'a', text: 'Chocolat noir 100g' },
        { id: 'b', text: 'Chocolat au lait 100g' },
        { id: 'c', text: 'Huile de tournesol 5L' },
        { id: 'd', text: 'Sucre blanc 1kg' }
    ]

    it('returns the best match first', () => {
        const ranked = rankCandidates('CHOC. NOIR 100 G', items, (i) => i.text)
        expect(ranked[0]?.item.id).toBe('a')
    })

    it('honours the limit and drops anything under minScore', () => {
        const ranked = rankCandidates('chocolat', items, (i) => i.text, { limit: 2, minScore: 0.4 })
        expect(ranked.length).toBeLessThanOrEqual(2)
        expect(ranked.every((r) => r.score >= 0.4)).toBe(true)
        expect(ranked.map((r) => r.item.id)).not.toContain('c')
    })

    it('returns nothing for an empty query', () => {
        expect(rankCandidates('   ', items, (i) => i.text)).toEqual([])
    })
})
