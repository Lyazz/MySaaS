import { Router } from 'express'
import { DeliveryController } from './delivery.controller'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'

const router = Router()
const controller = new DeliveryController()

// Public-ish: needs tenant context, no auth
router.post('/delivery/options', controller.getOptions.bind(controller))

// Admin required
router.post('/shipments', requireTenantAdmin, controller.createShipment.bind(controller))
router.get('/shipments', requireTenantAdmin, controller.listShipments.bind(controller))
router.get('/shipments/:id', requireTenantAdmin, controller.getShipment.bind(controller))
router.get('/shipments/:id/tracking', requireTenantAdmin, controller.track.bind(controller))



// Rate Management
router.get('/rates/:provider', requireTenantAdmin, controller.getDeliveryRates.bind(controller))
router.put('/rates/:provider', requireTenantAdmin, controller.updateDeliveryRates.bind(controller))

// Webhooks
router.post('/webhooks/maystro', controller.maystroWebhook.bind(controller))

// Self delivery admin status update
router.post('/self/shipments/:id/status', requireTenantAdmin, controller.updateSelfStatus.bind(controller))

export default router
