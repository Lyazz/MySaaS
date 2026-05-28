import { Router } from 'express';

import { ProvisioningController } from './provisioning.controller';

const router = Router();
const controller = new ProvisioningController();

router.post('/admin/provisioning/tokens', controller.issueActivationCode);
router.post('/provisioning/activate', controller.activate);

export default router;
