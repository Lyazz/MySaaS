import { Router } from 'express'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'
import { IntegrationsController } from './integrations.controller'

const router = Router()
const integrationsController = new IntegrationsController()

router.use(requireTenantAdmin)

router.get('/:provider', integrationsController.getIntegration.bind(integrationsController))
router.post('/:provider', integrationsController.saveIntegration.bind(integrationsController))
router.post('/:provider/test', integrationsController.testIntegration.bind(integrationsController))

export default router
