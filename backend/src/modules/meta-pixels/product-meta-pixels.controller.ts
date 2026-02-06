import type { Request, Response } from 'express'
import { MetaPixelValidationError } from './meta-pixels.service'
import { ProductMetaPixelsService } from './product-meta-pixels.service'

const service = new ProductMetaPixelsService()

export class ProductMetaPixelsController {
    async getForProduct(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { productId } = req.params
            if (!productId || Array.isArray(productId)) return res.status(400).json({ statusCode: 400, statusMessage: 'Product ID required' })
            res.json({ metaPixelIds: await service.getAssignedMetaPixelIds(tenant.id, productId) })
        } catch (error: any) {
            if (error instanceof MetaPixelValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Get product meta pixels error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async setForProduct(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { productId } = req.params
            if (!productId || Array.isArray(productId)) return res.status(400).json({ statusCode: 400, statusMessage: 'Product ID required' })

            const metaPixelIds = Array.isArray(req.body?.metaPixelIds) ? req.body.metaPixelIds : []
            const saved = await service.setAssignedMetaPixelIds(tenant.id, productId, metaPixelIds)
            res.json({ metaPixelIds: saved })
        } catch (error: any) {
            if (error instanceof MetaPixelValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Set product meta pixels error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}

