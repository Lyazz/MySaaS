import { Router } from 'express'

import { requireSuperAdmin } from '../../middleware/superadmin.middleware'

import { TenantMigrationController } from './tenant-migration.controller'

/**
 * Offline-only to online migration.
 *
 * Super-admin only, throughout. The predecessor (`POST /api/admin/sync/upgrade`)
 * was guarded by `requireTenantMember`, which meant any staff account could flip
 * its own tenant onto a paid tier for free. There is deliberately no
 * tenant-facing write path here at all.
 */
const router = Router({ mergeParams: true })

router.use(requireSuperAdmin)

router.post('/tenants/:tenantId/migration', TenantMigrationController.openJob)
router.post(
    '/tenants/:tenantId/migration/:jobId/batch',
    TenantMigrationController.ingestBatch
)
router.post(
    '/tenants/:tenantId/migration/:jobId/validate',
    TenantMigrationController.validate
)
router.post(
    '/tenants/:tenantId/migration/:jobId/apply',
    TenantMigrationController.apply
)
router.post('/tenants/:tenantId/tier', TenantMigrationController.setTier)

export default router
