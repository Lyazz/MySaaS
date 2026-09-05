import { Router } from 'express'
import { CategoriesController } from './categories.controller'

const router = Router()
const controller = new CategoriesController()

// GET /categories - Public categories listing (LISTED only)
router.get('/', controller.listPublicCategories)

// GET /categories/:slug - Single category (reachable even when UNLISTED) + its products
router.get('/:slug', controller.getPublicCategoryBySlug)

export default router
