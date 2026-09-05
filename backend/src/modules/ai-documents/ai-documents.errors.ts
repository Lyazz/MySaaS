/** Same shape as PurchaseValidationError so the controllers can be symmetrical. */
export class AiDocumentValidationError extends Error {
    statusCode: number
    statusMessage: string
    code?: string
    meta?: Record<string, unknown>

    constructor(
        statusCode: number,
        statusMessage: string,
        opts?: { code?: string; meta?: Record<string, unknown> }
    ) {
        super(statusMessage)
        this.statusCode = statusCode
        this.statusMessage = statusMessage
        this.code = opts?.code
        this.meta = opts?.meta
    }
}

export const AI_DOCUMENT_KINDS = ['PURCHASE_INVOICE', 'DELIVERY_NOTE', 'PRODUCT_CATALOG'] as const
export type AiDocumentKind = (typeof AI_DOCUMENT_KINDS)[number]

export const AI_DOCUMENT_STATUSES = [
    'PENDING',
    'EXTRACTING',
    'READY',
    'CONFIRMED',
    'FAILED',
    'CANCELLED'
] as const
export type AiDocumentStatus = (typeof AI_DOCUMENT_STATUSES)[number]

export const isAiDocumentKind = (value: unknown): value is AiDocumentKind =>
    typeof value === 'string' && (AI_DOCUMENT_KINDS as readonly string[]).includes(value)
