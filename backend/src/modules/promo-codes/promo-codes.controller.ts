import type { Request, Response } from 'express'
import { PromoCodeError, PromoCodesService } from './promo-codes.service'

const service = new PromoCodesService()

const handle = (error: unknown, res: Response, label: string) => {
    if (error instanceof PromoCodeError) {
        return res.status(error.statusCode).json({
            statusCode: error.statusCode,
            statusMessage: error.statusMessage,
            code: error.code
        })
    }

    console.error(`${label}:`, error)
    return res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
}

export class PromoCodesController {
    async list(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { search, status } = req.query as { search?: string; status?: string }
            const items = await service.list(tenant.id, { search, status })
            res.json({ items })
        } catch (error) {
            handle(error, res, 'List promo codes error')
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params
            if (!id) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Promo code ID is required' })
            }
            res.json(await service.getById(tenant.id, id))
        } catch (error) {
            handle(error, res, 'Get promo code error')
        }
    }

    async create(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const user = req.user
            const created = await service.create(tenant.id, req.body ?? {}, { userId: user?.id ?? null })
            res.status(201).json(created)
        } catch (error) {
            handle(error, res, 'Create promo code error')
        }
    }

    async update(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params
            if (!id) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Promo code ID is required' })
            }
            res.json(await service.update(tenant.id, id, req.body ?? {}))
        } catch (error) {
            handle(error, res, 'Update promo code error')
        }
    }

    async remove(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params
            if (!id) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Promo code ID is required' })
            }
            const result = await service.remove(tenant.id, id)
            res.json({ success: true, ...result })
        } catch (error) {
            handle(error, res, 'Delete promo code error')
        }
    }

    async redemptions(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params
            if (!id) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Promo code ID is required' })
            }
            const items = await service.listRedemptions(tenant.id, id, Number(req.query?.limit) || 50)
            res.json({ items })
        } catch (error) {
            handle(error, res, 'List promo code redemptions error')
        }
    }
}
