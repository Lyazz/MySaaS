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
            const { search, startDate, endDate } = req.query as { search?: string; startDate?: string; endDate?: string }

            const start = parseOptionalDate(startDate)
            if (start === 'invalid') {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Invalid "startDate"' })
            }

            const end = parseOptionalDate(endDate)
            if (end === 'invalid') {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Invalid "endDate"' })
            }

            const sales = await service.list(tenant.id, {
                search: typeof search === 'string' ? search : undefined,
                startDate: start,
                endDate: end
            })

            res.json(sales)
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
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Create sale error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}
