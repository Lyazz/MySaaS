import { Prisma } from '@prisma/client'

const toNumber = (value: unknown): number => {
    if (value instanceof Prisma.Decimal) return value.toNumber()
    if (typeof value === 'number') return value
    if (typeof value === 'string') return Number(value)
    if (value && typeof value === 'object' && 'toString' in value) return Number(String(value))
    return 0
}

export type LoyaltySettingsLike = {
    loyaltyEnabled?: boolean | null
    loyaltyBasePoints?: unknown
    loyaltyMarginFactor?: unknown
    loyaltyPublicFormulaMode?: string | null
}

export type LoyaltyLineInput = {
    quantity: number
    referencePrice: unknown
    cost: unknown
}

export type LoyaltyLineResult = {
    quantity: number
    referencePrice: number
    variantCost: number
    margin: number
    basePoints: number
    factor: number
    computedPointsPerUnit: number
    computedPoints: number
}

export class LoyaltyFormulaService {
    private roundPoints(value: number): number {
        if (!Number.isFinite(value)) return 0
        return Math.round(value)
    }

    isEnabled(settings: LoyaltySettingsLike | null | undefined) {
        return settings?.loyaltyEnabled === true
    }

    computeLine(settings: LoyaltySettingsLike | null | undefined, input: LoyaltyLineInput): LoyaltyLineResult {
        const quantity = Math.max(1, Math.trunc(Number(input.quantity || 0) || 0))
        const referencePrice = toNumber(input.referencePrice)
        const variantCost = toNumber(input.cost)
        const basePoints = toNumber(settings?.loyaltyBasePoints)
        const factor = toNumber(settings?.loyaltyMarginFactor)
        const margin = referencePrice - variantCost
        const computedPointsPerUnit = this.roundPoints(basePoints + (margin * factor))
        const computedPoints = computedPointsPerUnit * quantity

        return {
            quantity,
            referencePrice,
            variantCost,
            margin,
            basePoints,
            factor,
            computedPointsPerUnit,
            computedPoints
        }
    }

    computeTotal(settings: LoyaltySettingsLike | null | undefined, lines: LoyaltyLineInput[]) {
        const computedLines = lines.map((line) => this.computeLine(settings, line))
        return {
            totalPoints: computedLines.reduce((sum, line) => sum + line.computedPoints, 0),
            lines: computedLines
        }
    }

    buildPublicPreview(settings: LoyaltySettingsLike | null | undefined, input: LoyaltyLineInput) {
        if (!this.isEnabled(settings)) return null

        const computed = this.computeLine(settings, input)
        const parts: string[] = []
        if (computed.basePoints !== 0) {
            parts.push(computed.basePoints > 0 ? `inclut une base de ${computed.basePoints} pts` : `inclut une base de ${computed.basePoints} pts`)
        }
        if (computed.factor !== 0) {
            parts.push('ajusté selon ce produit')
        }

        return {
            enabled: true,
            estimatedPoints: computed.computedPoints,
            displayText:
                computed.computedPoints === 0
                    ? '0 point fidelite estime'
                    : `${computed.computedPoints} points fidelite estimes`,
            formulaBreakdown: {
                mode: settings?.loyaltyPublicFormulaMode || 'SUMMARY',
                detail: parts.length > 0 ? parts.join(' + ') : 'calcul standard de fidelite'
            }
        }
    }
}

