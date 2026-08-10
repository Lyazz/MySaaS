import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud, requireStaffPermission } from '../../middleware/staff-permissions.middleware'
import { OrdersController } from './orders.controller'

const router = Router()
const controller = new OrdersController()

router.use(requireTenantMember)

router.get('/unread-count', requireStaffCrud('orders'), controller.unreadCount.bind(controller))
router.get('/', requireStaffCrud('orders'), controller.list.bind(controller))
router.get('/export', requireStaffCrud('orders'), controller.export.bind(controller))
router.get('/sync-maystro/candidates', requireStaffCrud('orders'), controller.getMaystroSyncCandidates.bind(controller))

router.post('/:id/mark-read', requireStaffPermission('orders', 'read'), controller.markRead.bind(controller))
router.post('/:id/blacklist', requireStaffPermission('orders', 'update'), controller.blacklistOrder.bind(controller))
router.get('/:id', requireStaffCrud('orders'), controller.getById.bind(controller))
router.get('/:id/bordereau', requireStaffCrud('orders'), controller.bordereauPdf.bind(controller))
router.post('/', requireStaffCrud('orders'), controller.createAdmin.bind(controller))
router.post('/:id/payments', requireStaffCrud('orders'), controller.recordPayment.bind(controller))
router.post('/:id/sync-maystro', requireStaffCrud('orders'), controller.syncMaystroOrder.bind(controller))
router.post('/:id/generate-confirmation', requireStaffPermission('orders', 'update'), controller.generateConfirmationToken.bind(controller))
router.patch('/:id', requireStaffCrud('orders'), controller.updateStatus.bind(controller))
router.put('/:id', requireStaffCrud('orders'), controller.updateUnconfirmed.bind(controller))
router.delete('/:id', requireStaffCrud('orders'), controller.deleteUnconfirmed.bind(controller))
router.post('/bulk-delete', requireStaffPermission('orders', 'delete'), controller.bulkDeleteUnconfirmed.bind(controller))

export default router
