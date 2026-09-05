import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud } from '../../middleware/staff-permissions.middleware'
import { StatisticsController } from './statistics.controller'

const router = Router()
const controller = new StatisticsController()

router.use(requireTenantMember)
router.use(requireStaffCrud('statistics'))

router.get('/sales', controller.getSales.bind(controller))
router.get('/delivery', controller.getDelivery.bind(controller))
router.get('/products', controller.getProducts.bind(controller))
router.get('/customers', controller.getCustomers.bind(controller))
router.get('/profitability', controller.getProfitability.bind(controller))
router.get('/export/:tab', controller.exportCsv.bind(controller))

export default router
