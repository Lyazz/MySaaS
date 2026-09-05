import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud } from '../../middleware/staff-permissions.middleware'
import { GoogleOAuthController } from './google-oauth.controller'

const router = Router()
const controller = new GoogleOAuthController()

// GET /api/admin/orders/export/google-auth-url — returns OAuth consent URL
router.get('/google-auth-url', requireTenantMember, requireStaffCrud('orders'), controller.getAuthUrl.bind(controller))

// GET /api/admin/orders/export/google-callback — OAuth redirect target (no auth middleware, state carries identity)
router.get('/google-callback', controller.handleCallback.bind(controller))

// GET /api/admin/orders/export/google-export — trigger sheet creation
router.get('/google-export', requireTenantMember, requireStaffCrud('orders'), controller.exportToSheet.bind(controller))

export default router
