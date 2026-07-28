import { Buffer } from 'node:buffer'
import type { PrismaClient } from '@prisma/client'
import prisma from '../../../lib/prisma'
import { maystroOrderStatusToLocalOrderStatus, maystroOrderStatusToShipmentStatus } from './maystro-status'
import { OrdersService } from '../../orders/orders.service'

const isProbablyBase64 = (value: string) => /^[A-Za-z0-9+/=]+$/.test(value) && value.length % 4 === 0

const tryJsonParse = (value: string) => {
    try {
        return JSON.parse(value)
    } catch {
        return null
    }
}

export const decodeMaystroWebhookBody = (raw: any): any | null => {
    if (raw == null) return null
    if (typeof raw === 'object') {
        if (typeof (raw as any).payload === 'string') return decodeMaystroWebhookBody((raw as any).payload)
        return raw
    }

    if (typeof raw !== 'string') return null
    const trimmed = raw.trim()
    if (!trimmed) return null

    const directJson = tryJsonParse(trimmed)
    if (directJson) return directJson

    if (!isProbablyBase64(trimmed)) return null

    const once = Buffer.from(trimmed, 'base64').toString('utf8').trim()
    const onceJson = tryJsonParse(once)
    if (onceJson) return onceJson

    if (isProbablyBase64(once)) {
        const twice = Buffer.from(once, 'base64').toString('utf8').trim()
        const twiceJson = tryJsonParse(twice)
        if (twiceJson) return twiceJson
    }

    return null
}

export class MaystroWebhookService {
    private prisma: PrismaClient

    constructor(client: PrismaClient = prisma) {
        this.prisma = client
    }

    async handleWebhook(input: { tenantId: string; raw: any; inventorySyncEnabled: boolean }) {
        const decoded = decodeMaystroWebhookBody(input.raw)
        if (!decoded) return null

        const eventRaw = decoded?.event ?? decoded?.type ?? decoded?.name ?? decoded?.trigger_type
        const event = typeof eventRaw === 'string' ? eventRaw.trim() : ''
        const eventKey = event.toLowerCase()

        const payload = decoded?.payload ?? decoded?.data ?? decoded

        const statusCode = payload?.status ?? payload?.status_code ?? payload?.statusCode
        const maystroOrderId =
            payload?.id ?? payload?.order_id ?? payload?.orderId ?? payload?.instance_uuid ??
            decoded?.id ?? decoded?.order_id ?? decoded?.orderId ?? decoded?.instance_uuid
        const externalId = payload?.external_id ?? payload?.externalId ?? decoded?.external_id ?? decoded?.externalId

        const shipmentStatus = statusCode != null ? maystroOrderStatusToShipmentStatus(statusCode) : null
        const localOrderStatus = statusCode != null ? maystroOrderStatusToLocalOrderStatus(statusCode) : null

        if (eventKey.includes('invent')) {
            if (input.inventorySyncEnabled) {
                await this.prisma.maystroInventoryEvent.create({
                    data: {
                        tenantId: input.tenantId,
                        maystroProductId:
                            typeof payload?.product === 'string'
                                ? payload.product
                                : typeof payload?.product_id === 'string'
                                    ? payload.product_id
                                    : null,
                        direction: typeof payload?.direction === 'string' ? payload.direction : null,
                        quantity:
                            typeof payload?.quantity === 'number' && Number.isFinite(payload.quantity)
                                ? Math.trunc(payload.quantity)
                                : null,
                        rawPayload: payload ?? decoded
                    }
                })
            } else {
                console.log(
                    JSON.stringify({
                        level: 'info',
                        msg: 'Maystro InventoryMovement received (ignored)',
                        tenantId: input.tenantId
                    })
                )
            }
            return { event: event || 'InventoryMovement', handled: true }
        }

        if (!shipmentStatus || (!maystroOrderId && !externalId)) {
            return { event: event || 'unknown', handled: false }
        }

        const mapping = await this.prisma.maystroOrderMapping.findFirst({
            where: {
                tenantId: input.tenantId,
                OR: [
                    maystroOrderId ? { maystroOrderId: String(maystroOrderId) } : undefined,
                    externalId ? { externalId: String(externalId) } : undefined
                ].filter(Boolean) as any
            }
        })

        // providerShipmentId stores tracking (display_id), not the UUID.
        // Prefer looking up by orderId via the mapping; fall back to providerShipmentId search.
        const shipment = mapping?.localOrderId
            ? await this.prisma.shipment.findFirst({
                where: {
                    tenantId: input.tenantId,
                    provider: 'MAYSTRO',
                    orderId: mapping.localOrderId
                }
            })
            : maystroOrderId
                ? await this.prisma.shipment.findFirst({
                    where: {
                        tenantId: input.tenantId,
                        provider: 'MAYSTRO',
                        providerShipmentId: String(maystroOrderId)
                    }
                })
                : null

        if (shipment) {
            await this.prisma.shipment.update({
                where: { tenantId_id: { tenantId: input.tenantId, id: shipment.id } },
                data: { status: shipmentStatus }
            })

            await this.prisma.shipmentEvent.create({
                data: {
                    tenantId: input.tenantId,
                    shipmentId: shipment.id,
                    status: shipmentStatus,
                    code: typeof statusCode === 'string' || typeof statusCode === 'number' ? String(statusCode) : undefined,
                    description: event || 'OrderStatusChanged',
                    rawPayload: payload ?? decoded,
                    eventTime: new Date()
                }
            })
        }

        if (mapping?.localOrderId && localOrderStatus) {
            const orders = new OrdersService()
            await orders.applyCarrierStatus(input.tenantId, mapping.localOrderId, localOrderStatus, { userId: null })
        }

        return { event: event || 'OrderStatusChanged', handled: true, shipmentId: shipment?.id, status: shipmentStatus }
    }
}
