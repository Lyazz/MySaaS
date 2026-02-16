import type { Request, Response } from 'express'
import { AuditLogsService } from './audit-logs.service'

const service = new AuditLogsService()

export class AuditLogsController {
    async list(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { limit } = req.query as { limit?: string }
            const take = Math.max(1, Math.min(200, Number(limit || 100) || 100))
            const logs = await service.listByTenant(tenant.id, take)
            res.json(logs)
        } catch (error) {
            console.error('List audit logs error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}

