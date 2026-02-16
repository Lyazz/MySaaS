import { Router } from 'express'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'
import { UsersController } from './users.controller'

const router = Router()
const controller = new UsersController()

router.use(requireTenantAdmin)

router.get('/', controller.list.bind(controller))
router.post('/', controller.create.bind(controller))
router.get('/:id', controller.getById.bind(controller))
router.patch('/:id', controller.update.bind(controller))
router.delete('/:id', controller.deactivate.bind(controller))

export default router

