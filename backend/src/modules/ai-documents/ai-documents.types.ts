import type { MatchSource } from './matching.service'
import type { ExtractedDocument } from './extraction.schema'

/**
 * The merchant's working copy of an extraction: what the review screen renders,
 * edits and posts back. Stored as JSON on AiDocumentJob.draft so a lost tab
 * never loses work and a confirm never has to re-derive anything.
 */

export type LineAction = 'match' | 'create' | 'skip'

export interface DraftLine {
    /** Position in the original extraction; the key corrections are logged against. */
    index: number
    label: string
    sku: string | null
    barcode: string | null
    quantity: number
    unitCost: number
    salePrice: number | null
    /** True once the merchant edited the sale price, so a margin change stops overwriting it. */
    salePricePinned: boolean

    action: LineAction
    variantId: string | null
    matchSource: MatchSource
    matchScore: number
    candidates: { variantId: string; score: number }[]

    /** Field name -> confidence, for the amber highlighting. */
    confidence: Record<string, number>
    /** Field names the merchant has acknowledged. Confirm is blocked until this covers every flagged field. */
    reviewed: string[]
}

export interface DraftSupplier {
    /** Existing supplier chosen by the merchant, or matched automatically. */
    supplierId: string | null
    /** Name to create a supplier under when supplierId is null and create is true. */
    name: string | null
    phone: string | null
    address: string | null
    create: boolean
    matchScore: number
    candidates: { supplierId: string; name: string; score: number }[]
}

export interface AiDocumentDraft {
    supplier: DraftSupplier
    reference: string | null
    issuedAt: string | null
    currency: string
    marginPercent: number
    lines: DraftLine[]
    /** Σ(qty × unitCost) vs the printed grand total; set when they disagree by >1%. */
    totalsMismatch: { computed: number; printed: number } | null
    notes: string | null
}

export interface AiDocumentJobView {
    id: string
    kind: string
    status: string
    mimeType: string
    pageCount: number
    errorMessage: string | null
    supplierId: string | null
    purchaseOrderId: string | null
    createdAt: Date
    completedAt: Date | null
    confirmedAt: Date | null
    draft: AiDocumentDraft | null
    extraction: ExtractedDocument | null
    /** Variant details for every id referenced by the draft, so the UI needs no extra call. */
    variants: Record<string, { sku: string; title: string; cost: string; price: string }>
}
