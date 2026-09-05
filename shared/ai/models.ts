/**
 * The models a super-admin may point AI document import at.
 *
 * Curated on purpose: the model id is platform-wide, so a typo would take
 * extraction down for every tenant at once. Shared between the super-admin
 * dropdown and the server-side validation so the two can never drift — adding a
 * model is a one-line change here and nothing else.
 */

export interface AiDocumentModelOption {
    id: string
    label: string
    /** Relative API cost per page. Guidance for the operator, not a price. */
    cost: 'low' | 'medium' | 'high'
    note: string
}

export const AI_DOCUMENT_MODELS: readonly AiDocumentModelOption[] = [
    {
        id: 'claude-opus-5',
        label: 'Opus 5',
        cost: 'high',
        note: 'Best accuracy on handwritten and low-quality scans.'
    },
    {
        id: 'claude-sonnet-5',
        label: 'Sonnet 5',
        cost: 'medium',
        note: 'Balanced. A good default for printed invoices.'
    },
    {
        id: 'claude-haiku-4-5-20251001',
        label: 'Haiku 4.5',
        cost: 'low',
        note: 'Fastest and cheapest. Clean, typed documents only.'
    }
] as const

/** Used when neither the database nor the environment names a model. */
export const DEFAULT_AI_DOCUMENT_MODEL = 'claude-opus-5'

export const isAiDocumentModel = (value: unknown): value is string =>
    typeof value === 'string' && AI_DOCUMENT_MODELS.some((m) => m.id === value)

export const aiDocumentModelLabel = (id: string): string =>
    AI_DOCUMENT_MODELS.find((m) => m.id === id)?.label ?? id
