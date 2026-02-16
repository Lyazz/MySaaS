import type { Request, Response } from 'express'
import { UsersService, UsersValidationError } from './users.service'

const service = new UsersService()

export class UsersController {
    async list(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { includeInactive } = req.query as { includeInactive?: string }
            const users = await service.list(tenant.id, includeInactive === 'true')
            res.json(users)
        } catch (error: any) {
            if (error instanceof UsersValidationError) {
                return res
                    .status(error.statusCode)
                    .json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('List users error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params
            if (!id || Array.isArray(id)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'User ID is required' })
            }
            const user = await service.getById(tenant.id, id)
            res.json(user)
        } catch (error: any) {
            if (error instanceof UsersValidationError) {
                return res
                    .status(error.statusCode)
                    .json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Get user error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async create(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const actor = req.user!
            const user = await service.create(
                tenant.id,
                { userId: actor.id, role: actor.role as any },
                req.body
            )
            res.status(201).json(user)
        } catch (error: any) {
            if (error instanceof UsersValidationError) {
                return res
                    .status(error.statusCode)
                    .json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Create user error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async update(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const actor = req.user!
            const { id } = req.params
            if (!id || Array.isArray(id)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'User ID is required' })
            }

            const user = await service.update(tenant.id, { userId: actor.id, role: actor.role as any }, id, req.body)
            res.json(user)
        } catch (error: any) {
            if (error instanceof UsersValidationError) {
                return res
                    .status(error.statusCode)
                    .json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Update user error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async deactivate(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const actor = req.user!
            const { id } = req.params
            if (!id || Array.isArray(id)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'User ID is required' })
            }
            const result = await service.deactivate(tenant.id, { userId: actor.id, role: actor.role as any }, id)
            res.json(result)
        } catch (error: any) {
            if (error instanceof UsersValidationError) {
                return res
                    .status(error.statusCode)
                    .json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Deactivate user error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}

