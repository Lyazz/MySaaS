import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud } from '../../middleware/staff-permissions.middleware'
import { DashboardController } from './dashboard.controller'

const router = Router()
const controller = new DashboardController()

router.use(requireTenantMember)
router.use(requireStaffCrud('dashboard'))

router.get('/', controller.getAdminDashboard.bind(controller))

export default router
