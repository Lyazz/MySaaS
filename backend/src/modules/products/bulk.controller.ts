import type { Request, Response } from 'express'
import { BulkProductsService, type BulkProgress } from './bulk.service'

const service = new BulkProductsService()

const writeNdjson = (res: Response, payload: unknown) => {
    if (res.writableEnded) return
    res.write(`${JSON.stringify(payload)}\n`)
}

const startNdjsonStream = (res: Response) => {
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Accel-Buffering', 'no')
    res.status(200)
    ;(res as any).flushHeaders?.()
}

// Category auto-creation during import is a write to a *different* resource than "products", so it
// needs its own permission check: non-staff users (admin/owner) always have it, staff need the
// tenant's `requireStaffCrud('products')` middleware (applied to this whole router) to have already
// populated req.staffPermissions — we just check it for the 'categories:create' grant too.
const canCreateCategories = (req: Request): boolean => {
    if (req.user?.role !== 'staff') return true
    return req.staffPermissions?.has('categories:create') ?? false
}

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
                actorUserId: user?.id ?? null,
                canCreateCategories: canCreateCategories(req)
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
                actorUserId: user?.id ?? null,
                canCreateCategories: canCreateCategories(req)
            })
            res.json(summary)
        } catch (error: any) {
            console.error('Import products archive error:', error)
            res.status(400).json({ statusCode: 400, statusMessage: error?.message || 'Import failed' })
        }
    }

    // Streaming (NDJSON) variants: emit `{type:'progress', ...}` lines as the operation runs,
    // then a final `{type:'done', ...}` or `{type:'error', ...}` line. Used by the admin UI to
    // show a live progress dialog for large catalogs (import/export can take minutes for 400+
    // products with images) instead of a single request that looks frozen until it resolves.
    async exportZipStream(req: Request, res: Response) {
        const tenant = req.tenant!
        const idsParam = typeof req.query.ids === 'string' ? req.query.ids : ''
        const ids = idsParam ? idsParam.split(',').map((v) => v.trim()).filter(Boolean) : null

        startNdjsonStream(res)
        let clientGone = false
        req.on('close', () => {
            clientGone = true
        })

        try {
            const zip = await service.exportProductsArchive(tenant.id, { ids }, (progress: BulkProgress) => {
                if (!clientGone) writeNdjson(res, { type: 'progress', ...progress })
            })
            if (!clientGone) {
                writeNdjson(res, {
                    type: 'done',
                    filename: 'products-archive.zip',
                    dataBase64: zip.toString('base64')
                })
            }
        } catch (error: any) {
            console.error('Export products archive (stream) error:', error)
            if (!clientGone) writeNdjson(res, { type: 'error', message: error?.message || 'Export failed' })
        } finally {
            if (!res.writableEnded) res.end()
        }
    }

    async importZipStream(req: Request, res: Response) {
        const tenant = req.tenant!
        const user = req.user
        const file = (req as any).file as { buffer?: Buffer } | undefined

        if (!file?.buffer?.length) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'ZIP file is required' })
        }

        startNdjsonStream(res)
        let clientGone = false
        req.on('close', () => {
            clientGone = true
        })

        try {
            const summary = await service.importProductsArchive(
                tenant.id,
                file.buffer,
                { actorUserId: user?.id ?? null, canCreateCategories: canCreateCategories(req) },
                (progress: BulkProgress) => {
                    if (!clientGone) writeNdjson(res, { type: 'progress', ...progress })
                }
            )
            if (!clientGone) writeNdjson(res, { type: 'done', summary })
        } catch (error: any) {
            console.error('Import products archive (stream) error:', error)
            if (!clientGone) writeNdjson(res, { type: 'error', message: error?.message || 'Import failed' })
        } finally {
            if (!res.writableEnded) res.end()
        }
    }

    async importCsvStream(req: Request, res: Response) {
        const tenant = req.tenant!
        const user = req.user
        const file = (req as any).file as { buffer?: Buffer } | undefined
        const csvText = file?.buffer ? file.buffer.toString('utf8') : ''

        if (!csvText.trim()) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'CSV file is required' })
        }

        startNdjsonStream(res)
        let clientGone = false
        req.on('close', () => {
            clientGone = true
        })

        try {
            const summary = await service.importProductsCsv(
                tenant.id,
                csvText,
                { actorUserId: user?.id ?? null, canCreateCategories: canCreateCategories(req) },
                (processed, total) => {
                    if (!clientGone) writeNdjson(res, { type: 'progress', phase: 'rows', processed, total })
                }
            )
            if (!clientGone) writeNdjson(res, { type: 'done', summary })
        } catch (error: any) {
            console.error('Import products CSV (stream) error:', error)
            if (!clientGone) writeNdjson(res, { type: 'error', message: error?.message || 'Import failed' })
        } finally {
            if (!res.writableEnded) res.end()
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
