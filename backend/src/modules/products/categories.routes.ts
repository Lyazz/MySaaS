import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud } from '../../middleware/staff-permissions.middleware'
import { CategoriesController } from './categories.controller'

const router = Router()
const controller = new CategoriesController()

router.use(requireTenantMember)
router.use(requireStaffCrud('categories'))

router.get('/', controller.listCategories)
router.post('/', controller.createCategory)
router.get('/:id', controller.getCategory)
router.put('/:id', controller.updateCategory)
router.delete('/:id', controller.deleteCategory)

export default router
