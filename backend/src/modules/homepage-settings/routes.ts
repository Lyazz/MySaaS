import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud } from '../../middleware/staff-permissions.middleware'
import { HomepageSettingsController } from './homepage-settings.controller'

const router = Router()
const controller = new HomepageSettingsController()

router.use(requireTenantMember)
router.use(requireStaffCrud('homepageSettings'))

router.get('/', controller.getAdmin.bind(controller))
router.patch('/', controller.patchAdmin.bind(controller))

export default router
