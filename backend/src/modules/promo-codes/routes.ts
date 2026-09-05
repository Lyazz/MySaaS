import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud } from '../../middleware/staff-permissions.middleware'
import { PromoCodesController } from './promo-codes.controller'

const router = Router()
const controller = new PromoCodesController()

router.use(requireTenantMember)
router.use(requireStaffCrud('promoCodes'))

router.get('/', controller.list.bind(controller))
router.post('/', controller.create.bind(controller))
router.get('/:id', controller.getById.bind(controller))
router.get('/:id/redemptions', controller.redemptions.bind(controller))
router.put('/:id', controller.update.bind(controller))
router.patch('/:id', controller.update.bind(controller))
router.delete('/:id', controller.remove.bind(controller))

export default router
