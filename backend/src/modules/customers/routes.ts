import { Router } from 'express'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'
import { CustomersController } from './customers.controller'

const router = Router()
const controller = new CustomersController()

router.use(requireTenantAdmin)

router.get('/', controller.list.bind(controller))
router.get('/by-phone/:phone', controller.getByPhone.bind(controller))
router.get('/:id', controller.getById.bind(controller))

export default router
