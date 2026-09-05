import type { PrismaClient, ShipmentStatus } from '@prisma/client'
import prisma from '../../../lib/prisma'
import { OrdersService } from '../../orders/orders.service'
import { yalidineStatusToLocalOrderStatus, yalidineStatusToShipmentStatus } from './yalidine-status'

type YalidineWebhookEvent = {
    event_id?: string
    occurred_at?: string
    data?: any
}

const parseEventDate = (value: unknown) => {
    if (typeof value !== 'string' || !value.trim()) return new Date()
    const normalized = value.trim().includes('T') ? value.trim() : value.trim().replace(' ', 'T')
    const parsed = new Date(normalized)
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

const extractTracking = (data: any): string | null => {
    const candidates = [
        data?.tracking,
        data?.parcel?.tracking,
        data?.parcel_tracking,
        data?.tracking_id,
        data?.id
    ]
    const found = candidates.find((value) => typeof value === 'string' || typeof value === 'number')
    const trimmed = found == null ? '' : String(found).trim()
    return trimmed || null
}

const extractOrderId = (data: any): string | null => {
    const candidates = [data?.order_id, data?.orderId, data?.parcel?.order_id, data?.parcel?.orderId]
    const found = candidates.find((value) => typeof value === 'string' || typeof value === 'number')
    const trimmed = found == null ? '' : String(found).trim()
    return trimmed || null
}

const extractStatus = (type: string, data: any): ShipmentStatus | null => {
    if (type === 'parcel_deleted') return 'CANCELLED'
    const rawStatus = data?.status ?? data?.parcel?.status ?? data?.status_name ?? data?.new_status
    if (rawStatus == null) return type === 'parcel_created' ? 'REQUESTED' : null
    return yalidineStatusToShipmentStatus(rawStatus)
}

export class YalidineWebhookService {
    private prisma: PrismaClient

    constructor(client: PrismaClient = prisma) {
        this.prisma = client
    }

    private async findShipment(input: { tenantId: string; tracking?: string | null; orderId?: string | null }) {
        const or = [
            input.tracking ? { providerShipmentId: input.tracking } : undefined,
            input.orderId ? { orderId: input.orderId } : undefined
        ].filter(Boolean) as any[]

        if (!or.length) return null

        return this.prisma.shipment.findFirst({
            where: {
                tenantId: input.tenantId,
                provider: 'YALIDINE',
                OR: or
            }
        })
    }

    async handleWebhook(input: { tenantId: string; payload: any }) {
        const type = typeof input.payload?.type === 'string' ? input.payload.type.trim() : ''
        const events = Array.isArray(input.payload?.events) ? (input.payload.events as YalidineWebhookEvent[]) : []
        if (!type || !events.length) return { handled: false, processed: 0, duplicates: 0 }

        let processed = 0
        let duplicates = 0
        const results: Array<{ eventId: string; handled: boolean; shipmentId?: string | null }> = []

        for (const event of events) {
            const eventId = typeof event?.event_id === 'string' ? event.event_id.trim() : ''
            if (!eventId) continue

            const eventCode = `yalidine:${eventId}`
            const duplicate = await this.prisma.shipmentEvent.findFirst({
                where: { tenantId: input.tenantId, code: eventCode },
                select: { id: true }
            })
            if (duplicate) {
                duplicates += 1
                results.push({ eventId, handled: true })
                continue
            }

            const data = event.data ?? {}
            const tracking = extractTracking(data)
            const orderId = extractOrderId(data)
            const shipment = await this.findShipment({ tenantId: input.tenantId, tracking, orderId })
            if (!shipment) {
                results.push({ eventId, handled: false, shipmentId: null })
                continue
            }

            const eventTime = parseEventDate(event.occurred_at)
            const shipmentStatus = extractStatus(type, data)
            const rawStatus = data?.status ?? data?.parcel?.status ?? data?.status_name ?? data?.new_status
            const localOrderStatus =
                type === 'parcel_deleted' ? 'CANCELLED' : rawStatus == null ? null : yalidineStatusToLocalOrderStatus(rawStatus)

            const latest = await this.prisma.shipmentEvent.findFirst({
                where: { tenantId: input.tenantId, shipmentId: shipment.id },
                orderBy: { eventTime: 'desc' },
                select: { eventTime: true }
            })
            const shouldApplyStatus = !latest?.eventTime || latest.eventTime.getTime() <= eventTime.getTime()

            await this.prisma.$transaction(async (tx) => {
                await tx.shipmentEvent.create({
                    data: {
                        tenantId: input.tenantId,
                        shipmentId: shipment.id,
                        status: shipmentStatus ?? undefined,
                        code: eventCode,
                        description: type,
                        details: {
                            yalidineEventId: eventId,
                            yalidineType: type,
                            status: rawStatus ?? null,
                            tracking,
                            orderId,
                            applied: shouldApplyStatus
                        },
                        rawPayload: event as any,
                        eventTime
                    }
                })

                if (shipmentStatus && shouldApplyStatus) {
                    await tx.shipment.update({
                        where: { tenantId_id: { tenantId: input.tenantId, id: shipment.id } },
                        data: { status: shipmentStatus }
                    })
                }
            })

            if (localOrderStatus && shouldApplyStatus) {
                const orders = new OrdersService()
                await orders.applyCarrierStatus(input.tenantId, shipment.orderId, localOrderStatus, { userId: null })
            }

            processed += 1
            results.push({ eventId, handled: true, shipmentId: shipment.id })
        }

        return { handled: true, processed, duplicates, results }
    }
}

