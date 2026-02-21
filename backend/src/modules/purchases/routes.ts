import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud } from '../../middleware/staff-permissions.middleware'
import { PurchasesController } from './purchases.controller'
import { requireCashCreateIfSupplierPaymentRequested } from './receive-payment.middleware'

const router = Router()
const controller = new PurchasesController()

router.use(requireTenantMember)
router.use(requireStaffCrud('purchases'))

router.get('/', controller.list.bind(controller))
router.post('/', controller.create.bind(controller))
router.get('/:id', controller.getById.bind(controller))
router.post('/:id/items', controller.addItem.bind(controller))
router.put('/:id/items/:itemId', controller.updateItem.bind(controller))
router.delete('/:id/items/:itemId', controller.removeItem.bind(controller))
router.post('/:id/receive', requireCashCreateIfSupplierPaymentRequested, controller.receive.bind(controller))
router.delete('/:id', controller.delete.bind(controller))

export default router
