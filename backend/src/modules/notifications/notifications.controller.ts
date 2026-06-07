import type { Request, Response } from 'express'
import { notificationsService } from './notifications.service'

const parseTake = (value: unknown) => {
    const n = typeof value === 'string' ? Number(value) : 50
    return Number.isFinite(n) ? Math.max(1, Math.min(100, Math.trunc(n))) : 50
}

export class NotificationsController {
    async registerSubscription(req: Request, res: Response) {
        try {
            const tenant = req.tenant
            const user = req.user
            if (!tenant || !user) {
                return res.status(401).json({ statusCode: 401, statusMessage: 'Unauthorized' })
            }

            const subscription = await notificationsService.registerSubscription(tenant.id, user, req.body ?? {})
            return res.status(201).json(subscription)
        } catch (error: any) {
            return res.status(400).json({
                statusCode: 400,
                statusMessage: String(error?.message || 'Invalid notification subscription')
            })
        }
    }

    async disableSubscription(req: Request, res: Response) {
        try {
            const tenant = req.tenant
            const user = req.user
            const id = typeof req.params.id === 'string' ? req.params.id.trim() : ''
            if (!tenant || !user) {
                return res.status(401).json({ statusCode: 401, statusMessage: 'Unauthorized' })
            }
            if (!id) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Subscription ID is required' })
            }

            await notificationsService.disableSubscription(tenant.id, user.id, id)
            return res.json({ success: true })
        } catch (error: any) {
            const message = String(error?.message || '')
            if (message.includes('not found')) {
                return res.status(404).json({ statusCode: 404, statusMessage: 'Notification subscription not found' })
            }
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async list(req: Request, res: Response) {
        try {
            const tenant = req.tenant
            const user = req.user
            if (!tenant || !user) {
                return res.status(401).json({ statusCode: 401, statusMessage: 'Unauthorized' })
            }

            const items = await notificationsService.listForUser(tenant.id, user.id, parseTake(req.query.take))
            return res.json({ items })
        } catch (error) {
            console.error('List notifications error:', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async markRead(req: Request, res: Response) {
        try {
            const tenant = req.tenant
            const user = req.user
            const id = typeof req.params.id === 'string' ? req.params.id.trim() : ''
            if (!tenant || !user) {
                return res.status(401).json({ statusCode: 401, statusMessage: 'Unauthorized' })
            }
            if (!id) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Notification ID is required' })
            }

            const result = await notificationsService.markRead(tenant.id, user.id, id)
            return res.json({ success: true, ...result })
        } catch (error: any) {
            const message = String(error?.message || '')
            if (message.includes('not found')) {
                return res.status(404).json({ statusCode: 404, statusMessage: 'Notification not found' })
            }
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async stream(req: Request, res: Response) {
        const tenant = req.tenant
        const user = req.user
        if (!tenant || !user) {
            return res.status(401).json({ statusCode: 401, statusMessage: 'Unauthorized' })
        }

        notificationsService.openStream(tenant.id, user.id, res)
    }
}
