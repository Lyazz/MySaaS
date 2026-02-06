import type { Request, Response } from 'express'
import { MetaPixelsService, MetaPixelValidationError } from './meta-pixels.service'

const service = new MetaPixelsService()

export class MetaPixelsController {
    async list(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            res.json(await service.list(tenant.id))
        } catch (error) {
            console.error('List meta pixels error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async create(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            res.status(201).json(await service.create(tenant.id, req.body))
        } catch (error: any) {
            if (error instanceof MetaPixelValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Create meta pixel error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async update(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params
            if (!id || Array.isArray(id)) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })
            res.json(await service.update(tenant.id, id, req.body))
        } catch (error: any) {
            if (error instanceof MetaPixelValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Update meta pixel error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params
            if (!id || Array.isArray(id)) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })
            res.json(await service.delete(tenant.id, id))
        } catch (error: any) {
            if (error instanceof MetaPixelValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Delete meta pixel error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async setGlobal(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params
            if (!id || Array.isArray(id)) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })
            res.json(await service.setGlobal(tenant.id, id))
        } catch (error: any) {
            if (error instanceof MetaPixelValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Set global meta pixel error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}

