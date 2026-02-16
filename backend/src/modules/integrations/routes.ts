import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud } from '../../middleware/staff-permissions.middleware'
import { IntegrationsController } from './integrations.controller'

const router = Router()
const integrationsController = new IntegrationsController()

router.use(requireTenantMember)
router.use(requireStaffCrud('integrations'))

router.get('/:provider', integrationsController.getIntegration.bind(integrationsController))
router.post('/:provider', integrationsController.saveIntegration.bind(integrationsController))
router.post('/:provider/test', integrationsController.testIntegration.bind(integrationsController))

export default router
