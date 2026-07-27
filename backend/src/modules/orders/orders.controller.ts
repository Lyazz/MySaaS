import type { Request, Response } from 'express'
import { OrdersService, OrderValidationError } from './orders.service'
import { DeliveryConfigurationError, DeliveryService } from '../delivery/delivery.service'
import { MaystroIntegrationError } from '../delivery/maystro/maystro.errors'
import { MaystroOrderService } from '../delivery/maystro/maystro-order.service'
import { getMaystroCredentials } from '../delivery/maystro/maystro.credentials'
import { YalidineIntegrationError } from '../delivery/yalidine/yalidine.errors'
import prisma from '../../lib/prisma'
import {
  fetchForExport,
  toRows,
  generateCsv,
  generateTxt,
  generateXlsx,
  generatePdf,
  DEFAULT_COLUMNS,
  EXPORT_COLUMNS,
} from './orders-export.service'

const service = new OrdersService()
const deliveryService = new DeliveryService()

export class OrdersController {
    async generateConfirmationToken(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const orderId = req.params.id
            const token = await service.generateConfirmationToken(tenant.id, orderId)
            res.json({ token })
        } catch (error: any) {
            console.error('Generate confirmation token error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async confirmTokenPublic(req: Request, res: Response) {
        try {
            const { token } = req.body
            if (!token) return res.status(400).json({ message: 'Token is required' })

            const order = await service.confirmOrderByToken(token)
            res.json({ success: true, orderId: order.id, publicOrderId: order.publicId })
        } catch (error: any) {
            console.error('Confirm order token error:', error)
            if (error.message === 'INVALID_TOKEN') {
                return res.status(400).json({ message: 'Invalid or already used token' })
            }
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
    async unreadCount(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const unreadCount = await service.getUnreadCount(tenant.id)
            res.json({ unreadCount })
        } catch (error) {
            console.error('Unread order count error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

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

    async markRead(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params

            if (!id || Array.isArray(id)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Order ID is required' })
            }

            try {
                const result = await service.markAsRead(tenant.id, id)
                res.json({ success: true, orderId: result.id, readAt: result.readAt })
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
            console.error('Mark order read error:', error)
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
                const beforeUpdate = await service.findById(tenant.id, id)
                const wasPendingBeforeConfirm = beforeUpdate?.status === 'PENDING' && status === 'CONFIRMED'

                const updated = await service.updateStatus(
                    tenant.id,
                    id,
                    status,
                    { userId: user?.id ?? null },
                    { cashboxId, method, reference, note, callStatus, internalNotes }
                )

                // When an order is confirmed with an API-backed carrier, push it immediately.
                if (status === 'CONFIRMED' && ['MAYSTRO', 'YALIDINE'].includes(String((updated as any)?.shippingProvider))) {
                    const order = updated as any
                    const provider = String(order.shippingProvider) as 'MAYSTRO' | 'YALIDINE'
                    try {
                        await deliveryService.createShipment({
                            tenantId: tenant.id,
                            provider,
                            orderId: order.id,
                            contactName: order.customerName ?? '',
                            contactPhone: order.customerPhone ?? '',
                            wilayaCode: order.shippingWilayaCode ?? '',
                            communeCode: order.shippingCommuneCode ?? undefined,
                            addressLine1: order.shippingAddressLine1 ?? order.customerAddress ?? '',
                            addressLine2: undefined,
                            notes: order.shippingNotes ?? undefined,
                            deliveryMode: order.deliveryMode === 'pickup' ? 'office' : 'home',
                            metadata: provider === 'MAYSTRO' && order.shippingPickupPoint
                                ? { pickupPoint: order.shippingPickupPoint, maystroDeliveryType: 3 }
                                : undefined
                        })
                        return res.json(updated)
                    } catch (shipmentErr: any) {
                        console.error('Auto Maystro shipment failed after confirm:', shipmentErr)
                        if (wasPendingBeforeConfirm) {
                            try {
                                await service.rollbackCarrierConfirmation(tenant.id, order.id)
                            } catch (rollbackErr) {
                                console.error('Carrier confirmation rollback failed:', rollbackErr)
                                return res.status(500).json({
                                    statusCode: 500,
                                    statusMessage: 'Carrier sync failed and order rollback could not be completed automatically'
                                })
                            }
                        }

                        if (shipmentErr instanceof OrderValidationError || shipmentErr.name === 'OrderValidationError') {
                            return res.status(shipmentErr.statusCode).json({
                                statusCode: shipmentErr.statusCode,
                                statusMessage: shipmentErr.statusMessage,
                                code: shipmentErr.code,
                                meta: shipmentErr.meta
                            })
                        }

                        if (shipmentErr instanceof DeliveryConfigurationError || shipmentErr.name === 'DeliveryConfigurationError') {
                            return res.status(shipmentErr.statusCode).json({
                                statusCode: shipmentErr.statusCode,
                                statusMessage: shipmentErr.statusMessage
                            })
                        }

                        if (shipmentErr instanceof MaystroIntegrationError || shipmentErr.name === 'MaystroIntegrationError') {
                            return res.status(shipmentErr.statusCode).json({
                                statusCode: shipmentErr.statusCode,
                                statusMessage: shipmentErr.statusMessage,
                                code: shipmentErr.code
                            })
                        }

                        if (shipmentErr instanceof YalidineIntegrationError || shipmentErr.name === 'YalidineIntegrationError') {
                            return res.status(shipmentErr.statusCode).json({
                                statusCode: shipmentErr.statusCode,
                                statusMessage: shipmentErr.statusMessage,
                                code: shipmentErr.code
                            })
                        }

                        return res.status(502).json({
                            statusCode: 502,
                            statusMessage: String(shipmentErr?.message || 'Failed to push order to delivery carrier')
                        })
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
        } catch (error: any) {
            console.error('Update order status error:', error)
            return res.status(error.statusCode || 500).json({
                message: 'Internal Server Error (Debug)',
                debugMessage: String(error?.message || error),
                debugStack: error?.stack
            })
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
                // If the order is CONFIRMED and has a Maystro mapping, cancel it on Maystro first
                const order = await service.findById(tenant.id, id)
                if (order?.status === 'CONFIRMED') {
                    const mapping = await prisma.maystroOrderMapping.findUnique({
                        where: { tenantId_localOrderId: { tenantId: tenant.id, localOrderId: id } }
                    })
                    if (mapping?.maystroOrderId) {
                        try {
                            const creds = await getMaystroCredentials(tenant.id)
                            const maystroOrders = new MaystroOrderService()
                            await maystroOrders.cancelMaystroOrder({
                                tenantId: tenant.id,
                                apiToken: creds.apiToken,
                                localOrderId: id
                            })
                        } catch (maystroErr: any) {
                            console.error('Maystro order cancellation failed during delete:', maystroErr)
                            // Non-blocking: proceed with local delete even if Maystro call fails
                        }
                    }
                }

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
            const result = await service.createPublicOrder({
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
                redeemPointsRequested: req.body?.redeemPointsRequested,
                items: req.body?.items ?? []
            }, req.subscription ? {
                planCode: req.subscription.planCode,
                interval: req.subscription.interval,
                currentPeriodStart: req.subscription.currentPeriodStart,
                currentPeriodEnd: req.subscription.currentPeriodEnd
            } : null)

            res.status(201).json({
                success: true,
                orderId: result.order?.id,
                publicOrderId: result.order?.publicId,
                order: result.order,
                loyaltySummary: result.loyaltySummary
            })
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

    async loyaltySummaryPublic(req: Request, res: Response) {
        const tenant = req.tenant
        if (!tenant) {
            return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant not found' })
        }

        try {
            const summary = await service.getPublicLoyaltySummary({
                tenantId: tenant.id,
                customerPhone: req.body?.customerPhone,
                redeemPointsRequested: req.body?.redeemPointsRequested,
                items: req.body?.items ?? []
            })

            res.json(summary)
        } catch (error) {
            if (error instanceof OrderValidationError) {
                return res.status(error.statusCode).json({
                    statusCode: error.statusCode,
                    statusMessage: error.statusMessage,
                    code: error.code,
                    meta: error.meta
                })
            }

            console.error('Public loyalty summary error:', error)
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

            res.status(201).json({ success: true, orderId: order?.id, publicOrderId: order?.publicId, order })
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

    async export(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { format, columns, status, search, startDate, endDate } = req.query as Record<string, string>

            const VALID_FORMATS = ['csv', 'xlsx', 'pdf', 'txt', 'gsheet']
            if (!format || !VALID_FORMATS.includes(format)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Invalid or missing format. Must be one of: csv, xlsx, pdf, txt, gsheet' })
            }

            const selectedColumns = columns
                ? columns.split(',').map(c => c.trim()).filter(c => EXPORT_COLUMNS.some(ec => ec.key === c))
                : DEFAULT_COLUMNS

            if (selectedColumns.length === 0) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'No valid columns specified' })
            }

            const { orders, truncated } = await fetchForExport(
                tenant.id,
                { status, search, startDate, endDate },
                selectedColumns
            )

            const headers = selectedColumns.map(k => EXPORT_COLUMNS.find(c => c.key === k)!.label)
            const rows = toRows(orders, selectedColumns)

            if (truncated) {
                res.setHeader('X-Export-Truncated', 'true')
            }

            const filename = `orders-export-${new Date().toISOString().split('T')[0]}`

            if (format === 'csv') {
                const buf = generateCsv(rows, headers)
                res.setHeader('Content-Type', 'text/csv; charset=utf-8')
                res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`)
                return res.send(buf)
            }

            if (format === 'txt') {
                const buf = generateTxt(rows, headers)
                res.setHeader('Content-Type', 'text/plain; charset=utf-8')
                res.setHeader('Content-Disposition', `attachment; filename="${filename}.txt"`)
                return res.send(buf)
            }

            if (format === 'xlsx') {
                const buf = await generateXlsx(rows, headers)
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`)
                return res.send(buf)
            }

            if (format === 'pdf') {
                const buf = await generatePdf(rows, headers, tenant.name ?? 'Store')
                res.setHeader('Content-Type', 'application/pdf')
                res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`)
                return res.send(buf)
            }

            if (format === 'gsheet') {
                // Phase 2 — Google Sheets not yet implemented
                return res.status(501).json({ statusCode: 501, statusMessage: 'Google Sheets export requires OAuth setup. See Phase 2.' })
            }
        } catch (error) {
            console.error('Export orders error:', error)
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

    async recordPayment(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const user = req.user!
            const { id } = req.params
            const { amount, method, cashboxId, reference, note } = req.body

            if (!id) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Order ID is required' })
            }
            if (!amount || typeof amount !== 'number' || amount <= 0) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Invalid amount' })
            }
            if (!cashboxId) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Cashbox ID is required' })
            }

            try {
                const result = await service.recordPayment(tenant.id, user.id, id, { amount, method, cashboxId, reference, note })
                res.json(result)
            } catch (err) {
                if (err instanceof OrderValidationError || err.name === 'CashValidationError' || err.statusCode) {
                    return res.status(err.statusCode || 400).json({
                        statusCode: err.statusCode || 400,
                        statusMessage: err.statusMessage || err.message,
                        code: err.code,
                        meta: err.meta
                    })
                }
                throw err
            }
        } catch (error) {
            console.error('Record order payment error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}
