import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud, requireStaffPermission } from '../../middleware/staff-permissions.middleware'
import { OrdersController } from './orders.controller'

const router = Router()
const controller = new OrdersController()

router.use(requireTenantMember)

router.get('/', requireStaffCrud('orders'), controller.list.bind(controller))
router.get('/export', requireStaffCrud('orders'), controller.export.bind(controller))
router.get('/:id', requireStaffCrud('orders'), controller.getById.bind(controller))
router.get('/:id/bordereau', requireStaffCrud('orders'), controller.bordereauPdf.bind(controller))
router.post('/', requireStaffCrud('orders'), controller.createAdmin.bind(controller))
router.patch('/:id', requireStaffCrud('orders'), controller.updateStatus.bind(controller))
router.put('/:id', requireStaffCrud('orders'), controller.updateUnconfirmed.bind(controller))
router.delete('/:id', requireStaffCrud('orders'), controller.deleteUnconfirmed.bind(controller))
router.post('/bulk-delete', requireStaffPermission('orders', 'delete'), controller.bulkDeleteUnconfirmed.bind(controller))

export default router
