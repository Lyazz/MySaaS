import type { Request, Response } from 'express';

import { ProvisioningService } from './provisioning.service';

const resolveStatusCode = (error: unknown, fallback = 500) => {
  const statusCode = (error as { statusCode?: number })?.statusCode;
  return typeof statusCode === 'number' ? statusCode : fallback;
};

export class ProvisioningController {
  constructor(
    private readonly provisioningService = new ProvisioningService()
  ) {}

  issueActivationCode = async (req: Request, res: Response) => {
    const user = req.user;
    const tenant = req.tenant;

    if (!user || !tenant) {
      return res.status(401).json({
        statusCode: 401,
        statusMessage: 'Unauthorized',
      });
    }

    try {
      const result = this.provisioningService.issueActivationCode({
        tenant,
        user,
      });
      return res.status(201).json({
        success: true,
        ...result,
      });
    } catch (error) {
      const statusCode = resolveStatusCode(error, 500);
      return res.status(statusCode).json({
        statusCode,
        statusMessage:
          error instanceof Error ? error.message : 'Internal Server Error',
      });
    }
  };

  activate = async (req: Request, res: Response) => {
    const activationCode =
      typeof req.body?.activationCode === 'string'
        ? req.body.activationCode
        : '';

    try {
      const payload =
        await this.provisioningService.activateFromCode(activationCode);
      return res.json({
        success: true,
        provisioning: payload,
      });
    } catch (error) {
      const statusCode = resolveStatusCode(error, 500);
      return res.status(statusCode).json({
        statusCode,
        statusMessage:
          error instanceof Error ? error.message : 'Internal Server Error',
      });
    }
  };
}
