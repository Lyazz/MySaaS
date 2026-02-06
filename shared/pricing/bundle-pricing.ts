export type BundleDealCents = {
    bundleQty: number
    bundlePriceCents: number
}

export type BundlePricingBreakdownItem =
    | {
        kind: 'single'
        qty: number
        unitPriceCents: number
        totalCents: number
    }
    | {
        kind: 'bundle'
        bundleQty: number
        bundlePriceCents: number
        count: number
        totalCents: number
    }

export type BundlePricingResult = {
    quantity: number
    unitPriceCents: number
    baseTotalCents: number
    bestTotalCents: number
    savingsCents: number
    breakdown: BundlePricingBreakdownItem[]
}

export const moneyToCents = (amount: number): number => {
    if (!Number.isFinite(amount)) return 0
    return Math.round(amount * 100)
}

export const centsToMoney = (cents: number): number => Math.round(cents) / 100

export const computeBestBundleTotal = (args: {
    quantity: number
    unitPriceCents: number
    bundleDeals: BundleDealCents[]
}): BundlePricingResult => {
    const quantity = Math.max(0, Math.floor(args.quantity || 0))
    const unitPriceCents = Math.max(0, Math.floor(args.unitPriceCents || 0))
    const bundleDeals = (args.bundleDeals || [])
        .filter((d) => Number.isFinite(d.bundleQty) && Number.isFinite(d.bundlePriceCents))
        .map((d) => ({
            bundleQty: Math.floor(d.bundleQty),
            bundlePriceCents: Math.max(0, Math.floor(d.bundlePriceCents))
        }))
        .filter((d) => d.bundleQty >= 2)
        .sort((a, b) => a.bundleQty - b.bundleQty)

    const baseTotalCents = unitPriceCents * quantity
    if (quantity <= 0 || bundleDeals.length === 0) {
        return {
            quantity,
            unitPriceCents,
            baseTotalCents,
            bestTotalCents: baseTotalCents,
            savingsCents: 0,
            breakdown: quantity > 0
                ? [{ kind: 'single', qty: quantity, unitPriceCents, totalCents: baseTotalCents }]
                : []
        }
    }

    const INF = Number.MAX_SAFE_INTEGER
    const best = new Array<number>(quantity + 1).fill(INF)
    const choice = new Array<{ kind: 'single' | 'bundle'; qty: number; priceCents: number } | null>(quantity + 1).fill(
        null
    )

    best[0] = 0
    choice[0] = { kind: 'single', qty: 0, priceCents: 0 }

    for (let i = 1; i <= quantity; i++) {
        best[i] = best[i - 1] + unitPriceCents
        choice[i] = { kind: 'single', qty: 1, priceCents: unitPriceCents }

        for (const deal of bundleDeals) {
            if (deal.bundleQty > i) break
            const cand = best[i - deal.bundleQty] + deal.bundlePriceCents
            if (cand < best[i]) {
                best[i] = cand
                choice[i] = { kind: 'bundle', qty: deal.bundleQty, priceCents: deal.bundlePriceCents }
            }
        }
    }

    const bestTotalCents = best[quantity]
    const savingsCents = Math.max(0, baseTotalCents - bestTotalCents)

    const singleQty = { qty: 0, totalCents: 0 }
    const bundleCounts = new Map<number, { count: number; bundlePriceCents: number }>()

    let i = quantity
    while (i > 0) {
        const step = choice[i]
        if (!step) break

        if (step.kind === 'single') {
            singleQty.qty += 1
            singleQty.totalCents += unitPriceCents
            i -= 1
            continue
        }

        const prev = bundleCounts.get(step.qty) ?? { count: 0, bundlePriceCents: step.priceCents }
        prev.count += 1
        prev.bundlePriceCents = step.priceCents
        bundleCounts.set(step.qty, prev)
        i -= step.qty
    }

    const breakdown: BundlePricingBreakdownItem[] = []
    if (singleQty.qty > 0) {
        breakdown.push({
            kind: 'single',
            qty: singleQty.qty,
            unitPriceCents,
            totalCents: singleQty.totalCents
        })
    }
    for (const [bundleQty, v] of [...bundleCounts.entries()].sort((a, b) => a[0] - b[0])) {
        breakdown.push({
            kind: 'bundle',
            bundleQty,
            bundlePriceCents: v.bundlePriceCents,
            count: v.count,
            totalCents: v.count * v.bundlePriceCents
        })
    }

    return {
        quantity,
        unitPriceCents,
        baseTotalCents,
        bestTotalCents,
        savingsCents,
        breakdown
    }
}

