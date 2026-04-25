import { describe, expect, it } from 'vitest'
import { LoyaltyFormulaService } from '../../backend/src/modules/loyalty/loyalty-formula.service'

describe('LoyaltyFormulaService', () => {
    const service = new LoyaltyFormulaService()

    it('computes points from base points plus margin factor per quantity', () => {
        const result = service.computeTotal(
            {
                loyaltyEnabled: true,
                loyaltyBasePoints: 2,
                loyaltyMarginFactor: 0.1
            },
            [
                {
                    quantity: 3,
                    referencePrice: 100,
                    cost: 40
                }
            ]
        )

        expect(result.lines[0].computedPointsPerUnit).toBe(8)
        expect(result.totalPoints).toBe(24)
    })

    it('builds a public preview without exposing sensitive cost details', () => {
        const preview = service.buildPublicPreview(
            {
                loyaltyEnabled: true,
                loyaltyBasePoints: 1,
                loyaltyMarginFactor: 0.2,
                loyaltyPublicFormulaMode: 'SUMMARY'
            },
            {
                quantity: 1,
                referencePrice: 50,
                cost: 10
            }
        )

        expect(preview?.enabled).toBe(true)
        expect(preview?.estimatedPoints).toBe(9)
        expect(preview?.displayText).toContain('points fidelite')
        expect(preview?.formulaBreakdown?.detail).not.toContain('10')
    })
})
