import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud } from '../../middleware/staff-permissions.middleware'
import { StoreSettingsController } from './store-settings.controller'

const router = Router()
const controller = new StoreSettingsController()

router.use(requireTenantMember)
router.use(requireStaffCrud('storeSettings'))

router.get('/', controller.getAdmin.bind(controller))
router.patch('/', controller.patchAdmin.bind(controller))
router.get('/agent-summary', controller.agentSummary.bind(controller))
router.get('/onboarding-checklist', controller.getChecklist.bind(controller))
router.patch('/publish', controller.publish.bind(controller))

export default router
