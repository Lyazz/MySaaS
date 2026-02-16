import type { Request, Response } from 'express'
import { ProductImagesService } from './images.service'

export class ProductImagesController {
    constructor(private imagesService = new ProductImagesService()) {}

    private getTenantId(req: Request): string | null {
        return req.tenant?.id ?? null
    }

    private getParam(req: Request, key: string): string {
        const raw = (req.params as any)?.[key]
        if (Array.isArray(raw)) return raw[0] ?? ''
        return String(raw ?? '')
    }

    async addImage(req: Request, res: Response) {
        try {
            const tenantId = this.getTenantId(req)
            if (!tenantId) return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant not found' })

            const productId = this.getParam(req, 'productId')
            const { url, alt, position, isMain } = req.body

            if (!url) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Image URL is required' })
            }

            const image = await this.imagesService.addImage(tenantId, productId, { url, alt, position, isMain })
            res.json(image)
        } catch (error: any) {
            console.error('Add image error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: error.message || 'Failed to add image' })
        }
    }

    async updateImage(req: Request, res: Response) {
        try {
            const tenantId = this.getTenantId(req)
            if (!tenantId) return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant not found' })

            const productId = this.getParam(req, 'productId')
            const imageId = this.getParam(req, 'imageId')
            const { url, alt, position, isMain } = req.body

            const image = await this.imagesService.updateImage(tenantId, productId, imageId, { url, alt, position, isMain })
            res.json(image)
        } catch (error: any) {
            console.error('Update image error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: error.message || 'Failed to update image' })
        }
    }

    async deleteImage(req: Request, res: Response) {
        try {
            const tenantId = this.getTenantId(req)
            if (!tenantId) return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant not found' })

            const productId = this.getParam(req, 'productId')
            const imageId = this.getParam(req, 'imageId')
            await this.imagesService.deleteImage(tenantId, productId, imageId)
            res.json({ success: true })
        } catch (error: any) {
            console.error('Delete image error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: error.message || 'Failed to delete image' })
        }
    }

    async reorderImages(req: Request, res: Response) {
        try {
            const tenantId = this.getTenantId(req)
            if (!tenantId) return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant not found' })

            const productId = this.getParam(req, 'productId')
            const { imageOrders } = req.body

            if (!Array.isArray(imageOrders)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'imageOrders must be an array' })
            }

            const images = await this.imagesService.reorderImages(tenantId, productId, imageOrders)
            res.json(images)
        } catch (error: any) {
            console.error('Reorder images error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: error.message || 'Failed to reorder images' })
        }
    }

    async setMainImage(req: Request, res: Response) {
        try {
            const tenantId = this.getTenantId(req)
            if (!tenantId) return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant not found' })

            const productId = this.getParam(req, 'productId')
            const imageId = this.getParam(req, 'imageId')
            const images = await this.imagesService.setMainImage(tenantId, productId, imageId)
            res.json(images)
        } catch (error: any) {
            console.error('Set main image error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: error.message || 'Failed to set main image' })
        }
    }

    async getProductImages(req: Request, res: Response) {
        try {
            const tenantId = this.getTenantId(req)
            if (!tenantId) return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant not found' })

            const productId = this.getParam(req, 'productId')
            const images = await this.imagesService.getProductImages(tenantId, productId)
            res.json(images)
        } catch (error: any) {
            console.error('Get images error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: error.message || 'Failed to get images' })
        }
    }

    async syncImages(req: Request, res: Response) {
        try {
            const tenantId = this.getTenantId(req)
            if (!tenantId) return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant not found' })

            const productId = this.getParam(req, 'productId')
            const { images } = req.body

            if (!Array.isArray(images)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'images must be an array' })
            }

            const result = await this.imagesService.syncImages(tenantId, productId, images)
            res.json(result)
        } catch (error: any) {
            console.error('Sync images error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: error.message || 'Failed to sync images' })
        }
    }
}
