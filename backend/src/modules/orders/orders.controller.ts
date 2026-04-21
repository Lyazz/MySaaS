import type { Request, Response } from 'express'
import { OrdersService, OrderValidationError } from './orders.service'
import { DeliveryService } from '../delivery/delivery.service'
import { MaystroIntegrationError } from '../delivery/maystro/maystro.errors'

const service = new OrdersService()
const deliveryService = new DeliveryService()

export class OrdersController {
    async list(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { status, search, startDate, endDate, page: pageStr, limit: limitStr, sortBy, sortOrder } = req.query as {
                status?: string; search?: string; startDate?: string; endDate?: string; page?: string; limit?: string; sortBy?: string; sortOrder?: 'asc' | 'desc'
            }
            const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)
            const limit = Math.min(100, Math.max(1, parseInt(limitStr ?? '25', 10) || 25))
            const result = await service.list(
                tenant.id,
                { status, search, startDate, endDate, sortBy, sortOrder },
                { page, limit }
            )
            res.json(result)
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

    async bordereauPdf(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params

            if (!id || Array.isArray(id)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Order ID is required' })
            }

            try {
                const out = await service.getBordereauPdf(tenant.id, id, tenant.name)
                res.setHeader('Content-Type', 'application/pdf')
                res.setHeader('Content-Disposition', `inline; filename="${out.filename}"`)
                return res.send(out.pdf)
            } catch (err) {
                if (err instanceof OrderValidationError) {
                    return res.status(err.statusCode).json({
                        statusCode: err.statusCode,
                        statusMessage: err.statusMessage,
                        code: err.code,
                        meta: err.meta
                    })
                }
                throw err
            }
        } catch (error) {
            console.error('Order bordereau error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async updateStatus(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const user = req.user
            const { id } = req.params
            const { status, cashboxId, method, reference, note, callStatus, internalNotes } = req.body ?? {}

            if (!id || Array.isArray(id)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Order ID is required' })
            }

            try {
                const updated = await service.updateStatus(
                    tenant.id,
                    id,
                    status,
                    { userId: user?.id ?? null },
                    { cashboxId, method, reference, note, callStatus, internalNotes }
                )

                // When an order is confirmed and has Maystro as the shipping provider,
                // automatically push the order to Maystro so the admin doesn't need a separate step.
                if (status === 'CONFIRMED' && (updated as any)?.shippingProvider === 'MAYSTRO') {
                    const order = updated as any
                    try {
                        await deliveryService.createShipment({
                            tenantId: tenant.id,
                            provider: 'MAYSTRO',
                            orderId: order.id,
                            contactName: order.customerName ?? '',
                            contactPhone: order.customerPhone ?? '',
                            wilayaCode: order.shippingWilayaCode ?? '',
                            communeCode: order.shippingCommuneCode ?? undefined,
                            addressLine1: order.shippingAddressLine1 ?? order.customerAddress ?? '',
                            addressLine2: undefined,
                            notes: order.shippingNotes ?? undefined,
                            deliveryMode: order.deliveryMode === 'pickup' ? 'office' : 'home',
                            metadata: order.shippingPickupPoint
                                ? { pickupPoint: order.shippingPickupPoint, maystroDeliveryType: 3 }
                                : undefined
                        })
                        return res.json(updated)
                    } catch (shipmentErr: any) {
                        // The order status was successfully changed; report the Maystro error
                        // as a warning so the admin can see it and retry.
                        console.error('Auto Maystro shipment failed after confirm:', shipmentErr)
                        const msg =
                            shipmentErr instanceof MaystroIntegrationError
                                ? shipmentErr.statusMessage
                                : String(shipmentErr?.message || 'Failed to push order to Maystro')
                        return res.json({ ...order, _maystroError: msg })
                    }
                }

                res.json(updated)
            } catch (err) {
                if (err instanceof OrderValidationError) {
                    return res.status(err.statusCode).json({
                        statusCode: err.statusCode,
                        statusMessage: err.statusMessage,
                        code: err.code,
                        meta: err.meta
                    })
                }
                throw err
            }
        } catch (error) {
            console.error('Update order error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async updateUnconfirmed(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const user = req.user
            const { id } = req.params

            if (!id || Array.isArray(id)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Order ID is required' })
            }

            const {
                customerId,
                customerName,
                customerPhone,
                customerAddress,
                deliveryMode,
                shippingProvider,
                shippingWilayaCode,
                shippingCommuneCode,
                shippingServiceLevel,
                shippingAmount,
                shippingCurrency,
                shippingAddressLine1,
                shippingNotes,
                shippingPickupPoint,
                items
            } = req.body ?? {}

            try {
                const updated = await service.updateUnconfirmed(
                    tenant.id,
                    id,
                    {
                        customerId,
                        customerName,
                        customerPhone,
                        customerAddress,
                        deliveryMode,
                        shippingProvider,
                        shippingWilayaCode,
                        shippingCommuneCode,
                        shippingServiceLevel,
                        shippingAmount,
                        shippingCurrency,
                        shippingAddressLine1,
                        shippingNotes,
                        shippingPickupPoint,
                        items
                    },
                    { userId: user?.id ?? null }
                )
                res.json(updated)
            } catch (err) {
                if (err instanceof OrderValidationError) {
                    return res.status(err.statusCode).json({
                        statusCode: err.statusCode,
                        statusMessage: err.statusMessage,
                        code: err.code,
                        meta: err.meta
                    })
                }
                throw err
            }
        } catch (error) {
            console.error('Update unconfirmed order error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async deleteUnconfirmed(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params

            if (!id || Array.isArray(id)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Order ID is required' })
            }

            try {
                const deleted = await service.deleteUnconfirmed(tenant.id, id)
                res.json({ success: true, ...deleted })
            } catch (err) {
                if (err instanceof OrderValidationError) {
                    return res.status(err.statusCode).json({
                        statusCode: err.statusCode,
                        statusMessage: err.statusMessage,
                        code: err.code,
                        meta: err.meta
                    })
                }
                throw err
            }
        } catch (error) {
            console.error('Delete order error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async bulkDeleteUnconfirmed(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const ids = req.body?.ids

            if (!Array.isArray(ids)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'ids must be an array' })
            }

            try {
                const result = await service.bulkDeleteUnconfirmed(tenant.id, ids)
                res.json({ success: true, ...result })
            } catch (err) {
                if (err instanceof OrderValidationError) {
                    return res.status(err.statusCode).json({
                        statusCode: err.statusCode,
                        statusMessage: err.statusMessage,
                        code: err.code,
                        meta: err.meta
                    })
                }
                throw err
            }
        } catch (error) {
            console.error('Bulk delete orders error:', error)
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
                shippingServiceLevel: req.body?.shippingServiceLevel,
                shippingAmount: req.body?.shippingAmount,
                shippingCurrency: req.body?.shippingCurrency,
                shippingAddressLine1: req.body?.shippingAddressLine1,
                shippingNotes: req.body?.shippingNotes || req.body?.notes,
                deliveryMode: req.body?.deliveryMode,
                shippingProvider: req.body?.shippingProvider,
                shippingPickupPoint: req.body?.shippingPickupPoint,
                items: req.body?.items ?? []
            }, req.subscription ? {
                planCode: req.subscription.planCode,
                interval: req.subscription.interval,
                currentPeriodStart: req.subscription.currentPeriodStart,
                currentPeriodEnd: req.subscription.currentPeriodEnd
            } : null)

            res.status(201).json({ success: true, orderId: order?.id, order })
        } catch (error: any) {
            if (error instanceof OrderValidationError) {
                return res.status(error.statusCode).json({
                    statusCode: error.statusCode,
                    statusMessage: error.statusMessage,
                    code: error.code,
                    meta: error.meta
                })
            }

            console.error('Create order error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async createAdmin(req: Request, res: Response) {
        const tenant = req.tenant
        const user = req.user

        if (!tenant) {
            return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant not found' })
        }

        try {
            const order = await service.createAdminOrder(tenant.id, {
                tenantId: tenant.id,
                customerId: req.body?.customerId,
                customerName: req.body?.customerName,
                customerPhone: req.body?.customerPhone,
                customerAddress: req.body?.customerAddress,
                shippingWilayaCode: req.body?.shippingWilayaCode,
                shippingCommuneCode: req.body?.shippingCommuneCode,
                shippingServiceLevel: req.body?.shippingServiceLevel,
                shippingAmount: req.body?.shippingAmount,
                shippingCurrency: req.body?.shippingCurrency,
                shippingAddressLine1: req.body?.shippingAddressLine1,
                shippingNotes: req.body?.shippingNotes || req.body?.notes,
                deliveryMode: req.body?.deliveryMode,
                shippingProvider: req.body?.shippingProvider,
                shippingPickupPoint: req.body?.shippingPickupPoint,
                items: req.body?.items ?? []
            }, { userId: user?.id })

            res.status(201).json({ success: true, orderId: order?.id, order })
        } catch (error: any) {
            if (error instanceof OrderValidationError) {
                return res.status(error.statusCode).json({
                    statusCode: error.statusCode,
                    statusMessage: error.statusMessage,
                    code: error.code,
                    meta: error.meta
                })
            }

            console.error('Create admin order error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async pixelPayloadPublic(req: Request, res: Response) {
        const tenant = req.tenant
        if (!tenant) return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant not found' })

        const { id } = req.params
        if (!id || Array.isArray(id)) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Order ID is required' })
        }

        try {
            const payload = await service.getPublicPixelPayload(tenant.id, id)
            if (!payload) return res.status(404).json({ statusCode: 404, statusMessage: 'Order not found' })

            res.setHeader('Cache-Control', 'no-store')
            res.json(payload)
        } catch (error) {
            console.error('Order pixel payload error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}
