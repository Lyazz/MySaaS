import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud, requireStaffPermission } from '../../middleware/staff-permissions.middleware'
import { BlacklistController } from './blacklist.controller'

const router = Router()
const controller = new BlacklistController()

router.use(requireTenantMember)

router.get('/', requireStaffCrud('orders'), controller.list.bind(controller))
router.post('/', requireStaffPermission('orders', 'update'), controller.create.bind(controller))
router.delete('/:id', requireStaffPermission('orders', 'update'), controller.remove.bind(controller))

export default router
