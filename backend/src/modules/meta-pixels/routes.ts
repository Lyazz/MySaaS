import { Router } from 'express'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'
import { MetaPixelsController } from './meta-pixels.controller'
import { ProductMetaPixelsController } from './product-meta-pixels.controller'

const router = Router()
const controller = new MetaPixelsController()
const productController = new ProductMetaPixelsController()

router.use(requireTenantAdmin)

router.get('/', controller.list.bind(controller))
router.post('/', controller.create.bind(controller))

router.get('/products/:productId', productController.getForProduct.bind(productController))
router.put('/products/:productId', productController.setForProduct.bind(productController))

router.put('/:id', controller.update.bind(controller))
router.delete('/:id', controller.delete.bind(controller))
router.post('/:id/set-global', controller.setGlobal.bind(controller))

export default router
