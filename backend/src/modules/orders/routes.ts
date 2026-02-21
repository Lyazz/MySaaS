import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud } from '../../middleware/staff-permissions.middleware'
import { OrdersController } from './orders.controller'

const router = Router()
const controller = new OrdersController()

router.use(requireTenantMember)
router.use(requireStaffCrud('orders'))

router.get('/', controller.list.bind(controller))
router.get('/:id', controller.getById.bind(controller))
router.post('/', controller.createAdmin.bind(controller))
router.patch('/:id', controller.updateStatus.bind(controller))

export default router
