import { Router } from 'express'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'
import { SuppliersController } from './suppliers.controller'

const router = Router()
const controller = new SuppliersController()

router.use(requireTenantAdmin)

router.get('/', controller.list.bind(controller))
router.post('/', controller.create.bind(controller))
router.get('/:id', controller.getById.bind(controller))
router.put('/:id', controller.update.bind(controller))
router.delete('/:id', controller.delete.bind(controller))

export default router

