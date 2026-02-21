import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud } from '../../middleware/staff-permissions.middleware'
import { CashController } from './cash.controller'

const router = Router()
const controller = new CashController()

router.use(requireTenantMember)
router.use(requireStaffCrud('cash'))

router.get('/cashboxes', controller.listCashboxes.bind(controller))
router.post('/cashboxes', controller.createCashbox.bind(controller))
router.patch('/cashboxes/:id', controller.updateCashbox.bind(controller))

router.get('/cash-sessions', controller.listSessions.bind(controller))
router.get('/cash-sessions/:id/expected', controller.getSessionExpectedClosing.bind(controller))
router.post('/cashboxes/:id/sessions/open', controller.openSession.bind(controller))
router.post('/cash-sessions/:id/close', controller.closeSession.bind(controller))

router.get('/cash-transactions', controller.listTransactions.bind(controller))
router.post('/cash-transactions', controller.createTransaction.bind(controller))

router.post('/cash-transfers', controller.transfer.bind(controller))

router.get('/cash-users', controller.listCashUsers.bind(controller))

export default router
