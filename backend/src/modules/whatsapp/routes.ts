import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud, requireStaffPermission } from '../../middleware/staff-permissions.middleware'
import { WhatsAppAdminController } from './whatsapp-admin.controller'

const router = Router()
const controller = new WhatsAppAdminController()

router.use(requireTenantMember)

// Status carries no secret — the store's own number, its toggles and Meta's
// review state — and the order screen needs it to know which button to show.
router.get('/status', controller.status.bind(controller))

// Managing the connection itself is an integrations job.
router.post('/connect', requireStaffCrud('integrations'), controller.connect.bind(controller))
router.post('/disconnect', requireStaffCrud('integrations'), controller.disconnect.bind(controller))
router.patch('/settings', requireStaffCrud('integrations'), controller.updateSettings.bind(controller))
router.post('/templates/ensure', requireStaffCrud('integrations'), controller.ensureTemplates.bind(controller))
router.post('/templates/sync', requireStaffCrud('integrations'), controller.syncTemplates.bind(controller))

router.post(
    '/orders/:id/confirmation',
    requireStaffPermission('orders', 'update'),
    controller.sendConfirmation.bind(controller)
)
router.get(
    '/orders/:id/messages',
    requireStaffPermission('orders', 'read'),
    controller.orderMessages.bind(controller)
)

export default router
