import { Router } from 'express'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'
import { BillingController } from './billing.controller'

const router = Router()
const controller = new BillingController()

router.use(requireTenantAdmin)

router.get('/plans', controller.listPlans.bind(controller))
router.get('/subscription', controller.getSubscription.bind(controller))
router.get('/payments', controller.listPayments.bind(controller))
router.post('/payments/simulate', controller.simulatePayment.bind(controller))

export default router
