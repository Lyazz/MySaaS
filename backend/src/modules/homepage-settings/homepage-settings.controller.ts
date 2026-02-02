import type { Request, Response } from 'express'
import { HomepageSettingsService, HomepageSettingsValidationError } from './homepage-settings.service'

const service = new HomepageSettingsService()

export class HomepageSettingsController {
    async getAdmin(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const homeConfig = await service.getAdmin(tenant.id)
            res.json({ homeConfig })
        } catch (error) {
            console.error('Get homepage settings error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async patchAdmin(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const body = req.body ?? {}

            try {
                const homeConfig = await service.update(tenant.id, body)
                res.json({ homeConfig })
            } catch (e: any) {
                if (e instanceof HomepageSettingsValidationError) {
                    return res.status(e.statusCode).json({ statusCode: e.statusCode, statusMessage: e.statusMessage })
                }
                throw e
            }
        } catch (error) {
            console.error('Patch homepage settings error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async getPublic(req: Request, res: Response) {
        try {
            const tenant = req.tenant
            if (!tenant) {
                return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant not found' })
            }

            const { homeConfig, bestSellers } = await service.getPublicHomepage(tenant.id)
            res.json({ homeConfig, bestSellers })
        } catch (error) {
            console.error('Public homepage settings error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }
}

