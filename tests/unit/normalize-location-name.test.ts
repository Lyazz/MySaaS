import { describe, it, expect } from 'vitest'
import { normalizeLocationName } from '../../backend/src/modules/delivery/shared/normalize-location-name'

describe('normalizeLocationName', () => {
    it('lowercases and trims', () => {
        expect(normalizeLocationName('  Alger  ')).toBe('alger')
    })

    it('strips accents', () => {
        expect(normalizeLocationName('Béjaïa')).toBe('bejaia')
        expect(normalizeLocationName('Sidi Bel Abbès')).toBe('sidi bel abbes')
    })

    it('treats hyphens and underscores as spaces, and collapses whitespace', () => {
        expect(normalizeLocationName('El-Achour')).toBe('el achour')
        expect(normalizeLocationName('El   Achour')).toBe('el achour')
        expect(normalizeLocationName('El_Achour')).toBe('el achour')
    })

    it('makes differently-spelled variants of the same commune compare equal', () => {
        expect(normalizeLocationName('Béjaïa')).toBe(normalizeLocationName('Bejaia'))
        expect(normalizeLocationName('El-Achour')).toBe(normalizeLocationName('El Achour'))
    })

    it('handles nullish and non-string input', () => {
        expect(normalizeLocationName(undefined)).toBe('')
        expect(normalizeLocationName(null)).toBe('')
        expect(normalizeLocationName(16)).toBe('16')
    })
})
