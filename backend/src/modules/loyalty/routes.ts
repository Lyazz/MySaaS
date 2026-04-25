import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud } from '../../middleware/staff-permissions.middleware'
import { LoyaltyController } from './loyalty.controller'

const router = Router()
const controller = new LoyaltyController()

router.use(requireTenantMember)
router.use(requireStaffCrud('customers'))

router.get('/customers/:customerId', controller.getCustomerPoints.bind(controller))

export default router
