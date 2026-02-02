import { Router } from 'express'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'
import { ContactInfosController } from './contact-infos.controller'

const router = Router()
const controller = new ContactInfosController()

router.use(requireTenantAdmin)

router.get('/', controller.listAdmin.bind(controller))
router.post('/', controller.createAdmin.bind(controller))
router.patch('/:id', controller.patchAdmin.bind(controller))
router.delete('/:id', controller.deleteAdmin.bind(controller))

export default router

