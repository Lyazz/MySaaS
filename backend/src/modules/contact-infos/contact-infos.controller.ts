import type { Request, Response } from 'express'
import { ContactInfosNotFoundError, ContactInfosService, ContactInfosValidationError } from './contact-infos.service'

const service = new ContactInfosService()

export class ContactInfosController {
    async listAdmin(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const items = await service.listAdmin(tenant.id)
            res.json({ items })
        } catch (error) {
            console.error('List contact infos (admin) error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async createAdmin(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const body = req.body ?? {}

            try {
                const item = await service.create(tenant.id, body)
                res.status(201).json(item)
            } catch (e: any) {
                if (e instanceof ContactInfosValidationError) {
                    return res.status(e.statusCode).json({ statusCode: e.statusCode, statusMessage: e.statusMessage })
                }
                throw e
            }
        } catch (error) {
            console.error('Create contact info (admin) error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async patchAdmin(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const id = String(req.params.id || '')
            const body = req.body ?? {}

            try {
                const item = await service.update(tenant.id, id, body)
                res.json(item)
            } catch (e: any) {
                if (e instanceof ContactInfosValidationError) {
                    return res.status(e.statusCode).json({ statusCode: e.statusCode, statusMessage: e.statusMessage })
                }
                if (e instanceof ContactInfosNotFoundError) {
                    return res.status(e.statusCode).json({ statusCode: e.statusCode, statusMessage: e.statusMessage })
                }
                throw e
            }
        } catch (error) {
            console.error('Patch contact info (admin) error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async deleteAdmin(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const id = String(req.params.id || '')
            try {
                await service.remove(tenant.id, id)
                res.status(204).end()
            } catch (e: any) {
                if (e instanceof ContactInfosNotFoundError) {
                    return res.status(e.statusCode).json({ statusCode: e.statusCode, statusMessage: e.statusMessage })
                }
                throw e
            }
        } catch (error) {
            console.error('Delete contact info (admin) error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async listPublic(req: Request, res: Response) {
        try {
            const tenant = req.tenant
            if (!tenant) {
                return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant not found' })
            }

            const items = await service.listPublic(tenant.id)
            res.json({ items })
        } catch (error) {
            console.error('List contact infos (public) error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }
}
