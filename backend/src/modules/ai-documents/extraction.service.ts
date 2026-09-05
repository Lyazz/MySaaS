import Anthropic from '@anthropic-ai/sdk'
import { aiDocumentModel, getAnthropicClient } from '../../lib/anthropic'
import { AiDocumentValidationError, type AiDocumentKind } from './ai-documents.errors'
import {
    EXTRACTION_JSON_SCHEMA,
    EXTRACTION_SYSTEM_PROMPT,
    extractionUserPrompt,
    type ExtractedDocument,
    type ExtractedField,
    type ExtractedLine
} from './extraction.schema'

export interface ExtractionResult {
    document: ExtractedDocument
    model: string
    inputTokens: number | null
    outputTokens: number | null
}

const KIND_HINT: Record<AiDocumentKind, string> = {
    PURCHASE_INVOICE: 'a supplier invoice (facture)',
    DELIVERY_NOTE: 'a delivery note (bon de livraison)',
    PRODUCT_CATALOG: 'a product catalogue or price list'
}

const clampConfidence = (value: unknown): number => {
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n)) return 0
    return Math.min(1, Math.max(0, n))
}

const asStringField = (raw: any): ExtractedField<string> => {
    const value = typeof raw?.value === 'string' && raw.value.trim() ? raw.value.trim() : null
    return { value, confidence: value === null ? 0 : clampConfidence(raw?.confidence) }
}

const asNumberField = (raw: any): ExtractedField<number> => {
    const candidate = typeof raw?.value === 'number' ? raw.value : Number(raw?.value)
    const value = Number.isFinite(candidate) ? candidate : null
    return { value, confidence: value === null ? 0 : clampConfidence(raw?.confidence) }
}

/**
 * Coerces the model's response into our types.
 *
 * Structured outputs make the shape reliable, not the contents: this is still
 * data derived from a photograph, so every field is re-validated rather than
 * trusted. Nothing here is ever used as a path, id, or instruction.
 */
export const normalizeExtraction = (raw: any): ExtractedDocument => {
    const kinds = ['PURCHASE_INVOICE', 'DELIVERY_NOTE', 'PRODUCT_CATALOG', 'UNKNOWN']
    const lines: ExtractedLine[] = Array.isArray(raw?.lines)
        ? raw.lines.slice(0, 500).map((line: any) => ({
              label: asStringField(line?.label),
              sku: asStringField(line?.sku),
              barcode: asStringField(line?.barcode),
              quantity: asNumberField(line?.quantity),
              unitCost: asNumberField(line?.unitCost),
              lineTotal: asNumberField(line?.lineTotal),
              salePrice: asNumberField(line?.salePrice)
          }))
        : []

    return {
        documentKind: kinds.includes(raw?.documentKind) ? raw.documentKind : 'UNKNOWN',
        supplier: {
            name: asStringField(raw?.supplier?.name),
            phone: asStringField(raw?.supplier?.phone),
            address: asStringField(raw?.supplier?.address)
        },
        reference: asStringField(raw?.reference),
        issuedAt: asStringField(raw?.issuedAt),
        currency: typeof raw?.currency === 'string' && raw.currency.trim() ? raw.currency.trim().slice(0, 8) : 'DZD',
        lines,
        totals: {
            subtotal: asNumberField(raw?.totals?.subtotal),
            tax: asNumberField(raw?.totals?.tax),
            grandTotal: asNumberField(raw?.totals?.grandTotal)
        },
        notes: typeof raw?.notes === 'string' && raw.notes.trim() ? raw.notes.trim().slice(0, 2000) : null
    }
}

const documentBlock = (mimeType: string, base64: string): any =>
    mimeType === 'application/pdf'
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
        : { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } }

export class ExtractionService {
    /**
     * One Claude call per document.
     *
     * Streams because a many-line invoice produces a long structured response
     * and a non-streaming request risks the SDK's HTTP timeout. The system
     * prompt is byte-identical on every scan, so it is cached.
     */
    async extract(args: {
        buffer: Buffer
        mimeType: string
        kind: AiDocumentKind
    }): Promise<ExtractionResult> {
        const client = await getAnthropicClient()
        const model = await aiDocumentModel()

        try {
            const stream = client.beta.messages.stream({
                model,
                max_tokens: 32000,
                betas: ['server-side-fallback-2026-07-01'],
                fallbacks: 'default',
                thinking: { type: 'adaptive' },
                output_config: {
                    effort: 'high',
                    format: { type: 'json_schema', schema: EXTRACTION_JSON_SCHEMA as any }
                },
                system: [
                    {
                        type: 'text',
                        text: EXTRACTION_SYSTEM_PROMPT,
                        cache_control: { type: 'ephemeral' }
                    }
                ],
                messages: [
                    {
                        role: 'user',
                        content: [
                            documentBlock(args.mimeType, args.buffer.toString('base64')),
                            { type: 'text', text: extractionUserPrompt(KIND_HINT[args.kind]) }
                        ]
                    }
                ]
            })

            const message = await stream.finalMessage()

            if (message.stop_reason === 'refusal') {
                throw new AiDocumentValidationError(
                    422,
                    'The model declined to read this document. Try a clearer photo of the invoice itself.'
                )
            }

            const text = message.content
                .filter((block: any) => block.type === 'text')
                .map((block: any) => block.text)
                .join('')

            if (!text.trim()) {
                throw new AiDocumentValidationError(422, 'No data could be read from this document')
            }

            let parsed: unknown
            try {
                parsed = JSON.parse(text)
            } catch {
                throw new AiDocumentValidationError(422, 'The document could not be read as structured data')
            }

            return {
                document: normalizeExtraction(parsed),
                model: message.model ?? model,
                inputTokens: message.usage?.input_tokens ?? null,
                outputTokens: message.usage?.output_tokens ?? null
            }
        } catch (error) {
            if (error instanceof AiDocumentValidationError) throw error
            if (error instanceof Anthropic.RateLimitError) {
                throw new AiDocumentValidationError(429, 'The AI service is busy. Try again in a moment.')
            }
            if (error instanceof Anthropic.AuthenticationError) {
                throw new AiDocumentValidationError(503, 'AI document import is not configured on this server')
            }
            if (error instanceof Anthropic.APIError) {
                throw new AiDocumentValidationError(502, 'The AI service could not process this document')
            }
            throw error
        }
    }
}
