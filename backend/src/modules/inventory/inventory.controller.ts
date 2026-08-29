import type { Request, Response } from 'express'
import { InventoryService, InventoryValidationError } from './inventory.service'

const service = new InventoryService()

export class InventoryController {
    async listVariants(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { search, productId, sortBy, sortOrder } = req.query as { search?: string; productId?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }
            const variants = await service.listVariants(tenant.id, {
                search: search ?? null,
                productId: productId ?? null,
                sortBy,
                sortOrder
            })
            res.json(variants)
        } catch (error) {
            console.error('List inventory variants error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async listMovements(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params
            const { take } = req.query as { take?: string }

            if (!id || Array.isArray(id)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Variant ID is required' })
            }

            const parsedTake = take ? Number(take) : undefined
            const moves = await service.listMovements(tenant.id, id, { take: Number.isFinite(parsedTake) ? parsedTake : undefined })
            res.json(moves)
        } catch (error: any) {
            if (error instanceof InventoryValidationError) {
                return res.status(error.statusCode).json({
                    statusCode: error.statusCode,
                    statusMessage: error.statusMessage,
                    code: error.code,
                    meta: error.meta
                })
            }
            console.error('List inventory movements error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async updateVariantInventory(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const user = req.user
            const { id } = req.params

            if (!id || Array.isArray(id)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Variant ID is required' })
            }

            if (req.body?.stock !== undefined || req.body?.reserved !== undefined) {
                return res.status(403).json({ statusCode: 403, statusMessage: 'stock/reserved are system-managed and cannot be edited' })
            }

            const updated = await service.updateVariantInventory(
                tenant.id,
                id,
                {
                    safetyStock: req.body?.safetyStock,
                    trackInventory: req.body?.trackInventory,
                    reason: req.body?.reason,
                    note: req.body?.note
                },
                { userId: user?.id ?? null }
            )

            res.json(updated)
        } catch (error: any) {
            if (error instanceof InventoryValidationError) {
                return res.status(error.statusCode).json({
                    statusCode: error.statusCode,
                    statusMessage: error.statusMessage,
                    code: error.code,
                    meta: error.meta
                })
            }
            console.error('Update variant inventory error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async adjustVariantStock(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const user = req.user
            const { id } = req.params

            if (!id || Array.isArray(id)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Variant ID is required' })
            }
            if (req.body?.stock !== undefined || req.body?.reserved !== undefined) {
                return res.status(403).json({ statusCode: 403, statusMessage: 'Use delta/stockSet; stock/reserved cannot be edited directly' })
            }

            const updated = await service.adjustVariantStock(
                tenant.id,
                id,
                { delta: req.body?.delta, reason: req.body?.reason, note: req.body?.note },
                { userId: user?.id ?? null }
            )

            res.json(updated)
        } catch (error: any) {
            if (error instanceof InventoryValidationError) {
                return res.status(error.statusCode).json({
                    statusCode: error.statusCode,
                    statusMessage: error.statusMessage,
                    code: error.code,
                    meta: error.meta
                })
            }
            console.error('Adjust variant stock error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async setVariantStock(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const user = req.user
            const { id } = req.params

            if (!id || Array.isArray(id)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Variant ID is required' })
            }
            if (req.body?.reserved !== undefined) {
                return res.status(403).json({ statusCode: 403, statusMessage: 'reserved is system-managed and cannot be edited' })
            }

            const updated = await service.setVariantStock(
                tenant.id,
                id,
                { stock: req.body?.stock, reason: req.body?.reason, note: req.body?.note },
                { userId: user?.id ?? null }
            )

            res.json(updated)
        } catch (error: any) {
            if (error instanceof InventoryValidationError) {
                return res.status(error.statusCode).json({
                    statusCode: error.statusCode,
                    statusMessage: error.statusMessage,
                    code: error.code,
                    meta: error.meta
                })
            }
            console.error('Set variant stock error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}
