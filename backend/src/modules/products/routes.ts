import { Router } from 'express'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'
import { ProductsController } from './products.controller'
import imagesRoutes from './images.routes'

const router = Router()
const controller = new ProductsController()

// Apply admin auth to all routes in this router
router.use(requireTenantAdmin)

// GET /products - List products
router.get('/', controller.listProducts.bind(controller))

// POST /products - Create product
router.post('/', controller.createProduct.bind(controller))

// GET /products/:id - Get product
router.get('/:id', controller.getProduct.bind(controller))

// PUT /products/:id - Update product
router.put('/:id', controller.updateProduct.bind(controller))

// DELETE /products/:id - Delete product
router.delete('/:id', controller.deleteProduct.bind(controller))

// POST /products/:productId/variants/generate - Generate variants from options
router.post('/:productId/variants/generate', controller.generateVariants.bind(controller))

// POST /products/:productId/options - Create option
router.post('/:productId/options', controller.createOption.bind(controller))

// DELETE /products/:productId/options/:optionId - Delete option
router.delete('/:productId/options/:optionId', controller.deleteOption.bind(controller))

// PUT /products/:productId/options/:optionId - Update option
router.put('/:productId/options/:optionId', controller.updateOption.bind(controller))

// POST /products/:productId/options/:optionId/values - Add option value
router.post('/:productId/options/:optionId/values', controller.addOptionValue.bind(controller))

// DELETE /products/:productId/options/:optionId/values/:valueId - Delete option value
router.delete('/:productId/options/:optionId/values/:valueId', controller.deleteOptionValue.bind(controller))

// PUT /products/:productId/options/:optionId/values/:valueId - Update option value
router.put('/:productId/options/:optionId/values/:valueId', controller.updateOptionValue.bind(controller))

// Mount image routes
router.use('/', imagesRoutes)

export default router
