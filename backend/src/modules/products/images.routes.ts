import { Router, Request, Response } from 'express'
import { ProductImagesService } from './images.service'

const router = Router()
const imagesService = new ProductImagesService()

// Note: All routes here are mounted under /admin/products and inherit requireTenantAdmin middleware

// Add image to product
router.post('/products/:productId/images', async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId
        if (!tenantId) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        const { productId } = req.params
        const { url, alt, position, isMain } = req.body

        if (!url) {
            return res.status(400).json({ error: 'Image URL is required' })
        }

        const image = await imagesService.addImage(tenantId, productId, { url, alt, position, isMain })
        res.json(image)
    } catch (error: any) {
        console.error('Add image error:', error)
        res.status(500).json({ error: error.message || 'Failed to add image' })
    }
})

// Update image
router.put('/products/:productId/images/:imageId', async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId
        if (!tenantId) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        const { productId, imageId } = req.params
        const { url, alt, position, isMain } = req.body

        const image = await imagesService.updateImage(tenantId, productId, imageId, { url, alt, position, isMain })
        res.json(image)
    } catch (error: any) {
        console.error('Update image error:', error)
        res.status(500).json({ error: error.message || 'Failed to update image' })
    }
})

// Delete image
router.delete('/products/:productId/images/:imageId', async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId
        if (!tenantId) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        const { productId, imageId } = req.params

        await imagesService.deleteImage(tenantId, productId, imageId)
        res.json({ success: true })
    } catch (error: any) {
        console.error('Delete image error:', error)
        res.status(500).json({ error: error.message || 'Failed to delete image' })
    }
})

// Reorder images (bulk update)
router.put('/products/:productId/images/reorder', async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId
        if (!tenantId) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        const { productId } = req.params
        const { imageOrders } = req.body

        if (!Array.isArray(imageOrders)) {
            return res.status(400).json({ error: 'imageOrders must be an array' })
        }

        const images = await imagesService.reorderImages(tenantId, productId, imageOrders)
        res.json(images)
    } catch (error: any) {
        console.error('Reorder images error:', error)
        res.status(500).json({ error: error.message || 'Failed to reorder images' })
    }
})

// Set image as main
router.put('/products/:productId/images/:imageId/set-main', async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId
        if (!tenantId) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        const { productId, imageId } = req.params

        const images = await imagesService.setMainImage(tenantId, productId, imageId)
        res.json(images)
    } catch (error: any) {
        console.error('Set main image error:', error)
        res.status(500).json({ error: error.message || 'Failed to set main image' })
    }
})

// Get all images for a product
router.get('/products/:productId/images', async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId
        if (!tenantId) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        const { productId } = req.params

        const images = await imagesService.getProductImages(tenantId, productId)
        res.json(images)
    } catch (error: any) {
        console.error('Get images error:', error)
        res.status(500).json({ error: error.message || 'Failed to get images' })
    }
})

// Sync images (full replacement)
router.put('/products/:productId/images/sync', async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId
        if (!tenantId) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        const { productId } = req.params
        const { images } = req.body

        if (!Array.isArray(images)) {
            return res.status(400).json({ error: 'images must be an array' })
        }

        const result = await imagesService.syncImages(tenantId, productId, images)
        res.json(result)
    } catch (error: any) {
        console.error('Sync images error:', error)
        res.status(500).json({ error: error.message || 'Failed to sync images' })
    }
})

export default router
