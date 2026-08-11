import type { Request, Response } from 'express'
import { BulkProductsService } from './bulk.service'

const service = new BulkProductsService()

export class BulkProductsController {
    async exportCsv(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const idsParam = typeof req.query.ids === 'string' ? req.query.ids : ''
            const ids = idsParam ? idsParam.split(',').map((v) => v.trim()).filter(Boolean) : null

            const csv = await service.exportProductsCsv(tenant.id, { ids })
            res.setHeader('Content-Type', 'text/csv; charset=utf-8')
            res.setHeader('Content-Disposition', 'attachment; filename="products.csv"')
            res.status(200).send(csv)
        } catch (error: any) {
            console.error('Export products CSV error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: error?.message || 'Internal Server Error' })
        }
    }

    async importCsv(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const user = req.user
            const file = (req as any).file as { buffer?: Buffer } | undefined
            const csvText = file?.buffer ? file.buffer.toString('utf8') : ''

            if (!csvText.trim()) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'CSV file is required' })
            }

            const summary = await service.importProductsCsv(tenant.id, csvText, {
                actorUserId: user?.id ?? null
            })
            res.json(summary)
        } catch (error: any) {
            console.error('Import products CSV error:', error)
            res.status(400).json({ statusCode: 400, statusMessage: error?.message || 'Import failed' })
        }
    }

    async exportZip(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const idsParam = typeof req.query.ids === 'string' ? req.query.ids : ''
            const ids = idsParam ? idsParam.split(',').map((v) => v.trim()).filter(Boolean) : null

            const zip = await service.exportProductsArchive(tenant.id, { ids })
            res.setHeader('Content-Type', 'application/zip')
            res.setHeader('Content-Disposition', 'attachment; filename="products-archive.zip"')
            res.status(200).send(zip)
        } catch (error: any) {
            console.error('Export products archive error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: error?.message || 'Internal Server Error' })
        }
    }

    async importZip(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const user = req.user
            const file = (req as any).file as { buffer?: Buffer } | undefined

            if (!file?.buffer?.length) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'ZIP file is required' })
            }

            const summary = await service.importProductsArchive(tenant.id, file.buffer, {
                actorUserId: user?.id ?? null
            })
            res.json(summary)
        } catch (error: any) {
            console.error('Import products archive error:', error)
            res.status(400).json({ statusCode: 400, statusMessage: error?.message || 'Import failed' })
        }
    }

    async bulkPatch(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const user = req.user

            const result = await service.bulkPatchProducts(tenant.id, {
                ids: Array.isArray(req.body?.ids) ? req.body.ids : [],
                data: req.body?.data ?? {},
                options: req.body?.options ?? {},
                actorUserId: user?.id ?? null
            })

            res.json(result)
        } catch (error: any) {
            console.error('Bulk patch products error:', error)
            res.status(400).json({ statusCode: 400, statusMessage: error?.message || 'Bulk update failed' })
        }
    }

    async bulkDelete(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const ids = Array.isArray(req.body?.ids) ? req.body.ids : []

            try {
                const result = await service.bulkDeleteProducts(tenant.id, { ids })
                res.json(result)
            } catch (e: any) {
                if (e?.statusCode === 404 || e?.message === 'Product not found') {
                    return res.status(404).json({ statusCode: 404, statusMessage: 'Product not found' })
                }
                if (e?.statusCode === 409 || e?.message === 'HAS_TRANSACTIONS') {
                    return res.status(409).json({ statusCode: 409, statusMessage: 'HAS_TRANSACTIONS' })
                }
                if (typeof e?.statusCode === 'number') {
                    return res.status(e.statusCode).json({ statusCode: e.statusCode, statusMessage: e.statusMessage || e.message })
                }
                throw e
            }
        } catch (error: any) {
            console.error('Bulk delete products error:', error)
            res.status(400).json({ statusCode: 400, statusMessage: error?.message || 'Bulk delete failed' })
        }
    }

    async duplicate(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const id = req.params.id as string
            if (!id) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })

            const duplicated = await service.duplicateProduct(tenant.id, id, req.body ?? {})
            res.json(duplicated)
        } catch (error: any) {
            console.error('Duplicate product error:', error)
            if (error?.message === 'Product not found') {
                return res.status(404).json({ statusCode: 404, statusMessage: error.message })
            }
            res.status(400).json({ statusCode: 400, statusMessage: error?.message || 'Duplicate failed' })
        }
    }
}
