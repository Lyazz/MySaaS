import { describe, it, expect } from 'vitest'
import { parseCsv } from '../../backend/src/lib/csv'

describe('parseCsv', () => {
    it('reports which header columns are empty', () => {
        const csv = ',id,slug\n1,a,b\n'
        expect(() => parseCsv(csv)).toThrow(/empty column names/i)
        expect(() => parseCsv(csv)).toThrow(/column\(s\):\s*1/i)
    })
})
