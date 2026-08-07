import type { Request, Response } from 'express'
import { StatisticsService } from './statistics.service'
import type { StatsChannel, StatsQuery, StatsRange } from './statistics.types'

const service = new StatisticsService()

const parseIsoDate = (value: unknown) => {
    if (typeof value !== 'string' || !value.trim()) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date
}

const parseRange = (value: unknown): StatsRange | null => {
    if (value === undefined || value === null || value === '') return '7d'
    if (value === 'today' || value === '7d' || value === '30d' || value === '90d' || value === 'custom') return value
    return null
}

const parseChannel = (value: unknown): StatsChannel => {
    if (value === 'online' || value === 'pos') return value
    return 'all'
}

type Tab = 'sales' | 'delivery' | 'products' | 'customers' | 'profitability'

const buildQuery = (req: Request): { query: StatsQuery | null; error?: string } => {
    const range = parseRange(req.query?.range)
    if (!range) return { query: null, error: 'Invalid "range". Use one of: today, 7d, 30d, 90d, custom' }

    let fromDate: Date | null = null
    let toDate: Date | null = null
    if (range === 'custom') {
        fromDate = parseIsoDate(req.query?.from)
        toDate = parseIsoDate(req.query?.to)
        if (!fromDate || !toDate) return { query: null, error: '"from" and "to" are required ISO dates when range=custom' }
        if (fromDate.getTime() > toDate.getTime()) return { query: null, error: '"from" cannot be greater than "to"' }
    }

    return {
        query: {
            range,
            from: fromDate,
            to: toDate,
            channel: parseChannel(req.query?.channel),
            categoryId: typeof req.query?.categoryId === 'string' ? req.query.categoryId : null,
            wilayaCode: typeof req.query?.wilayaCode === 'string' ? req.query.wilayaCode : null,
            provider: typeof req.query?.provider === 'string' ? req.query.provider : null
        }
    }
}

const csvEscape = (value: unknown) => {
    const str = String(value ?? '')
    if (/[",\n;]/.test(str)) return `"${str.replace(/"/g, '""')}"`
    return str
}

const toCsv = (rows: Array<Record<string, unknown>>, columns: string[]) => {
    const header = columns.join(',')
    const lines = rows.map((row) => columns.map((col) => csvEscape(row[col])).join(','))
    return [header, ...lines].join('\r\n')
}

const sendCsv = (res: Response, filename: string, csv: string) => {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send('﻿' + csv)
}

export class StatisticsController {
    async getSales(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { query, error } = buildQuery(req)
            if (!query) return res.status(400).json({ statusCode: 400, statusMessage: error })
            const data = await service.getSalesStats(tenant.id, query)
            res.json(data)
        } catch (error) {
            console.error('Get sales stats error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async getDelivery(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { query, error } = buildQuery(req)
            if (!query) return res.status(400).json({ statusCode: 400, statusMessage: error })
            const data = await service.getDeliveryStats(tenant.id, query)
            res.json(data)
        } catch (error) {
            console.error('Get delivery stats error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async getProducts(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { query, error } = buildQuery(req)
            if (!query) return res.status(400).json({ statusCode: 400, statusMessage: error })
            const data = await service.getProductsStats(tenant.id, query)
            res.json(data)
        } catch (error) {
            console.error('Get products stats error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async getCustomers(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { query, error } = buildQuery(req)
            if (!query) return res.status(400).json({ statusCode: 400, statusMessage: error })
            const data = await service.getCustomersStats(tenant.id, query)
            res.json(data)
        } catch (error) {
            console.error('Get customers stats error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async getProfitability(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { query, error } = buildQuery(req)
            if (!query) return res.status(400).json({ statusCode: 400, statusMessage: error })
            const data = await service.getProfitabilityStats(tenant.id, query)
            res.json(data)
        } catch (error) {
            console.error('Get profitability stats error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async exportCsv(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const tab = req.params.tab as Tab
            const { query, error } = buildQuery(req)
            if (!query) return res.status(400).json({ statusCode: 400, statusMessage: error })

            if (tab === 'sales') {
                const data = await service.getSalesStats(tenant.id, query)
                const csv = toCsv(
                    data.trends.map((r) => ({ ...r })),
                    ['date', 'ordersCount', 'onlineRevenue', 'posRevenue', 'totalRevenue']
                )
                return sendCsv(res, `ventes_${data.period.from}_${data.period.to}.csv`, csv)
            }
            if (tab === 'delivery') {
                const data = await service.getDeliveryStats(tenant.id, query)
                const csv = toCsv(
                    data.byWilaya.map((r) => ({ ...r })),
                    ['wilayaCode', 'total', 'delivered', 'returned', 'deliveredRate']
                )
                return sendCsv(res, `livraison_${data.period.from}_${data.period.to}.csv`, csv)
            }
            if (tab === 'products') {
                const data = await service.getProductsStats(tenant.id, query)
                const csv = toCsv(
                    data.topProducts.map((r) => ({ ...r })),
                    ['productId', 'title', 'quantity', 'revenue']
                )
                return sendCsv(res, `produits_${data.period.from}_${data.period.to}.csv`, csv)
            }
            if (tab === 'customers') {
                const data = await service.getCustomersStats(tenant.id, query)
                const csv = toCsv(
                    data.topCustomers.map((r) => ({ ...r })),
                    ['customerId', 'name', 'phone', 'ordersCount', 'revenue']
                )
                return sendCsv(res, `clients_${data.period.from}_${data.period.to}.csv`, csv)
            }
            if (tab === 'profitability') {
                const data = await service.getProfitabilityStats(tenant.id, query)
                const csv = toCsv(
                    data.byProduct.map((r) => ({ ...r })),
                    ['productId', 'title', 'quantity', 'revenue', 'cogs', 'margin', 'marginPct']
                )
                return sendCsv(res, `rentabilite_${data.period.from}_${data.period.to}.csv`, csv)
            }

            return res.status(400).json({ statusCode: 400, statusMessage: 'Invalid export tab' })
        } catch (error) {
            console.error('Export stats CSV error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}
