import type { Request, Response } from 'express'
import { StaffRolesService, StaffRolesValidationError } from './staff-roles.service'

const service = new StaffRolesService()

export class StaffRolesController {
    async list(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const roles = await service.list(tenant.id)
            res.json(roles)
        } catch (error: any) {
            if (error instanceof StaffRolesValidationError) {
                return res
                    .status(error.statusCode)
                    .json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('List staff roles error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async create(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const role = await service.create(tenant.id, req.body)
            res.status(201).json(role)
        } catch (error: any) {
            if (error instanceof StaffRolesValidationError) {
                return res
                    .status(error.statusCode)
                    .json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Create staff role error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async update(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params
            if (!id || Array.isArray(id)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Role ID is required' })
            }

            const role = await service.update(tenant.id, id, req.body)
            res.json(role)
        } catch (error: any) {
            if (error instanceof StaffRolesValidationError) {
                return res
                    .status(error.statusCode)
                    .json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Update staff role error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async remove(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params
            if (!id || Array.isArray(id)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Role ID is required' })
            }

            const result = await service.remove(tenant.id, id)
            res.json(result)
        } catch (error: any) {
            if (error instanceof StaffRolesValidationError) {
                return res
                    .status(error.statusCode)
                    .json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Delete staff role error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}

