import type { Request, Response } from 'express'

import { ActivationAdminService } from './activation-admin.service'
import { ActivationError } from './activation.service'

const service = new ActivationAdminService()

const fail = (
    res: Response,
    statusCode: number,
    statusMessage: string,
    code: string
) => res.status(statusCode).json({ statusCode, statusMessage, code, error: statusMessage })

const handleError = (res: Response, error: unknown) => {
    if (error instanceof ActivationError) {
        return fail(res, error.statusCode, error.message, error.code)
    }

    console.error('Activation admin error:', error)
    return fail(res, 500, 'Internal Server Error', 'INTERNAL_ERROR')
}

const asInt = (value: unknown): number | undefined => {
    const parsed = Number(value)
    return Number.isInteger(parsed) ? parsed : undefined
}

export class ActivationAdminController {
    static async listRequests(req: Request, res: Response) {
        try {
            const status =
                typeof req.query.status === 'string' ? req.query.status : undefined
            res.json({ requests: await service.listRequests(status) })
        } catch (error) {
            handleError(res, error)
        }
    }

    static async listTenantDevices(req: Request, res: Response) {
        try {
            res.json(await service.listTenantDevices(req.params.tenantId))
        } catch (error) {
            handleError(res, error)
        }
    }

    static async approveRequest(req: Request, res: Response) {
        try {
            const result = await service.approveRequest({
                requestId: req.params.requestId,
                adminUserId: req.user!.id,
                note: req.body?.note,
                drainHours: asInt(req.body?.drainHours)
            })

            res.json({
                request: result,
                // The device polls for this and swaps it exactly once.
                claimCode: result.claimCode
            })
        } catch (error) {
            handleError(res, error)
        }
    }

    static async denyRequest(req: Request, res: Response) {
        try {
            res.json({
                request: await service.denyRequest({
                    requestId: req.params.requestId,
                    adminUserId: req.user!.id,
                    note: req.body?.note
                })
            })
        } catch (error) {
            handleError(res, error)
        }
    }

    static async revokeDevice(req: Request, res: Response) {
        try {
            const reason =
                typeof req.body?.reason === 'string' ? req.body.reason.trim() : ''

            if (!reason) {
                return fail(res, 400, 'A reason is required', 'VALIDATION_FAILED')
            }

            res.json({
                device: await service.revokeDevice({
                    tenantId: req.params.tenantId,
                    deviceId: req.params.deviceId,
                    adminUserId: req.user!.id,
                    reason,
                    drainHours: asInt(req.body?.drainHours)
                })
            })
        } catch (error) {
            handleError(res, error)
        }
    }

    static async restoreDevice(req: Request, res: Response) {
        try {
            res.json({
                device: await service.restoreDevice({
                    tenantId: req.params.tenantId,
                    deviceId: req.params.deviceId,
                    adminUserId: req.user!.id
                })
            })
        } catch (error) {
            handleError(res, error)
        }
    }

    static async extendGrace(req: Request, res: Response) {
        try {
            const days = asInt(req.body?.days)

            if (days == null || days < 1 || days > 365) {
                return fail(
                    res,
                    400,
                    'days must be a whole number between 1 and 365',
                    'VALIDATION_FAILED'
                )
            }

            res.json({
                device: await service.extendGrace({
                    tenantId: req.params.tenantId,
                    deviceId: req.params.deviceId,
                    adminUserId: req.user!.id,
                    days
                })
            })
        } catch (error) {
            handleError(res, error)
        }
    }

    static async updateLicense(req: Request, res: Response) {
        try {
            const body = req.body ?? {}
            const data: Record<string, unknown> = {}

            if (body.maxDevices !== undefined) data.maxDevices = asInt(body.maxDevices)
            if (body.isActive !== undefined) data.isActive = body.isActive === true
            if (body.offlineValidityDays !== undefined) {
                data.offlineValidityDays = asInt(body.offlineValidityDays)
            }
            if (body.graceDays !== undefined) data.graceDays = asInt(body.graceDays)
            if (body.expiresAt !== undefined) {
                data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
            }

            if (Object.keys(data).length === 0) {
                return fail(res, 400, 'No changes supplied', 'VALIDATION_FAILED')
            }

            res.json({
                license: await service.updateLicense({
                    tenantId: req.params.tenantId,
                    licenseId: req.params.licenseId,
                    adminUserId: req.user!.id,
                    data
                })
            })
        } catch (error) {
            handleError(res, error)
        }
    }
}
