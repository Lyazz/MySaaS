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
}
