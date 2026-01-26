import { Router } from 'express'
import { CategoriesController } from './categories.controller'

const router = Router()
const controller = new CategoriesController()

// GET /categories - Public categories listing
router.get('/', controller.listPublicCategories)

export default router
