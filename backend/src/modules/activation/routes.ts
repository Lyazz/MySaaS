import { Router } from 'express';
import { ActivationController } from './activation.controller';
import { requireTenantAdmin } from '../../middleware/rbac.middleware';

const router = Router();

// These endpoints typically don't require standard JWT user authentication,
// because the device is not logged in yet.
// However, they require the tenantId to be resolved via the subdomain/host.
router.get('/devices', requireTenantAdmin, ActivationController.listDevices);
router.post('/online', ActivationController.activateOnline);
router.post(
  '/offline',
  requireTenantAdmin,
  ActivationController.activateOffline
);
// Deliberately unauthenticated: the activation token is the credential. A
// terminal that has fallen into read-only, or one left unattended on a counter,
// has no logged-in user -- and that is exactly when it must re-validate.
router.post('/heartbeat', ActivationController.heartbeat);

// Device transfer, all unauthenticated for the same reason as the heartbeat:
// a device that cannot claim a seat has no session to offer.
router.post('/requests', ActivationController.createRequest);
router.get('/requests/:requestId', ActivationController.getRequest);
router.post('/claim', ActivationController.claimRequest);

export default router;
