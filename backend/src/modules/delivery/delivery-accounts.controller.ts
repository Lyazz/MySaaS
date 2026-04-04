import type { Request, Response } from 'express'
import { DeliveryAccountsService, DeliveryAccountsValidationError } from './delivery-accounts.service'
import { ShipmentProvider } from '@prisma/client'

const service = new DeliveryAccountsService()

const isShipmentProvider = (value: string): value is ShipmentProvider =>
    (Object.values(ShipmentProvider) as string[]).includes(value)

export class DeliveryAccountsController {
    async listProviders(req: Request, res: Response) {
        const tenant = req.tenant
        if (!tenant) return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant is required' })

        try {
            const providers = await service.listProviders(tenant.id)
            return res.json(providers)
        } catch (error) {
            console.error('List delivery providers error', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async upsertProviderAccount(req: Request, res: Response) {
        const tenant = req.tenant
        if (!tenant) return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant is required' })

        const provider = String(req.params.provider || '').toUpperCase()
        if (!provider || !isShipmentProvider(provider)) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Invalid provider' })
        }

        const body = req.body as { offered?: unknown; isActive?: unknown; config?: unknown }

        let offered: boolean | undefined
        if (body.offered !== undefined) {
            if (typeof body.offered !== 'boolean') {
                return res.status(400).json({ statusCode: 400, statusMessage: 'offered must be a boolean' })
            }
            offered = body.offered
        }

        let isActive: boolean | undefined
        if (body.isActive !== undefined) {
            if (typeof body.isActive !== 'boolean') {
                return res.status(400).json({ statusCode: 400, statusMessage: 'isActive must be a boolean' })
            }
            isActive = body.isActive
        }

        try {
            const updated = await service.upsertProviderAccount(tenant.id, provider, {
                offered,
                isActive,
                config: body.config as any
            })
            return res.json(updated)
        } catch (error: any) {
            if (error instanceof DeliveryAccountsValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Update delivery provider account error', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }
}
