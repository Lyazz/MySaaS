export type ClearanceLine = {
    key: string
    unitPriceCents: number
    quantity: number
}

export type ClearanceDiscountResult = {
    eligibleQuantity: number
    freeCount: number
    discountCents: number
    freeUnits: { key: string; unitPriceCents: number }[]
}

export const computeClearanceDiscount = (args: {
    lines: ClearanceLine[]
    multiple: number
    divisor: number
}): ClearanceDiscountResult => {
    const multiple = Math.max(1, Math.floor(args.multiple || 0) || 1)
    const divisor = Math.max(1, Math.floor(args.divisor || 0) || 1)

    const units: { key: string; unitPriceCents: number }[] = []
    for (const line of args.lines || []) {
        const quantity = Math.max(0, Math.floor(line.quantity || 0))
        const unitPriceCents = Math.max(0, Math.floor(line.unitPriceCents || 0))
        for (let i = 0; i < quantity; i++) {
            units.push({ key: line.key, unitPriceCents })
        }
    }

    const totalQuantity = units.length
    const eligibleQuantity = Math.floor(totalQuantity / multiple) * multiple
    const freeCount = Math.floor(eligibleQuantity / divisor)

    if (freeCount <= 0) {
        return { eligibleQuantity, freeCount: 0, discountCents: 0, freeUnits: [] }
    }

    const sorted = [...units].sort((a, b) => a.unitPriceCents - b.unitPriceCents)
    const freeUnits = sorted.slice(0, freeCount)
    const discountCents = freeUnits.reduce((sum, u) => sum + u.unitPriceCents, 0)

    return { eligibleQuantity, freeCount, discountCents, freeUnits }
}
