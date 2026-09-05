import { Router } from 'express'
import { requireSuperAdmin } from '../../../middleware/superadmin.middleware'
import { SuperAdminAiController } from './ai.controller'

const router = Router()
const controller = new SuperAdminAiController()

// Platform AI configuration. Super-admin only — these settings apply to every
// tenant at once, and the usage report is the one cross-tenant read we allow.
router.use(requireSuperAdmin)

router.get('/settings', (req, res) => controller.overview(req, res))
router.put('/settings', (req, res) => controller.updateSettings(req, res))
router.post('/settings/reset', (req, res) => controller.resetSettings(req, res))

router.get('/plan-quotas', (req, res) => controller.planOverrides(req, res))
router.put('/plan-quotas/:planCode', (req, res) => controller.updatePlanOverride(req, res))

router.get('/usage', (req, res) => controller.usage(req, res))

export default router
