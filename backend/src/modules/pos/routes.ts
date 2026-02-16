import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud } from '../../middleware/staff-permissions.middleware'
import { PosController } from './pos.controller'

const router = Router()
const controller = new PosController()

router.use(requireTenantMember)
router.use(requireStaffCrud('pos'))

router.get('/lookup', controller.lookup.bind(controller))
router.post('/sales', controller.createSale.bind(controller))

export default router
