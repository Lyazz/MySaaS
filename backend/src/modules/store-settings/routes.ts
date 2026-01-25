import { Router } from 'express'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'
import { StoreSettingsController } from './store-settings.controller'

const router = Router()
const controller = new StoreSettingsController()

router.use(requireTenantAdmin)

router.get('/', controller.getAdmin.bind(controller))
router.patch('/', controller.patchAdmin.bind(controller))
router.get('/agent-summary', controller.agentSummary.bind(controller))

export default router

