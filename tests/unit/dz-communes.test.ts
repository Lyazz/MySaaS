import { describe, it, expect } from 'vitest'
import { DZ_WILAYAS } from '../../shared/geo/dz'
import { DZ_COMMUNES, listDzCommunes } from '../../shared/geo/dz-communes'

describe('DZ_COMMUNES static fallback dataset', () => {
    it('has an entry for every wilaya in DZ_WILAYAS and no extras', () => {
        const wilayaCodes = DZ_WILAYAS.map((w) => w.code).sort()
        expect(Object.keys(DZ_COMMUNES).sort()).toEqual(wilayaCodes)
    })

    it('covers the full 1541-commune administrative division', () => {
        const total = Object.values(DZ_COMMUNES).reduce((n, list) => n + list.length, 0)
        expect(total).toBe(1541)
    })

    it('lists each wilaya sorted, non-empty, and free of blank/duplicate names', () => {
        for (const [code, list] of Object.entries(DZ_COMMUNES)) {
            expect(list.length, `wilaya ${code}`).toBeGreaterThan(0)
            expect(list.every((n) => n.trim().length > 0), `wilaya ${code} blanks`).toBe(true)
            expect(new Set(list).size, `wilaya ${code} dupes`).toBe(list.length)
            expect([...list], `wilaya ${code} order`).toEqual([...list].sort((a, b) => a.localeCompare(b)))
        }
    })

    it('listDzCommunes zero-pads and tolerates unknown codes', () => {
        expect(listDzCommunes('16')).toContain('Hydra')
        expect(listDzCommunes('6')).toEqual(listDzCommunes('06'))
        expect(listDzCommunes('')).toEqual([])
        expect(listDzCommunes('99')).toEqual([])
    })
})
