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
    productPointsPerUnit: number
    productPoints: number
    totalPointsPerUnit: number
    totalPoints: number
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
        const basePoints = this.roundPoints(toNumber(settings?.loyaltyBasePoints))
        const factor = toNumber(settings?.loyaltyMarginFactor)
        const margin = referencePrice - variantCost
        const productPointsPerUnit = this.roundPoints(margin * factor)
        const totalPointsPerUnit = basePoints + productPointsPerUnit
        const productPoints = productPointsPerUnit * quantity
        const totalPoints = totalPointsPerUnit * quantity

        return {
            quantity,
            referencePrice,
            variantCost,
            margin,
            basePoints,
            factor,
            productPointsPerUnit,
            productPoints,
            totalPointsPerUnit,
            totalPoints
        }
    }

    computeTotal(settings: LoyaltySettingsLike | null | undefined, lines: LoyaltyLineInput[]) {
        const computedLines = lines.map((line) => this.computeLine(settings, line))
        return {
            basePointsTotal: computedLines.reduce((sum, line) => sum + (line.basePoints * line.quantity), 0),
            productPointsTotal: computedLines.reduce((sum, line) => sum + line.productPoints, 0),
            totalPoints: computedLines.reduce((sum, line) => sum + line.totalPoints, 0),
            lines: computedLines
        }
    }

    buildPublicPreview(settings: LoyaltySettingsLike | null | undefined, input: LoyaltyLineInput) {
        if (!this.isEnabled(settings)) return null

        const computed = this.computeLine(settings, input)

        return {
            enabled: true,
            basePoints: computed.basePoints * computed.quantity,
            productPoints: computed.productPoints,
            totalPoints: computed.totalPoints,
            displayText:
                computed.totalPoints === 0
                    ? '0 point fidelite estime'
                    : `${computed.totalPoints} points fidelite estimes`,
            mode: settings?.loyaltyPublicFormulaMode || 'SUMMARY'
        }
    }
}
