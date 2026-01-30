import type { Request, Response } from 'express'
import { OrdersService, OrderValidationError } from './orders.service'

const service = new OrdersService()

export class OrdersController {
    async list(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { status, search } = req.query as { status?: string; search?: string }
            const orders = await service.list(tenant.id, { status, search })
            res.json(orders)
        } catch (error) {
            console.error('List orders error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params

            if (!id || Array.isArray(id)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Order ID is required' })
            }

            const order = await service.findById(tenant.id, id)
            if (!order) {
                return res.status(404).json({ statusCode: 404, statusMessage: 'Order not found' })
            }

            res.json(order)
        } catch (error) {
            console.error('Get order error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async updateStatus(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params
            const { status } = req.body ?? {}

            if (!id || Array.isArray(id)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Order ID is required' })
            }

            if (!status) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Status is required' })
            }

            try {
                const updated = await service.updateStatus(tenant.id, id, status)
                res.json(updated)
            } catch (err) {
                if (err instanceof OrderValidationError) {
                    return res.status(err.statusCode).json({
                        statusCode: err.statusCode,
                        statusMessage: err.statusMessage
                    })
                }
                throw err
            }
        } catch (error) {
            console.error('Update order error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async createPublic(req: Request, res: Response) {
        const tenant = req.tenant
        if (!tenant) {
            return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant not found' })
        }

        try {
            const order = await service.createPublicOrder({
                tenantId: tenant.id,
                customerName: req.body?.customerName,
                customerPhone: req.body?.customerPhone,
                customerAddress: req.body?.customerAddress,
                shippingWilayaCode: req.body?.shippingWilayaCode,
                shippingCommuneCode: req.body?.shippingCommuneCode,
                shippingAddressLine1: req.body?.shippingAddressLine1,
                shippingNotes: req.body?.shippingNotes || req.body?.notes,
                deliveryMode: req.body?.deliveryMode,
                shippingProvider: req.body?.shippingProvider,
                items: req.body?.items ?? []
            })

            res.status(201).json({ success: true, orderId: order?.id, order })
        } catch (error: any) {
            if (error instanceof OrderValidationError) {
                return res.status(error.statusCode).json({
                    statusCode: error.statusCode,
                    statusMessage: error.statusMessage
                })
            }

            console.error('Create order error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}
