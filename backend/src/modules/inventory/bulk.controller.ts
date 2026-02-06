import type { Request, Response } from 'express'
import { BulkInventoryService } from './bulk.service'

const service = new BulkInventoryService()

export class BulkInventoryController {
    async exportVariantsCsv(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { search, productId } = req.query as { search?: string; productId?: string }

            const csv = await service.exportVariantsCsv(tenant.id, { search: search ?? null, productId: productId ?? null })
            res.setHeader('Content-Type', 'text/csv; charset=utf-8')
            res.setHeader('Content-Disposition', 'attachment; filename="inventory-variants.csv"')
            res.status(200).send(csv)
        } catch (error: any) {
            console.error('Export variants CSV error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: error?.message || 'Internal Server Error' })
        }
    }

    async importVariantsCsv(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const user = req.user
            const file = (req as any).file as { buffer?: Buffer } | undefined
            const csvText = file?.buffer ? file.buffer.toString('utf8') : ''

            if (!csvText.trim()) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'CSV file is required' })
            }

            const summary = await service.importVariantsCsv(tenant.id, csvText, { actorUserId: user?.id ?? null })
            res.json(summary)
        } catch (error: any) {
            console.error('Import variants CSV error:', error)
            res.status(400).json({ statusCode: 400, statusMessage: error?.message || 'Import failed' })
        }
    }

    async bulkPatchVariants(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const user = req.user
            const result = await service.bulkPatchVariants(tenant.id, {
                updates: Array.isArray(req.body?.updates) ? req.body.updates : [],
                reason: req.body?.reason,
                note: req.body?.note,
                actorUserId: user?.id ?? null
            })
            res.json(result)
        } catch (error: any) {
            console.error('Bulk patch variants error:', error)
            res.status(400).json({ statusCode: 400, statusMessage: error?.message || 'Bulk update failed' })
        }
    }
}

