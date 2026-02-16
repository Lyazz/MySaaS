import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud } from '../../middleware/staff-permissions.middleware'
import { MetaPixelsController } from './meta-pixels.controller'
import { ProductMetaPixelsController } from './product-meta-pixels.controller'

const router = Router()
const controller = new MetaPixelsController()
const productController = new ProductMetaPixelsController()

router.use(requireTenantMember)
router.use(requireStaffCrud('metaPixels'))

router.get('/', controller.list.bind(controller))
router.post('/', controller.create.bind(controller))

router.get('/products/:productId', productController.getForProduct.bind(productController))
router.put('/products/:productId', productController.setForProduct.bind(productController))

router.put('/:id', controller.update.bind(controller))
router.delete('/:id', controller.delete.bind(controller))
router.post('/:id/set-global', controller.setGlobal.bind(controller))

export default router
