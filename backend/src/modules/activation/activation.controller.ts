import type { Request, Response } from 'express';
import { ActivationService } from './activation.service';

const activationService = new ActivationService();

export class ActivationController {
  static async listDevices(req: Request, res: Response) {
    try {
      const tenantId = req.tenant?.id;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant context missing' });
      }

      const result = await activationService.listDevices(tenantId);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async activateOnline(req: Request, res: Response) {
    try {
      const { licenseKey, hardwareId, deviceName } = req.body;

      if (!licenseKey || !hardwareId) {
        return res
          .status(400)
          .json({ error: 'LicenseKey and hardwareId are required' });
      }

      // tenantId is usually resolved from the host header middleware in this SaaS
      // If the Flutter app hits the root platform domain, req.tenant might be missing.
      // We will let the activationService resolve it from the unique licenseKey if needed.
      const tenantId = (req as any).tenant?.id;

      const result = await activationService.activateDevice(
        tenantId,
        licenseKey,
        hardwareId,
        deviceName
      );
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async activateOffline(req: Request, res: Response) {
    try {
      const { requestCode } = req.body;
      const tenantId = req.tenant?.id;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant context missing' });
      }

      if (!requestCode) {
        return res.status(400).json({ error: 'requestCode is required' });
      }

      const result = await activationService.offlineActivate(
        tenantId,
        requestCode
      );
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
