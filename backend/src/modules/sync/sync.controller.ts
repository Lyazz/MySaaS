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
    async upgrade(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const payload = req.body
            
            if (!payload) {
                return res.status(400).json({ statusCode: 400, message: 'Missing sync payload' })
            }

            const result = await service.upgrade(tenant.id, payload)
            res.json(result)
        } catch (error: any) {
            console.error('Sync upgrade error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}
