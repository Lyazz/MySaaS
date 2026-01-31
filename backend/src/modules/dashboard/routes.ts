import { Router } from 'express'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'
import { DashboardController } from './dashboard.controller'

const router = Router()
const controller = new DashboardController()

router.use(requireTenantAdmin)

router.get('/', controller.getAdminDashboard.bind(controller))

export default router

