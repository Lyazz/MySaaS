import type { Request, Response } from 'express'
import { SalesService } from './sales.service'

const service = new SalesService()

const parseOptionalDate = (value: unknown) => {
    if (!value || typeof value !== 'string') return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'invalid'
    return date
}

export class SalesController {
    async list(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { search, startDate, endDate, userId, page: pageStr, limit: limitStr, sortBy, sortOrder } = req.query as {
                search?: string; startDate?: string; endDate?: string; userId?: string; page?: string; limit?: string; sortBy?: string; sortOrder?: 'asc' | 'desc'
            }

            const start = parseOptionalDate(startDate)
            if (start === 'invalid') {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Invalid "startDate"' })
            }

            const end = parseOptionalDate(endDate)
            if (end === 'invalid') {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Invalid "endDate"' })
            }

            const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)
            const limit = Math.min(100, Math.max(1, parseInt(limitStr ?? '25', 10) || 25))

            const result = await service.list(
                tenant.id,
                {
                    search: typeof search === 'string' ? search : undefined,
                    startDate: start,
                    endDate: end,
                    userId: typeof userId === 'string' ? userId : undefined,
                    sortBy,
                    sortOrder
                },
                { page, limit }
            )

            res.json(result)
        } catch (error) {
            console.error('List sales error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params

            if (!id || Array.isArray(id)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Sale ID is required' })
            }

            const sale = await service.getById(tenant.id, id)
            if (!sale) {
                return res.status(404).json({ statusCode: 404, statusMessage: 'Sale not found' })
            }

            res.json(sale)
        } catch (error) {
            console.error('Get sale error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async getPosSaleById(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params

            if (!id || Array.isArray(id)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Sale ID is required' })
            }

            const sale = await service.getPosSaleById(tenant.id, id)
            if (!sale) {
                return res.status(404).json({ statusCode: 404, statusMessage: 'Sale not found' })
            }

            res.json(sale)
        } catch (error) {
            console.error('Get sale error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async createPosSale(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const user = req.user

            const sale = await service.createPosSale(
                tenant.id,
                {
                    customerId: req.body?.customerId ?? null,
                    items: req.body?.items ?? [],
                    cashboxId: req.body?.cashboxId ?? null,
                    payment: req.body?.payment ?? null
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

            res.status(201).json({ success: true, saleId: (sale as any)?.id, sale })
        } catch (error: any) {
            if (typeof error?.statusCode === 'number' && typeof error?.statusMessage === 'string') {
                return res.status(error.statusCode).json({
                    statusCode: error.statusCode,
                    statusMessage: error.statusMessage,
                    code: typeof error?.code === 'string' ? error.code : undefined,
                    meta: error?.meta
                })
            }
            console.error('Create sale error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}
