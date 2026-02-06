import type { Request, Response } from 'express'
import { BundleDealsService, BundleDealValidationError } from './bundle-deals.service'

const service = new BundleDealsService()

export class BundleDealsController {
    async list(req: Request, res: Response) {
        const tenant = req.tenant!
        const productId = req.params.productId as string

        try {
            const deals = await service.listByProduct(tenant.id, productId)
            res.json(deals)
        } catch (e: any) {
            if (e instanceof BundleDealValidationError) {
                return res.status(e.statusCode).json({ statusCode: e.statusCode, statusMessage: e.statusMessage })
            }
            console.error('List bundle deals error:', e)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async create(req: Request, res: Response) {
        const tenant = req.tenant!
        const productId = req.params.productId as string

        try {
            const deal = await service.createForProduct(tenant.id, productId, req.body ?? {})
            res.status(201).json(deal)
        } catch (e: any) {
            if (e instanceof BundleDealValidationError) {
                return res.status(e.statusCode).json({ statusCode: e.statusCode, statusMessage: e.statusMessage })
            }
            console.error('Create bundle deal error:', e)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async update(req: Request, res: Response) {
        const tenant = req.tenant!
        const productId = req.params.productId as string
        const dealId = req.params.dealId as string

        try {
            const deal = await service.update(tenant.id, productId, dealId, req.body ?? {})
            res.json(deal)
        } catch (e: any) {
            if (e instanceof BundleDealValidationError) {
                return res.status(e.statusCode).json({ statusCode: e.statusCode, statusMessage: e.statusMessage })
            }
            console.error('Update bundle deal error:', e)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async delete(req: Request, res: Response) {
        const tenant = req.tenant!
        const productId = req.params.productId as string
        const dealId = req.params.dealId as string

        try {
            const result = await service.delete(tenant.id, productId, dealId)
            res.json(result)
        } catch (e: any) {
            if (e instanceof BundleDealValidationError) {
                return res.status(e.statusCode).json({ statusCode: e.statusCode, statusMessage: e.statusMessage })
            }
            console.error('Delete bundle deal error:', e)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}

