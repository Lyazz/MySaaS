import { Router } from 'express'
import { requireSuperAdmin } from '../../middleware/superadmin.middleware'
import { BillingAdminController } from './billing-admin.controller'

const router = Router()
const controller = new BillingAdminController()

router.use(requireSuperAdmin)

router.get('/pending-payments', controller.listPendingPayments.bind(controller))
router.get('/tenants/:tenantId/payments', controller.listTenantPayments.bind(controller))
router.post('/tenants/:tenantId/payments/import', controller.importTenantPayment.bind(controller))
router.post('/tenants/:tenantId/payments/:paymentId/review', controller.reviewPayment.bind(controller))
router.put('/tenants/:tenantId/subscription', controller.setTenantSubscription.bind(controller))

export default router
