import type { Request, Response } from 'express'
import { BlacklistService, BlacklistValidationError } from './blacklist.service'

const service = new BlacklistService()

export class BlacklistController {
    async list(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { type, search } = req.query as { type?: string; search?: string }
            const items = await service.list(tenant.id, { type, search })
            res.json({ items })
        } catch (error) {
            console.error('List blacklist entries error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async create(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const user = req.user
            const { type, value, reason, customerId } = req.body ?? {}

            try {
                const entry = await service.create(tenant.id, { type, value, reason, customerId }, { userId: user?.id ?? null })
                res.status(201).json(entry)
            } catch (err) {
                if (err instanceof BlacklistValidationError) {
                    return res.status(err.statusCode).json({ statusCode: err.statusCode, statusMessage: err.statusMessage, code: err.code })
                }
                throw err
            }
        } catch (error) {
            console.error('Create blacklist entry error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async remove(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params
            if (!id || Array.isArray(id)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Blacklist entry ID is required' })
            }

            try {
                const result = await service.remove(tenant.id, id)
                res.json({ success: true, ...result })
            } catch (err) {
                if (err instanceof BlacklistValidationError) {
                    return res.status(err.statusCode).json({ statusCode: err.statusCode, statusMessage: err.statusMessage })
                }
                throw err
            }
        } catch (error) {
            console.error('Delete blacklist entry error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}
