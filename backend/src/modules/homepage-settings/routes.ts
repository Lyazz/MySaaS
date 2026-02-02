import { Router } from 'express'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'
import { HomepageSettingsController } from './homepage-settings.controller'

const router = Router()
const controller = new HomepageSettingsController()

router.use(requireTenantAdmin)

router.get('/', controller.getAdmin.bind(controller))
router.patch('/', controller.patchAdmin.bind(controller))

export default router

