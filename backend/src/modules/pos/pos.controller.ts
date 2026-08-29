import type { Request, Response } from 'express'
import { PosService, PosValidationError } from './pos.service'

const service = new PosService()

export class PosController {
    async lookup(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { code } = req.query as { code?: string }

            const normalized = typeof code === 'string' ? code.trim() : ''
            if (!normalized) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Code is required' })
            }

            const item = await service.lookupByCode(tenant.id, normalized)
            if (!item) {
                return res.status(404).json({ statusCode: 404, statusMessage: 'Not found' })
            }

            res.json(item)
        } catch (error) {
            console.error('POS lookup error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async createSale(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const user = req.user
            const idempotencyKey = req.get('Idempotency-Key')?.trim()
            const offlineId = typeof req.body?.offlineId === 'string' ? req.body.offlineId.trim() : ''
            const clientRequestId = idempotencyKey || offlineId || null

            const sale = await service.createSale(
                tenant.id,
                {
                    customerId: req.body?.customerId,
                    clientRequestId,
                    cashboxId: req.body?.cashboxId ?? null,
                    payment: req.body?.payment ?? null,
                    items: req.body?.items ?? []
                },
                req.subscription
                    ? {
                        planCode: req.subscription.planCode,
                        interval: req.subscription.interval,
                        currentPeriodStart: req.subscription.currentPeriodStart,
                        currentPeriodEnd: req.subscription.currentPeriodEnd
                    }
                    : null,
                { userId: user?.id ?? null }
            )

            res.status(201).json({ success: true, saleId: sale?.id, sale })
        } catch (error: any) {
            if (error instanceof PosValidationError) {
                return res.status(error.statusCode).json({
                    statusCode: error.statusCode,
                    statusMessage: error.statusMessage,
                    code: error.code,
                    meta: error.meta
                })
            }
            if (typeof error?.statusCode === 'number' && typeof error?.statusMessage === 'string') {
                return res.status(error.statusCode).json({
                    statusCode: error.statusCode,
                    statusMessage: error.statusMessage,
                    code: typeof error?.code === 'string' ? error.code : undefined,
                    meta: error?.meta
                })
            }

            console.error('POS create sale error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}
