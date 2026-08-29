import { Router } from 'express'

import { requireSuperAdmin } from '../../middleware/superadmin.middleware'

import { ActivationAdminController } from './activation-admin.controller'

/**
 * Super-admin device and licence management.
 *
 * Mounted under `/api/super-admin/activation`, which both `tenant-from-user`
 * and `subscription` middleware already skip, so these stay reachable for a
 * suspended or lapsed tenant -- which is exactly when they are needed.
 */
const router = Router()

router.use(requireSuperAdmin)

router.get('/requests', ActivationAdminController.listRequests)
router.post('/requests/:requestId/approve', ActivationAdminController.approveRequest)
router.post('/requests/:requestId/deny', ActivationAdminController.denyRequest)

router.get('/tenants/:tenantId/devices', ActivationAdminController.listTenantDevices)
router.post(
    '/tenants/:tenantId/devices/:deviceId/revoke',
    ActivationAdminController.revokeDevice
)
router.post(
    '/tenants/:tenantId/devices/:deviceId/restore',
    ActivationAdminController.restoreDevice
)
router.post(
    '/tenants/:tenantId/devices/:deviceId/extend-grace',
    ActivationAdminController.extendGrace
)
router.patch(
    '/tenants/:tenantId/licenses/:licenseId',
    ActivationAdminController.updateLicense
)

export default router
