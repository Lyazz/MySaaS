import type { Request, Response } from 'express'
import { CustomDomainError, CustomDomainsService } from './custom-domains.service'

const service = new CustomDomainsService()

const sendDomainError = (res: Response, error: unknown): boolean => {
    if (error instanceof CustomDomainError) {
        res.status(error.statusCode).json({
            statusCode: error.statusCode,
            statusMessage: error.statusMessage
        })
        return true
    }
    return false
}

export class CustomDomainsController {
    async list(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const domains = await service.list(tenant.id, tenant.slug)

            res.json({
                domains,
                cnameTarget: service.buildCnameTarget(tenant.slug),
                tenantSubdomain: service.buildCnameTarget(tenant.slug)
            })
        } catch (error) {
            if (sendDomainError(res, error)) return
            console.error('List custom domains error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async create(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const domain = await service.create(tenant.id, tenant.slug, req.body ?? {})
            res.status(201).json(domain)
        } catch (error) {
            if (sendDomainError(res, error)) return
            console.error('Create custom domain error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const id = String(req.params.id || '')
            await service.delete(tenant.id, id)
            res.status(204).end()
        } catch (error) {
            if (sendDomainError(res, error)) return
            console.error('Delete custom domain error:', error)
            res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }
}
