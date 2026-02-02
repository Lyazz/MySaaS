import { Router } from 'express'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'
import { PosController } from './pos.controller'

const router = Router()
const controller = new PosController()

router.use(requireTenantAdmin)

router.get('/lookup', controller.lookup.bind(controller))
router.post('/sales', controller.createSale.bind(controller))

export default router
