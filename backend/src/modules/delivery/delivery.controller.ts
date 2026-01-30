import type { Request, Response } from 'express'
import { DeliveryService } from './delivery.service'
import type { ShipmentProvider } from '@prisma/client'

const service = new DeliveryService()

export class DeliveryController {
    async getOptions(req: Request, res: Response) {
        const tenant = req.tenant
        if (!tenant) return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant is required' })

        const { provider, destination, codAmount, weight, serviceLevel } = req.body
        if (!provider || !destination?.wilayaCode) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'provider and destination.wilayaCode are required' })
        }

        try {
            const options = await service.listOptions({
                tenantId: tenant.id,
                provider,
                destination,
                codAmount,
                weight,
                serviceLevel
            })
            res.json(options)
        } catch (error) {
            console.error('Delivery options error', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async createShipment(req: Request, res: Response) {
        const tenant = req.tenant
        if (!tenant) return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant is required' })

        const body = req.body as {
            provider: ShipmentProvider
            orderId: string
            contactName: string
            contactPhone: string
            wilayaCode: string
            communeCode?: string
            addressLine1: string
            addressLine2?: string
            notes?: string
            serviceLevel?: string
            price?: number
            currency?: string
            metadata?: Record<string, any>
        }

        if (!body.provider || !body.orderId) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'provider and orderId are required' })
        }

        try {
            const shipment = await service.createShipment({
                tenantId: tenant.id,
                ...body
            })
            res.status(201).json(shipment)
        } catch (error: any) {
            if (error.message === 'Order not found for tenant') {
                return res.status(404).json({ statusCode: 404, statusMessage: error.message })
            }
            console.error('Create shipment error', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async getShipment(req: Request, res: Response) {
        const tenant = req.tenant
        if (!tenant) return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant is required' })
        const { id } = req.params
        try {
            const shipment = await service.getShipment(tenant.id, id)
            if (!shipment) return res.status(404).json({ statusCode: 404, statusMessage: 'Shipment not found' })
            res.json(shipment)
        } catch (error) {
            console.error('Get shipment error', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async track(req: Request, res: Response) {
        const tenant = req.tenant
        if (!tenant) return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant is required' })
        const { id } = req.params
        try {
            const result = await service.trackShipment(tenant.id, id)
            if (!result) return res.status(404).json({ statusCode: 404, statusMessage: 'Shipment not found' })
            res.json(result)
        } catch (error) {
            console.error('Track shipment error', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async maystroWebhook(req: Request, res: Response) {
        try {
            const result = await service.handleMaystroWebhook(req.body?.payload || req.body)
            if (!result) return res.status(202).json({ received: true })
            res.json({ success: true, ...result })
        } catch (error) {
            console.error('Maystro webhook error', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async updateSelfStatus(req: Request, res: Response) {
        const tenant = req.tenant
        if (!tenant) return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant is required' })
        const { id } = req.params
        const { status } = req.body as { status: string }
        if (!status) return res.status(400).json({ statusCode: 400, statusMessage: 'status required' })

        try {
            const updated = await service.updateSelfStatus(tenant.id, id, status as any)
            res.json(updated)
        } catch (error) {
            console.error('Self status update error', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
    async listShipments(req: Request, res: Response) {
        const tenant = req.tenant
        if (!tenant) return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant is required' })

        const { status, provider, search } = req.query as {
            status?: string
            provider?: string
            search?: string
        }

        try {
            const shipments = await service.listShipments(tenant.id, {
                status: status as any,
                provider: provider as any,
                search
            })
            res.json(shipments)
        } catch (error) {
            console.error('List shipments error', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }



    async getDeliveryRates(req: Request, res: Response) {
        const tenant = req.tenant
        if (!tenant) return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant is required' })
        const { provider } = req.params

        try {
            const rates = await service.getDeliveryRates(tenant.id, provider as any)
            res.json(rates)
        } catch (error) {
            console.error('Get rates error', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async updateDeliveryRates(req: Request, res: Response) {
        const tenant = req.tenant
        if (!tenant) return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant is required' })
        const { provider } = req.params
        const { rates } = req.body

        try {
            await service.updateDeliveryRates(tenant.id, provider as any, rates)
            res.json({ success: true })
        } catch (error) {
            console.error('Update rates error', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}
