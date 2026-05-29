import { Router } from 'express'
import { ActivationController } from './activation.controller'

const router = Router()

// These endpoints typically don't require standard JWT user authentication,
// because the device is not logged in yet.
// However, they require the tenantId to be resolved via the subdomain/host.
router.post('/online', ActivationController.activateOnline)
router.post('/offline', ActivationController.activateOffline)

export default router
