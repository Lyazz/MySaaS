import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud } from '../../middleware/staff-permissions.middleware'
import { SalesController } from './sales.controller'

const router = Router()
const controller = new SalesController()

router.use(requireTenantMember)
router.use(requireStaffCrud('sales'))

router.get('/', controller.list.bind(controller))
router.get('/pos/:id', controller.getPosSaleById.bind(controller))
router.post('/:id/invoice', controller.createInvoice.bind(controller))
router.get('/:id/invoice/pdf', controller.invoicePdf.bind(controller))
router.get('/:id', controller.getById.bind(controller))
router.post('/', controller.createPosSale.bind(controller))
router.patch('/:id/status', controller.updateStatus.bind(controller))

export default router
