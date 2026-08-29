import type { Request, Response } from 'express'
import { SyncService, SyncValidationError } from './sync.service'

const service = new SyncService()

export class SyncController {
    async pull(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const payload = await service.pull(tenant.id, req.user, req.query.since)
            res.json(payload)
        } catch (error: any) {
            if (error instanceof SyncValidationError) {
                return res.status(error.statusCode).json({
                    statusCode: error.statusCode,
                    statusMessage: error.statusMessage
                })
            }
            console.error('Sync pull error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}
