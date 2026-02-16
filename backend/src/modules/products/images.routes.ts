import { Router } from 'express'
import { ProductImagesController } from './images.controller'

const router = Router()
const controller = new ProductImagesController()

// Note: This router is mounted under `/api/admin/products` and inherits auth/tenant middleware
// (including staff permission checks from the parent router).
// Primary routes: `/api/admin/products/:productId/images/*`

router.post('/:productId/images', controller.addImage.bind(controller))
router.put('/:productId/images/:imageId', controller.updateImage.bind(controller))
router.delete('/:productId/images/:imageId', controller.deleteImage.bind(controller))
router.put('/:productId/images/reorder', controller.reorderImages.bind(controller))
router.put('/:productId/images/:imageId/set-main', controller.setMainImage.bind(controller))
router.get('/:productId/images', controller.getProductImages.bind(controller))
router.put('/:productId/images/sync', controller.syncImages.bind(controller))

// Backwards-compatible aliases (older code used `/products/:productId/...` by mistake).
router.post('/products/:productId/images', controller.addImage.bind(controller))
router.put('/products/:productId/images/:imageId', controller.updateImage.bind(controller))
router.delete('/products/:productId/images/:imageId', controller.deleteImage.bind(controller))
router.put('/products/:productId/images/reorder', controller.reorderImages.bind(controller))
router.put('/products/:productId/images/:imageId/set-main', controller.setMainImage.bind(controller))
router.get('/products/:productId/images', controller.getProductImages.bind(controller))
router.put('/products/:productId/images/sync', controller.syncImages.bind(controller))

export default router
