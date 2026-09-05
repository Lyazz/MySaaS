import type { Request, Response } from 'express'

import {
    MIGRATION_DOMAINS,
    TenantMigrationError,
    TenantMigrationService,
    type MigrationDomain
} from './tenant-migration.service'

const service = new TenantMigrationService()

const fail = (res: Response, statusCode: number, statusMessage: string, code: string) =>
    res.status(statusCode).json({ statusCode, statusMessage, code, error: statusMessage })

const handleError = (res: Response, error: unknown) => {
    if (error instanceof TenantMigrationError) {
        return fail(res, error.statusCode, error.message, error.code)
    }

    console.error('Tenant migration error:', error)
    return fail(res, 500, 'Internal Server Error', 'INTERNAL_ERROR')
}

export class TenantMigrationController {
    static async openJob(req: Request, res: Response) {
        try {
            res.status(201).json({
                job: await service.openJob({
                    tenantId: req.params.tenantId,
                    adminUserId: req.user!.id,
                    deviceId: req.body?.deviceId,
                    declaredCounts: req.body?.declaredCounts
                })
            })
        } catch (error) {
            handleError(res, error)
        }
    }

    static async ingestBatch(req: Request, res: Response) {
        try {
            const domain = req.body?.domain as MigrationDomain
            const rows = req.body?.rows

            if (!MIGRATION_DOMAINS.includes(domain)) {
                return fail(
                    res,
                    400,
                    `domain must be one of: ${MIGRATION_DOMAINS.join(', ')}`,
                    'UNKNOWN_DOMAIN'
                )
            }

            if (!Array.isArray(rows)) {
                return fail(res, 400, 'rows must be an array', 'VALIDATION_FAILED')
            }

            res.json(
                await service.ingestBatch({
                    tenantId: req.params.tenantId,
                    jobId: req.params.jobId,
                    domain,
                    rows
                })
            )
        } catch (error) {
            handleError(res, error)
        }
    }

    static async validate(req: Request, res: Response) {
        try {
            res.json(await service.validate(req.params.tenantId, req.params.jobId))
        } catch (error) {
            handleError(res, error)
        }
    }

    static async apply(req: Request, res: Response) {
        try {
            res.json({
                job: await service.apply({
                    tenantId: req.params.tenantId,
                    jobId: req.params.jobId,
                    adminUserId: req.user!.id
                })
            })
        } catch (error) {
            handleError(res, error)
        }
    }

    static async setTier(req: Request, res: Response) {
        try {
            if (typeof req.body?.isOffline !== 'boolean') {
                return fail(res, 400, 'isOffline must be a boolean', 'VALIDATION_FAILED')
            }

            res.json({
                tenant: await service.setTier({
                    tenantId: req.params.tenantId,
                    adminUserId: req.user!.id,
                    isOffline: req.body.isOffline
                })
            })
        } catch (error) {
            handleError(res, error)
        }
    }
}
