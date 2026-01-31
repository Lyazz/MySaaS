import type { Request, Response } from 'express'
import { DashboardService } from './dashboard.service'

const service = new DashboardService()

export class DashboardController {
    async getAdminDashboard(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const data = await service.getAdminDashboard(tenant.id)
            res.json(data)
        } catch (error) {
            console.error('Get admin dashboard error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}

