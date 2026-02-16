import { Router } from 'express'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'
import { StaffRolesController } from './staff-roles.controller'

const router = Router()
const controller = new StaffRolesController()

router.use(requireTenantAdmin)

router.get('/', controller.list.bind(controller))
router.post('/', controller.create.bind(controller))
router.patch('/:id', controller.update.bind(controller))
router.delete('/:id', controller.remove.bind(controller))

export default router

