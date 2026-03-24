import type { Request, Response } from 'express'
import { PurchasesService, PurchaseValidationError } from './purchases.service'

const service = new PurchasesService()

export class PurchasesController {
    async list(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { startDate, endDate, supplierId, status, paymentStatus } = req.query as { startDate?: string; endDate?: string; supplierId?: string; status?: string; paymentStatus?: string }
            res.json(await service.list(tenant.id, { startDate, endDate, supplierId, status, paymentStatus }))
        } catch (error) {
            console.error('List purchases error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async create(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const user = req.user
            const created = await service.create(tenant.id, req.body, { userId: user?.id ?? null })
            res.status(201).json(created)
        } catch (error: any) {
            if (error instanceof PurchaseValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Create purchase error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params
            if (!id || Array.isArray(id)) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })

            const po = await service.getById(tenant.id, id)
            if (!po) return res.status(404).json({ statusCode: 404, statusMessage: 'Purchase order not found' })
            res.json(po)
        } catch (error) {
            console.error('Get purchase error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async addItem(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params
            if (!id || Array.isArray(id)) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })
            const item = await service.addItem(tenant.id, id, req.body)
            res.status(201).json(item)
        } catch (error: any) {
            if (error instanceof PurchaseValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Add purchase item error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async receive(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const user = req.user
            const { id } = req.params
            if (!id || Array.isArray(id)) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })

            const updated = await service.receive(tenant.id, id, req.body, { userId: user?.id ?? null })
            res.json(updated)
        } catch (error: any) {
            if (error instanceof PurchaseValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Receive purchase error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params
            if (!id || Array.isArray(id)) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })
            await service.delete(tenant.id, id)
            res.status(204).send()
        } catch (error: any) {
            if (error instanceof PurchaseValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Delete purchase error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async updateItem(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id, itemId } = req.params
            if (!id || Array.isArray(id)) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })
            if (!itemId || Array.isArray(itemId)) return res.status(400).json({ statusCode: 400, statusMessage: 'Item ID required' })
            const updated = await service.updateItem(tenant.id, id, itemId, req.body)
            res.json(updated)
        } catch (error: any) {
            if (error instanceof PurchaseValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Update purchase item error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async removeItem(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id, itemId } = req.params
            if (!id || Array.isArray(id)) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })
            if (!itemId || Array.isArray(itemId)) return res.status(400).json({ statusCode: 400, statusMessage: 'Item ID required' })
            await service.removeItem(tenant.id, id, itemId)
            res.status(204).send()
        } catch (error: any) {
            if (error instanceof PurchaseValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Remove purchase item error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}
