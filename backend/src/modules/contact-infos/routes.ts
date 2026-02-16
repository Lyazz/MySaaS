import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud } from '../../middleware/staff-permissions.middleware'
import { ContactInfosController } from './contact-infos.controller'

const router = Router()
const controller = new ContactInfosController()

router.use(requireTenantMember)
router.use(requireStaffCrud('contactInfos'))

router.get('/', controller.listAdmin.bind(controller))
router.post('/', controller.createAdmin.bind(controller))
router.patch('/:id', controller.patchAdmin.bind(controller))
router.delete('/:id', controller.deleteAdmin.bind(controller))

export default router
