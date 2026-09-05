import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffPermission } from '../../middleware/staff-permissions.middleware'
import { NotificationsController } from './notifications.controller'

const router = Router()
const controller = new NotificationsController()

router.use(requireTenantMember)
router.use(requireStaffPermission('orders', 'read'))

router.get('/stream', controller.stream.bind(controller))
router.get('/', controller.list.bind(controller))
router.post('/subscriptions', controller.registerSubscription.bind(controller))
router.delete('/subscriptions/:id', controller.disableSubscription.bind(controller))
router.post('/read-all', controller.markAllRead.bind(controller))
router.post('/:id/read', controller.markRead.bind(controller))

export default router
