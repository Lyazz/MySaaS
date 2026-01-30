import { Router } from 'express'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'
import { OrdersController } from './orders.controller'

const router = Router()
const controller = new OrdersController()

router.use(requireTenantAdmin)

router.get('/', controller.list.bind(controller))
router.get('/:id', controller.getById.bind(controller))
router.patch('/:id', controller.updateStatus.bind(controller))

export default router
