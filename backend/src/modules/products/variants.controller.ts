import type { Request, Response } from 'express'
import { VariantsService } from './variants.service'
import { InventoryValidationError } from '../inventory/inventory.service'

const service = new VariantsService()

export class VariantsController {
    async updateVariant(req: Request, res: Response) {
        const tenant = req.tenant!
        const user = req.user
        const { id } = req.params

        if (!id || Array.isArray(id)) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })
        }

        try {
            const updated = await service.updateVariant(tenant.id, id, req.body, { userId: user?.id ?? null })
            res.json(updated)
        } catch (error: any) {
            if (error instanceof InventoryValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            if (typeof error?.statusCode === 'number') {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Update variant error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async replaceVariantImages(req: Request, res: Response) {
        const tenant = req.tenant!
        const { id } = req.params
        const { imageUrls } = req.body ?? {}

        if (!id || Array.isArray(id)) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })
        }

        try {
            const refreshed = await service.replaceVariantImages(tenant.id, id, imageUrls)
            res.json(refreshed)
        } catch (error: any) {
            if (typeof error?.statusCode === 'number') {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Update variant images error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async deleteVariant(req: Request, res: Response) {
        const tenant = req.tenant!
        const { id } = req.params

        if (!id || Array.isArray(id)) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })
        }

        try {
            const result = await service.deleteVariant(tenant.id, id)
            res.json(result)
        } catch (error: any) {
            if (typeof error?.statusCode === 'number') {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Delete variant error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}

