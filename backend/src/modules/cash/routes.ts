import { Router } from 'express'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'
import { CashController } from './cash.controller'

const router = Router()
const controller = new CashController()

router.use(requireTenantAdmin)

router.get('/cashboxes', controller.listCashboxes.bind(controller))
router.post('/cashboxes', controller.createCashbox.bind(controller))
router.patch('/cashboxes/:id', controller.updateCashbox.bind(controller))

router.get('/cash-sessions', controller.listSessions.bind(controller))
router.post('/cashboxes/:id/sessions/open', controller.openSession.bind(controller))
router.post('/cash-sessions/:id/close', controller.closeSession.bind(controller))

router.get('/cash-transactions', controller.listTransactions.bind(controller))
router.post('/cash-transactions', controller.createTransaction.bind(controller))

router.post('/cash-transfers', controller.transfer.bind(controller))

export default router

