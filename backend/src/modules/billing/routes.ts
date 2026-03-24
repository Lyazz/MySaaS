import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud } from '../../middleware/staff-permissions.middleware'
import { BillingController } from './billing.controller'

const router = Router()
const controller = new BillingController()

router.use(requireTenantMember)
router.use(requireStaffCrud('billing'))

router.get('/plans', controller.listPlans.bind(controller))
router.get('/subscription', controller.getSubscription.bind(controller))
router.get('/payments', controller.listPayments.bind(controller))
router.post('/payments/submit', controller.submitPayment.bind(controller))
router.post('/payments/simulate', controller.simulatePayment.bind(controller))

export default router

