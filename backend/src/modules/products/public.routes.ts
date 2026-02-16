import { Router } from 'express'
import { PublicProductsController } from './public-products.controller'

const router = Router()
const controller = new PublicProductsController()

// GET /products - Public product listing (active products only)
router.get('/', controller.list.bind(controller))

// GET /products/:slug - Public product detail
router.get('/:slug', controller.getBySlug.bind(controller))

export default router
