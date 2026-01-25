import { Router } from 'express'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'
import { ProductsController } from './products.controller'

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

// POST /products/:productId/variants - Create variant
router.post('/:productId/variants', controller.createVariant.bind(controller))

export default router
