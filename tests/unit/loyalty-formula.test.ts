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

        expect(result.lines[0].productPointsPerUnit).toBe(6)
        expect(result.lines[0].totalPointsPerUnit).toBe(8)
        expect(result.basePointsTotal).toBe(6)
        expect(result.productPointsTotal).toBe(18)
        expect(result.totalPoints).toBe(24)
    })

    it('builds a public preview as base plus product points without exposing sensitive internals', () => {
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
        expect(preview?.basePoints).toBe(1)
        expect(preview?.productPoints).toBe(8)
        expect(preview?.totalPoints).toBe(9)
        expect(preview?.displayText).toContain('points fidelite')
        expect(preview).not.toHaveProperty('formulaBreakdown')
    })
})
