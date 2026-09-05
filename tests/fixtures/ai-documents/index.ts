/**
 * Canned Claude responses for the AI document suite.
 *
 * The Anthropic client is mocked at `backend/src/lib/anthropic`, so these are
 * what `beta.messages.stream(...).finalMessage()` resolves to. The real
 * ExtractionService still parses and re-validates them, which is the point:
 * the suite exercises our normalization, not the SDK's.
 */

const field = (value: unknown, confidence = 0.95) => ({ value, confidence })

export const invoiceExtraction = {
    documentKind: 'PURCHASE_INVOICE',
    supplier: {
        name: field('SARL Distribution Alger'),
        phone: field('0550112233'),
        address: field('Zone industrielle, Rouiba')
    },
    reference: field('FA-2026-0142'),
    issuedAt: field('2026-09-01'),
    currency: 'DZD',
    lines: [
        {
            label: field('CHOCOLAT NOIR 100G'),
            sku: field(null, 0),
            barcode: field(null, 0),
            quantity: field(12),
            unitCost: field(375),
            lineTotal: field(4500),
            salePrice: field(null, 0)
        },
        {
            label: field('HUILE TOURNESOL 5L'),
            sku: field(null, 0),
            barcode: field(null, 0),
            quantity: field(6),
            unitCost: field(1000),
            lineTotal: field(6000),
            salePrice: field(null, 0)
        }
    ],
    totals: { subtotal: field(10500), tax: field(0), grandTotal: field(10500) },
    notes: null
}

/** A handwritten quantity the model is unsure about — drives the review gate. */
export const lowConfidenceExtraction = {
    ...invoiceExtraction,
    reference: field('FA-2026-0143'),
    lines: [
        {
            ...invoiceExtraction.lines[0],
            quantity: field(7, 0.42)
        }
    ],
    totals: { subtotal: field(2625), tax: field(0), grandTotal: field(2625) }
}

/** No supplier, no quantities — the catalog path. */
export const catalogExtraction = {
    documentKind: 'PRODUCT_CATALOG',
    supplier: { name: field(null, 0), phone: field(null, 0), address: field(null, 0) },
    reference: field(null, 0),
    issuedAt: field(null, 0),
    currency: 'DZD',
    lines: [
        {
            label: field('SUCRE BLANC 1KG'),
            sku: field('SUC1KG'),
            barcode: field(null, 0),
            quantity: field(null, 0),
            unitCost: field(120),
            lineTotal: field(null, 0),
            salePrice: field(160)
        }
    ],
    totals: { subtotal: field(null, 0), tax: field(null, 0), grandTotal: field(null, 0) },
    notes: null
}

/**
 * A catalog naming one specific product, so two tests can each import a
 * catalogue without the second one matching the product the first created.
 */
export const catalogExtractionFor = (label: string) => ({
    ...catalogExtraction,
    lines: [{ ...catalogExtraction.lines[0], label: field(label), sku: field(null, 0) }]
})

/** Wrap a string in this to have the mock return it verbatim, not JSON-encoded. */
export const rawText = (text: string) => ({ __rawText: text })

export const makeFinalMessage = (payload: unknown) => {
    const raw = (payload as { __rawText?: string })?.__rawText
    return {
        model: 'claude-opus-5',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: raw ?? JSON.stringify(payload) }],
        usage: { input_tokens: 1800, output_tokens: 640 }
    }
}
