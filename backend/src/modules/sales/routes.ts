import { Router } from 'express'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'
import { SalesController } from './sales.controller'

const router = Router()
const controller = new SalesController()

router.use(requireTenantAdmin)

router.get('/', controller.list.bind(controller))
router.get('/pos/:id', controller.getPosSaleById.bind(controller))
router.get('/:id', controller.getById.bind(controller))
router.post('/', controller.createPosSale.bind(controller))

export default router
