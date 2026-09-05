import { Router } from 'express'
import { DeliveryController } from './delivery.controller'
import { DeliveryAccountsController } from './delivery-accounts.controller'
import { MaystroController } from './maystro/maystro.controller'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffPermission } from '../../middleware/staff-permissions.middleware'

const router = Router()
const controller = new DeliveryController()
const accountsController = new DeliveryAccountsController()
const maystroController = new MaystroController()

// Public-ish: needs tenant context, no auth
router.post('/delivery/options', controller.getOptions.bind(controller))
router.get('/delivery/companies', controller.listCompanies.bind(controller))
router.get('/delivery/communes', controller.listCommuneNames.bind(controller))
router.get(
    '/delivery/providers/:provider/pickup-points',
    controller.getPublicProviderPickupPoints.bind(controller)
)
router.get('/delivery/maystro/wilayas', maystroController.listWilayas.bind(maystroController))
router.get('/delivery/maystro/communes', maystroController.listCommunes.bind(maystroController))
router.get('/delivery/maystro/pickup-points', maystroController.listPickupPoints.bind(maystroController))
router.get('/delivery/maystro/stop-desk-communes', maystroController.listStopDeskCommunes.bind(maystroController))
router.get('/delivery/maystro/delivery-options', maystroController.listDeliveryOptions.bind(maystroController))
router.get('/delivery/maystro/delivery-prices', maystroController.getDeliveryPrice.bind(maystroController))

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
router.get(
    '/admin/delivery/providers/:provider/communes',
    requireTenantMember,
    requireStaffPermission('delivery', 'read'),
    controller.getProviderCommunes.bind(controller)
)
router.get(
    '/admin/delivery/providers/:provider/rate-cache',
    requireTenantMember,
    requireStaffPermission('delivery', 'read'),
    controller.getProviderRateCacheInfo.bind(controller)
)
router.get(
    '/admin/delivery/providers/:provider/pickup-points',
    requireTenantMember,
    requireStaffPermission('delivery', 'read'),
    controller.getProviderPickupPoints.bind(controller)
)
router.get(
    '/admin/delivery/providers/:provider/commune-price',
    requireTenantMember,
    requireStaffPermission('delivery', 'read'),
    controller.getProviderCommunePrice.bind(controller)
)

// Maystro management (admin)
router.get(
    '/admin/delivery/providers/MAYSTRO/hooks/types',
    requireTenantMember,
    requireStaffPermission('delivery', 'read'),
    maystroController.listHookTypes.bind(maystroController)
)
router.get(
    '/admin/delivery/providers/MAYSTRO/hooks',
    requireTenantMember,
    requireStaffPermission('delivery', 'read'),
    maystroController.listHooks.bind(maystroController)
)
router.post(
    '/admin/delivery/providers/MAYSTRO/hooks',
    requireTenantMember,
    requireStaffPermission('delivery', 'update'),
    maystroController.createHook.bind(maystroController)
)
router.delete(
    '/admin/delivery/providers/MAYSTRO/hooks/:id',
    requireTenantMember,
    requireStaffPermission('delivery', 'update'),
    maystroController.deleteHook.bind(maystroController)
)
router.post(
    '/admin/delivery/providers/MAYSTRO/bordereau',
    requireTenantMember,
    requireStaffPermission('delivery', 'read'),
    maystroController.createBordereau.bind(maystroController)
)
router.post(
    '/admin/delivery/providers/MAYSTRO/resync-products',
    requireTenantMember,
    requireStaffPermission('delivery', 'update'),
    maystroController.resyncProducts.bind(maystroController)
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
router.get('/webhooks/yalidine', controller.yalidineWebhookChallenge.bind(controller))
router.post('/webhooks/yalidine', controller.yalidineWebhook.bind(controller))

// Self delivery admin status update
router.post(
    '/self/shipments/:id/status',
    requireTenantMember,
    requireStaffPermission('delivery', 'update'),
    controller.updateSelfStatus.bind(controller)
)

export default router
