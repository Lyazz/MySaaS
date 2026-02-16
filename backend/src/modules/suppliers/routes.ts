import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud } from '../../middleware/staff-permissions.middleware'
import { SuppliersController } from './suppliers.controller'

const router = Router()
const controller = new SuppliersController()

router.use(requireTenantMember)
router.use(requireStaffCrud('suppliers'))

router.get('/', controller.list.bind(controller))
router.post('/', controller.create.bind(controller))
router.get('/:id', controller.getById.bind(controller))
router.put('/:id', controller.update.bind(controller))
router.delete('/:id', controller.delete.bind(controller))

export default router
