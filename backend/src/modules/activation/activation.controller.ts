import type { Request, Response } from 'express';

import { ActivationError, ActivationService } from './activation.service';

const activationService = new ActivationService();

/**
 * Answers in the repo-wide `{ statusCode, statusMessage }` envelope, plus a
 * stable `code` the Flutter app branches on.
 *
 * `error` is emitted alongside for one release only: the current client reads
 * `data['error']` (admin_app/lib/services/api_service.dart). Once the client
 * ships reading `statusMessage`, drop it.
 */
const fail = (
  res: Response,
  statusCode: number,
  statusMessage: string,
  code: string,
  details?: Record<string, unknown>
) =>
  res.status(statusCode).json({
    statusCode,
    statusMessage,
    code,
    error: statusMessage,
    ...(details ?? {}),
  });

const handleError = (res: Response, error: unknown) => {
  if (error instanceof ActivationError) {
    return fail(
      res,
      error.statusCode,
      error.message,
      error.code,
      error.details
    );
  }

  const message = error instanceof Error ? error.message : 'Activation failed';
  return fail(res, 400, message, 'ACTIVATION_FAILED');
};

export class ActivationController {
  static async listDevices(req: Request, res: Response) {
    try {
      const tenantId = req.tenant?.id;

      if (!tenantId) {
        return fail(res, 400, 'Tenant context missing', 'TENANT_CONTEXT_MISSING');
      }

      const result = await activationService.listDevices(tenantId);
      res.status(200).json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  static async activateOnline(req: Request, res: Response) {
    try {
      const { licenseKey, hardwareId, deviceName, devicePlatform } = req.body;

      if (!licenseKey || !hardwareId) {
        return fail(
          res,
          400,
          'LicenseKey and hardwareId are required',
          'VALIDATION_FAILED'
        );
      }

      // Usually resolved from the Host header. When the app hits the root
      // platform domain there is no tenant, and the unique licenseKey resolves
      // it instead -- the service still refuses a key from another workspace.
      const tenantId = req.tenant?.id;

      const result = await activationService.activateDevice(
        tenantId,
        licenseKey,
        hardwareId,
        deviceName,
        devicePlatform
      );
      res.status(200).json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  static async activateOffline(req: Request, res: Response) {
    try {
      const { requestCode } = req.body;
      const tenantId = req.tenant?.id;

      if (!tenantId) {
        return fail(res, 400, 'Tenant context missing', 'TENANT_CONTEXT_MISSING');
      }

      if (!requestCode) {
        return fail(res, 400, 'requestCode is required', 'VALIDATION_FAILED');
      }

      const result = await activationService.offlineActivate(
        tenantId,
        requestCode
      );
      res.status(200).json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  /** Asks a super admin for a seat this device could not claim itself. */
  static async createRequest(req: Request, res: Response) {
    try {
      const tenantId = req.tenant?.id;
      const { hardwareId, deviceName, devicePlatform, replacesDeviceId, reason } =
        req.body ?? {};

      if (!tenantId) {
        return fail(res, 400, 'Tenant context missing', 'TENANT_CONTEXT_MISSING');
      }

      if (!hardwareId) {
        return fail(res, 400, 'hardwareId is required', 'VALIDATION_FAILED');
      }

      const result = await activationService.createActivationRequest({
        tenantId,
        hardwareId,
        deviceName,
        devicePlatform,
        replacesDeviceId,
        reason,
        // Present when the operator was able to log in but the seat was taken.
        requestedByUserId: req.user?.id,
      });

      res.status(201).json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  /** Polls for a decision. Requires the hardware id, not just the request id. */
  static async getRequest(req: Request, res: Response) {
    try {
      const hardwareId =
        typeof req.query.hardwareId === 'string' ? req.query.hardwareId : '';

      if (!hardwareId) {
        return fail(res, 400, 'hardwareId is required', 'VALIDATION_FAILED');
      }

      res.json(
        await activationService.getActivationRequest(
          req.params.requestId,
          hardwareId
        )
      );
    } catch (error) {
      handleError(res, error);
    }
  }

  /** Exchanges an approved claim code for a real licence, exactly once. */
  static async claimRequest(req: Request, res: Response) {
    try {
      const { claimCode, hardwareId } = req.body ?? {};

      if (!claimCode || !hardwareId) {
        return fail(
          res,
          400,
          'claimCode and hardwareId are required',
          'VALIDATION_FAILED'
        );
      }

      res.json(
        await activationService.claimApprovedRequest(claimCode, hardwareId)
      );
    } catch (error) {
      handleError(res, error);
    }
  }

  /**
   * Renews the offline window. Authenticated by the activation token itself --
   * a locked or unattended terminal has no user session to offer.
   */
  static async heartbeat(req: Request, res: Response) {
    try {
      const { activationToken, hardwareId, appVersion } = req.body;

      if (!activationToken || !hardwareId) {
        return fail(
          res,
          400,
          'activationToken and hardwareId are required',
          'VALIDATION_FAILED'
        );
      }

      const result = await activationService.heartbeat({
        activationToken,
        hardwareId,
        appVersion,
      });
      res.status(200).json(result);
    } catch (error) {
      handleError(res, error);
    }
  }
}
