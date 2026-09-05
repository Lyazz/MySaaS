import type { Request, Response } from 'express'
import { isAiEnabled } from '../../lib/anthropic'
import { AiDocumentsService, type SubscriptionContext } from './ai-documents.service'
import { ConfirmService } from './confirm.service'
import { AiDocumentValidationError, isAiDocumentKind } from './ai-documents.errors'
import { isAllowedDocumentMime } from './document-storage.service'

const service = new AiDocumentsService()
const confirmService = new ConfirmService()

const toErrorPayload = (error: AiDocumentValidationError) => ({
    statusCode: error.statusCode,
    statusMessage: error.statusMessage,
    code: error.code,
    meta: error.meta
})

const fail = (res: Response, error: unknown, context: string) => {
    if (error instanceof AiDocumentValidationError) {
        return res.status(error.statusCode).json(toErrorPayload(error))
    }
    console.error(`${context}:`, error)
    return res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
}

/**
 * Creating products is gated separately from importing documents.
 *
 * The router already requires `purchases` CRUD; a catalog import, or an invoice
 * with unmatched lines, additionally writes to the product catalogue. Same
 * pattern as `canCreateCategories` in the products bulk controller.
 */
const canCreateProducts = (req: Request): boolean => {
    if (req.user?.role !== 'staff') return true
    return req.staffPermissions?.has('products:create') ?? false
}

const subscriptionOf = (req: Request): SubscriptionContext | null =>
    req.subscription
        ? {
              planCode: req.subscription.planCode,
              interval: req.subscription.interval,
              currentPeriodStart: req.subscription.currentPeriodStart,
              currentPeriodEnd: req.subscription.currentPeriodEnd
          }
        : null

const requireId = (req: Request, res: Response): string | null => {
    const { id } = req.params
    if (!id || Array.isArray(id)) {
        res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })
        return null
    }
    return id
}

/** In-flight extractions, so /stream can await one instead of polling the DB. */
const inFlight = new Map<string, Promise<'READY' | 'FAILED'>>()

export class AiDocumentsController {
    async create(req: Request, res: Response) {
        try {
            if (!(await isAiEnabled())) {
                throw new AiDocumentValidationError(503, 'AI document import is not configured on this server')
            }

            const tenant = req.tenant!
            const file = (req as any).file as { buffer: Buffer; mimetype: string } | undefined
            if (!file?.buffer?.length) {
                throw new AiDocumentValidationError(400, 'A document file is required')
            }
            if (!isAllowedDocumentMime(file.mimetype)) {
                throw new AiDocumentValidationError(400, 'Only PNG, JPEG, WebP and PDF documents are supported')
            }

            const kind = req.body?.kind
            if (!isAiDocumentKind(kind)) {
                throw new AiDocumentValidationError(400, 'kind must be PURCHASE_INVOICE, DELIVERY_NOTE or PRODUCT_CATALOG')
            }
            if (kind === 'PRODUCT_CATALOG' && !canCreateProducts(req)) {
                throw new AiDocumentValidationError(403, 'You do not have permission to create products')
            }

            const { job, buffer, mimeType } = await service.createJob({
                tenantId: tenant.id,
                kind,
                mimeType: file.mimetype,
                buffer: file.buffer,
                userId: req.user?.id ?? null,
                subscription: subscriptionOf(req)
            })

            // Detached on purpose: the merchant gets an id now and follows the
            // stream, so a 90-second multi-page read never blocks the upload.
            const run = service
                .runExtraction({ tenantId: tenant.id, jobId: job.id, kind, mimeType, buffer })
                .finally(() => inFlight.delete(job.id))
            inFlight.set(job.id, run)
            void run.catch((error) => console.error('AI document extraction crashed:', error))

            res.status(201).json({ jobId: job.id, status: job.status, pageCount: job.pageCount, kind: job.kind })
        } catch (error) {
            fail(res, error, 'Create AI document job error')
        }
    }

    async list(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { kind, status } = req.query as { kind?: string; status?: string }
            res.json(await service.list(tenant.id, { kind, status }))
        } catch (error) {
            fail(res, error, 'List AI document jobs error')
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const id = requireId(req, res)
            if (!id) return
            const job = await service.getById(req.tenant!.id, id)
            if (!job) return res.status(404).json({ statusCode: 404, statusMessage: 'Document not found' })
            res.json(job)
        } catch (error) {
            fail(res, error, 'Get AI document job error')
        }
    }

    /**
     * NDJSON progress, matching the products bulk import stream. A client that
     * reconnects after the job finished gets the terminal event immediately.
     */
    async stream(req: Request, res: Response) {
        const id = requireId(req, res)
        if (!id) return

        const tenantId = req.tenant!.id
        const job = await service.getById(tenantId, id)
        if (!job) return res.status(404).json({ statusCode: 404, statusMessage: 'Document not found' })

        res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache, no-transform')
        res.setHeader('X-Accel-Buffering', 'no')

        const write = (payload: unknown) => res.write(`${JSON.stringify(payload)}\n`)

        try {
            if (job.status === 'PENDING' || job.status === 'EXTRACTING') {
                write({ type: 'progress', phase: 'extracting', pageCount: job.pageCount })
                const pending = inFlight.get(id)
                if (pending) {
                    await pending
                } else {
                    // Another process owns the extraction (or it died and the
                    // reaper will fail it). Report the current state and let the
                    // client poll rather than hold a socket open indefinitely.
                    write({ type: 'pending', status: job.status })
                    return res.end()
                }
            }

            const finished = await service.getById(tenantId, id)
            if (finished?.status === 'FAILED') {
                write({ type: 'error', message: finished.errorMessage ?? 'Extraction failed' })
            } else {
                write({ type: 'done', status: finished?.status ?? 'READY' })
            }
            res.end()
        } catch (error) {
            console.error('AI document stream error:', error)
            write({ type: 'error', message: 'Extraction failed' })
            res.end()
        }
    }

    async documentUrl(req: Request, res: Response) {
        try {
            const id = requireId(req, res)
            if (!id) return
            res.json(await service.getDocumentUrl(req.tenant!.id, id))
        } catch (error) {
            fail(res, error, 'Get AI document URL error')
        }
    }

    async patchDraft(req: Request, res: Response) {
        try {
            const id = requireId(req, res)
            if (!id) return
            res.json(await service.patchDraft(req.tenant!.id, id, req.body))
        } catch (error) {
            fail(res, error, 'Patch AI document draft error')
        }
    }

    async confirm(req: Request, res: Response) {
        try {
            const id = requireId(req, res)
            if (!id) return
            const tenantId = req.tenant!.id

            const job = await service.getById(tenantId, id)
            if (!job) return res.status(404).json({ statusCode: 404, statusMessage: 'Document not found' })
            if (!job.draft) {
                throw new AiDocumentValidationError(409, 'This document has nothing to import')
            }

            // The integrity gate: anything the model was unsure about must have
            // been looked at before it can become a purchase order.
            const pending = service.unreviewedFields(job.draft)
            if (pending.length) {
                throw new AiDocumentValidationError(
                    400,
                    `${pending.length} low-confidence value${pending.length === 1 ? '' : 's'} still need${pending.length === 1 ? 's' : ''} your review`,
                    { code: 'UNREVIEWED_FIELDS', meta: { fields: pending.slice(0, 50) } }
                )
            }

            const result = await confirmService.confirm({
                tenantId,
                jobId: id,
                userId: req.user?.id ?? null,
                canCreateProducts: canCreateProducts(req)
            })
            res.json(result)
        } catch (error) {
            fail(res, error, 'Confirm AI document error')
        }
    }

    async cancel(req: Request, res: Response) {
        try {
            const id = requireId(req, res)
            if (!id) return
            res.json(await service.cancel(req.tenant!.id, id))
        } catch (error) {
            fail(res, error, 'Cancel AI document error')
        }
    }
}
