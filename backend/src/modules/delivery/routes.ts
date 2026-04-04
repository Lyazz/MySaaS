import { Router } from 'express'
import { DeliveryController } from './delivery.controller'
import { DeliveryAccountsController } from './delivery-accounts.controller'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffPermission } from '../../middleware/staff-permissions.middleware'

const router = Router()
const controller = new DeliveryController()
const accountsController = new DeliveryAccountsController()

// Public-ish: needs tenant context, no auth
router.post('/delivery/options', controller.getOptions.bind(controller))
router.get('/delivery/companies', controller.listCompanies.bind(controller))

// Admin required
router.post(
    '/shipments',
    requireTenantMember,
    requireStaffPermission('delivery', 'create'),
    controller.createShipment.bind(controller)
)
router.get(
    '/shipments',
    requireTenantMember,
    requireStaffPermission('delivery', 'read'),
    controller.listShipments.bind(controller)
)
router.get(
    '/shipments/:id',
    requireTenantMember,
    requireStaffPermission('delivery', 'read'),
    controller.getShipment.bind(controller)
)
router.get(
    '/shipments/:id/tracking',
    requireTenantMember,
    requireStaffPermission('delivery', 'read'),
    controller.track.bind(controller)
)

// Delivery providers + tenant accounts (admin)
router.get(
    '/admin/delivery/providers',
    requireTenantMember,
    requireStaffPermission('delivery', 'read'),
    accountsController.listProviders.bind(accountsController)
)
router.put(
    '/admin/delivery/providers/:provider/account',
    requireTenantMember,
    requireStaffPermission('delivery', 'update'),
    accountsController.upsertProviderAccount.bind(accountsController)
)

router.get(
    '/admin/delivery/providers/:provider/live-rates',
    requireTenantMember,
    requireStaffPermission('delivery', 'read'),
    controller.getProviderLiveRates.bind(controller)
)



// Rate Management
router.get(
    '/rates/:provider',
    requireTenantMember,
    requireStaffPermission('delivery', 'read'),
    controller.getDeliveryRates.bind(controller)
)
router.put(
    '/rates/:provider',
    requireTenantMember,
    requireStaffPermission('delivery', 'update'),
    controller.updateDeliveryRates.bind(controller)
)

// Webhooks
router.post('/webhooks/maystro', controller.maystroWebhook.bind(controller))

// Self delivery admin status update
router.post(
    '/self/shipments/:id/status',
    requireTenantMember,
    requireStaffPermission('delivery', 'update'),
    controller.updateSelfStatus.bind(controller)
)

export default router
