import prisma from '../../lib/prisma'
import { AUTO_MATCH_THRESHOLD, aliasKey, normalizeLabel, rankCandidates } from '../../lib/text-match'

/**
 * Turns an extracted line label into one of the tenant's variants.
 *
 * Deliberately local: the tenant's catalogue is never sent to the model, so a
 * scan leaks nothing beyond the document itself. A tenant's variant list tops
 * out in the low thousands, so one query per job and scoring in Node is cheaper
 * and far simpler than a pg_trgm extension.
 */

export type MatchSource = 'barcode' | 'sku' | 'alias' | 'fuzzy' | 'none'

export interface VariantSummary {
    id: string
    sku: string
    barcode: string | null
    productId: string
    productTitle: string
    optionTitle: string | null
    cost: string
    price: string
}

export interface LineMatch {
    matchSource: MatchSource
    /** Pre-selected variant, or null when the merchant must choose or create one. */
    variantId: string | null
    score: number
    /** Alternatives worth offering, best first. Empty on an exact identifier hit. */
    candidates: { variantId: string; score: number }[]
}

/**
 * Only the human-readable name. The SKU is matched exactly a step earlier, and
 * including it here dilutes the label score — an eleven-character code the
 * supplier never printed dragged a good title match from 0.78 down to 0.58.
 */
const searchTextOf = (v: VariantSummary) => [v.productTitle, v.optionTitle].filter(Boolean).join(' ')

export class MatchingService {
    /** Every active variant for a tenant, flattened for scoring. */
    async loadVariants(tenantId: string): Promise<VariantSummary[]> {
        const variants = await prisma.productVariant.findMany({
            where: { tenantId, isActive: true },
            select: {
                id: true,
                sku: true,
                barcode: true,
                productId: true,
                cost: true,
                price: true,
                product: { select: { title: true } },
                optionValues: { select: { optionValue: { select: { label: true } } } }
            },
            orderBy: { updatedAt: 'desc' }
        })

        return variants.map((v: any) => ({
            id: v.id,
            sku: v.sku,
            barcode: v.barcode ?? null,
            productId: v.productId,
            productTitle: v.product?.title ?? '',
            optionTitle:
                v.optionValues?.map((ov: any) => ov.optionValue?.label).filter(Boolean).join(' / ') || null,
            cost: String(v.cost ?? '0'),
            price: String(v.price ?? '0')
        }))
    }

    /**
     * Aliases for this supplier plus the store-wide ones, keyed by normalized
     * label. Supplier-specific rows win over store-wide rows for the same label.
     */
    async loadAliases(tenantId: string, supplierId: string | null): Promise<Map<string, string>> {
        const rows = await prisma.supplierProductAlias.findMany({
            // Prisma rejects a null inside `in`, so the union is spelled out.
            where: {
                tenantId,
                ...(supplierId
                    ? { OR: [{ supplierId }, { supplierId: null }] }
                    : { supplierId: null })
            },
            select: { supplierId: true, rawLabel: true, variantId: true },
            orderBy: { hitCount: 'desc' }
        })

        const map = new Map<string, string>()
        // Store-wide first so a supplier-specific row overwrites it.
        for (const row of rows.filter((r: any) => !r.supplierId)) map.set(row.rawLabel, row.variantId)
        for (const row of rows.filter((r: any) => r.supplierId)) map.set(row.rawLabel, row.variantId)
        return map
    }

    /**
     * Resolves one line. Order matters: printed identifiers beat remembered
     * mappings, which beat a guess at the words.
     */
    matchLine(
        line: { label: string | null; sku: string | null; barcode: string | null },
        variants: VariantSummary[],
        aliases: Map<string, string>
    ): LineMatch {
        const none: LineMatch = { matchSource: 'none', variantId: null, score: 0, candidates: [] }

        if (line.barcode) {
            const wanted = line.barcode.trim().toUpperCase()
            const hit = variants.find((v) => v.barcode && v.barcode.toUpperCase() === wanted)
            if (hit) return { matchSource: 'barcode', variantId: hit.id, score: 1, candidates: [] }
        }

        if (line.sku) {
            const wanted = line.sku.trim().toUpperCase()
            const hit = variants.find((v) => v.sku.toUpperCase() === wanted)
            if (hit) return { matchSource: 'sku', variantId: hit.id, score: 1, candidates: [] }
        }

        if (line.label) {
            const key = aliasKey(line.label)
            const aliased = key ? aliases.get(key) : undefined
            // An alias pointing at a variant that has since been archived is stale.
            if (aliased && variants.some((v) => v.id === aliased)) {
                return { matchSource: 'alias', variantId: aliased, score: 1, candidates: [] }
            }
        }

        if (!line.label || !normalizeLabel(line.label)) return none

        const ranked = rankCandidates(line.label, variants, searchTextOf, { limit: 3, minScore: 0.4 })
        if (!ranked.length) return none

        const best = ranked[0]!
        return {
            matchSource: best.score >= AUTO_MATCH_THRESHOLD ? 'fuzzy' : 'none',
            variantId: best.score >= AUTO_MATCH_THRESHOLD ? best.item.id : null,
            score: best.score,
            candidates: ranked.map((r) => ({ variantId: r.item.id, score: Number(r.score.toFixed(3)) }))
        }
    }

    /**
     * Remembers the merchant's choices so the same supplier's next document
     * matches on its own. Called after a confirm, never during extraction.
     */
    async rememberAliases(
        tenantId: string,
        supplierId: string | null,
        pairs: { label: string; variantId: string }[]
    ) {
        const seen = new Set<string>()
        for (const pair of pairs) {
            const rawLabel = aliasKey(pair.label)
            if (!rawLabel || seen.has(rawLabel)) continue
            seen.add(rawLabel)

            // Postgres treats NULLs as distinct, so the composite unique key cannot
            // address a store-wide (supplierId IS NULL) row — hence the branch. The
            // partial unique index in the migration still guards against races.
            const existing = await prisma.supplierProductAlias.findFirst({
                where: { tenantId, supplierId, rawLabel },
                select: { id: true }
            })

            if (existing) {
                await prisma.supplierProductAlias.update({
                    where: { id: existing.id },
                    data: { variantId: pair.variantId, hitCount: { increment: 1 }, lastSeenAt: new Date() }
                })
            } else {
                await prisma.supplierProductAlias.create({
                    data: { tenantId, supplierId, rawLabel, variantId: pair.variantId }
                })
            }
        }
    }
}
