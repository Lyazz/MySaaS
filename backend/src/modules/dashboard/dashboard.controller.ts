import type { Request, Response } from 'express'
import { DashboardService, type AdminDashboardRange } from './dashboard.service'

const service = new DashboardService()
const DAY_MS = 24 * 60 * 60 * 1000

const parseIsoDate = (value: unknown) => {
    if (typeof value !== 'string' || !value.trim()) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date
}

const parseRange = (value: unknown): AdminDashboardRange | null => {
    if (value === undefined || value === null || value === '') return '7d'
    if (value === 'today' || value === '7d' || value === '30d' || value === '90d' || value === 'custom') return value
    return null
}

export class DashboardController {
    async getAdminDashboard(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const range = parseRange(req.query?.range)

            if (!range) {
                return res.status(400).json({
                    statusCode: 400,
                    statusMessage: 'Invalid "range". Use one of: today, 7d, 30d, 90d, custom'
                })
            }

            let fromDate: Date | null = null
            let toDate: Date | null = null

            if (range === 'custom') {
                fromDate = parseIsoDate(req.query?.from)
                toDate = parseIsoDate(req.query?.to)

                if (!fromDate || !toDate) {
                    return res.status(400).json({
                        statusCode: 400,
                        statusMessage: '"from" and "to" are required ISO dates when range=custom'
                    })
                }

                if (fromDate.getTime() > toDate.getTime()) {
                    return res.status(400).json({
                        statusCode: 400,
                        statusMessage: '"from" cannot be greater than "to"'
                    })
                }

                const fromDay = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate()))
                const toDay = new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate()))
                const days = Math.floor((toDay.getTime() - fromDay.getTime()) / DAY_MS) + 1
                if (days > 365) {
                    return res.status(400).json({
                        statusCode: 400,
                        statusMessage: 'Custom range cannot exceed 365 days'
                    })
                }
            }

            const data = await service.getAdminDashboard(tenant.id, {
                range,
                from: fromDate,
                to: toDate
            })
            res.json(data)
        } catch (error) {
            console.error('Get admin dashboard error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}
