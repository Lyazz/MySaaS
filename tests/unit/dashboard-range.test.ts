import { describe, it, expect } from 'vitest'
import { buildDashboardRangeQuery, defaultCustomDateRange } from '../../composables/admin/dashboardRange'

describe('dashboard range query helpers', () => {
    it('builds query for preset ranges', () => {
        expect(buildDashboardRangeQuery('7d')).toEqual({ range: '7d' })
        expect(buildDashboardRangeQuery('30d')).toEqual({ range: '30d' })
        expect(buildDashboardRangeQuery('90d')).toEqual({ range: '90d' })
    })

    it('builds query for custom range when dates are present', () => {
        const query = buildDashboardRangeQuery('custom', '2026-04-01', '2026-04-10')
        expect(query).toEqual({
            range: 'custom',
            from: '2026-04-01',
            to: '2026-04-10'
        })
    })

    it('throws for custom range without both dates', () => {
        expect(() => buildDashboardRangeQuery('custom', '2026-04-01', null)).toThrow()
        expect(() => buildDashboardRangeQuery('custom', null, '2026-04-10')).toThrow()
    })

    it('returns a valid default custom date window', () => {
        const out = defaultCustomDateRange(new Date('2026-04-21T12:00:00Z'))
        expect(out).toEqual({
            from: '2026-04-15',
            to: '2026-04-21'
        })
    })
})
