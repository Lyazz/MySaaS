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

export default router;
