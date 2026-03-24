import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud } from '../../middleware/staff-permissions.middleware'
import { CustomersController } from './customers.controller'

const router = Router()
const controller = new CustomersController()

router.use(requireTenantMember)
router.use(requireStaffCrud('customers'))

router.get('/', controller.list.bind(controller))
router.post('/', controller.create.bind(controller))
router.get('/by-phone/:phone', controller.getByPhone.bind(controller))
router.get('/:id', controller.getById.bind(controller))
router.patch('/:id', controller.update.bind(controller))
router.delete('/:id', controller.delete.bind(controller))

export default router
