import { Router } from 'express'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'
import { CategoriesController } from './categories.controller'

const router = Router()
const controller = new CategoriesController()

router.use(requireTenantAdmin)

router.get('/', controller.listCategories)
router.post('/', controller.createCategory)
router.get('/:id', controller.getCategory)
router.put('/:id', controller.updateCategory)
router.delete('/:id', controller.deleteCategory)

export default router
