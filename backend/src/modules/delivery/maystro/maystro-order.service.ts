import type { PrismaClient } from '@prisma/client'
import prisma from '../../../lib/prisma'
import { MaystroClient } from './maystro.client'
import { MaystroIntegrationError } from './maystro.errors'
import { MaystroLocationService } from './maystro-location.service'
import { MaystroPickupPointService } from './maystro-pickup-point.service'
import { MaystroProductService } from './maystro-product.service'

type MaystroOrderDetail = {
    product: string
    description?: string
    quantity: number
}

type MaystroOrderPayload = {
    customer_name: string
    customer_phone: string
    customer_phone2?: string
    destination_text: string
    note_to_driver?: string
    express?: boolean
    external_id: string
    total_price: number
    delivery_type: number
    pickup_point?: number
    commune: string | number
    wilaya: string | number
    details: MaystroOrderDetail[]
}

type MaystroOrderResponse = {
    id?: string
    external_id?: string
    tracking?: string
    success?: boolean
    delivery_price?: number
    error_code?: number
    [key: string]: any
}

export class MaystroOrderService {
    private prisma: PrismaClient
    private location: MaystroLocationService
    private pickupPoints: MaystroPickupPointService
    private products: MaystroProductService

    constructor(client: PrismaClient = prisma) {
        this.prisma = client
        this.location = new MaystroLocationService(client)
        this.pickupPoints = new MaystroPickupPointService()
        this.products = new MaystroProductService(client)
    }

    private normalizeExternalId(value: string) {
        const trimmed = value.trim()
        if (trimmed.length === 0) {
            throw new MaystroIntegrationError({ statusCode: 400, statusMessage: 'external_id is required' })
        }
        if (trimmed.length > 110) {
            throw new MaystroIntegrationError({ statusCode: 400, statusMessage: 'external_id exceeds 110 characters' })
        }
        return trimmed
    }

    private computeCarrierTotalPrice(order: {
        totalAmount?: unknown
        totalWithShippingAmount?: unknown
        shippingAmount?: unknown
        paidAmount?: unknown
    }) {
        const paidAmount = Number.isFinite(Number(order.paidAmount)) ? Number(order.paidAmount) : 0
        const totalWithShippingRaw = order.totalWithShippingAmount
        const totalWithShipping = totalWithShippingRaw == null ? NaN : Number(totalWithShippingRaw)

        if (Number.isFinite(totalWithShipping)) {
            return Math.round(Math.max(0, totalWithShipping - paidAmount))
        }

        const itemsTotalRaw = order.totalAmount
        const itemsTotal = Number.isFinite(Number(itemsTotalRaw)) ? Number(itemsTotalRaw) : 0

        const shippingRaw = order.shippingAmount
        const shippingAmount = Number.isFinite(Number(shippingRaw)) ? Number(shippingRaw) : 0

        return Math.round(Math.max(0, (itemsTotal + shippingAmount) - paidAmount))
    }

    private async buildPayload(input: {
        tenantId: string
        apiToken: string
        storeId: string
        localOrderId: string
        customerName: string
        customerPhone: string
        customerPhone2?: string
        destinationText: string
        commune: string
        wilaya: string
        express?: boolean
        noteToDriver?: string
        deliveryType: 1 | 2 | 3
        pickupPoint?: number
    }): Promise<{ externalId: string; payload: MaystroOrderPayload }> {
        const order = await this.prisma.order.findFirst({
            where: { tenantId: input.tenantId, id: input.localOrderId },
            include: { items: { include: { product: true } } }
        })
        if (!order) {
            throw new MaystroIntegrationError({ statusCode: 404, statusMessage: 'Order not found for tenant' })
        }

        if (!order.items.length) {
            throw new MaystroIntegrationError({ statusCode: 400, statusMessage: 'Order must have at least one item' })
        }

        for (const item of order.items) {
            if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
                throw new MaystroIntegrationError({ statusCode: 400, statusMessage: 'Order item quantity must be > 0' })
            }
        }

        const externalId = this.normalizeExternalId(order.id)

        await this.products.ensureOrderProductsSynced({
            tenantId: input.tenantId,
            apiToken: input.apiToken,
            storeId: input.storeId,
            orderId: order.id
        })

        const mappings = await this.prisma.maystroProductMapping.findMany({
            where: { tenantId: input.tenantId, localProductId: { in: order.items.map((i) => i.productId) } }
        })
        const syncedMappings = mappings.filter((m) => m.syncStatus === 'SYNCED')
        const mappedSet = new Set(syncedMappings.map((m) => m.localProductId))
        const maystroProductIdByLocalProductId = new Map(
            syncedMappings.map((mapping) => [mapping.localProductId, mapping.maystroProductId])
        )
        const missing = Array.from(new Set(order.items.map((i) => i.productId))).filter((id) => !mappedSet.has(id))
        if (missing.length) {
            throw new MaystroIntegrationError({
                statusCode: 400,
                statusMessage: 'Cannot create Maystro order: some products are not synced',
                details: { missingProductIds: missing }
            })
        }

        const normalizedLocation = await this.location.validateWilayaAndCommune({
            apiToken: input.apiToken,
            wilaya: input.wilaya,
            commune: input.commune
        })

        if (input.deliveryType === 3) {
            if (!input.pickupPoint) {
                throw new MaystroIntegrationError({ statusCode: 400, statusMessage: 'pickup_point is required for delivery_type=3' })
            }
            await this.pickupPoints.assertPickupPointValid({
                apiToken: input.apiToken,
                commune: normalizedLocation.commune,
                pickupPoint: input.pickupPoint
            })
        }

        const details: MaystroOrderDetail[] = order.items.map((item) => {
            const maystroProductId = maystroProductIdByLocalProductId.get(item.productId)
            if (!maystroProductId) {
                throw new MaystroIntegrationError({
                    statusCode: 400,
                    statusMessage: 'Cannot create Maystro order: some products are not synced',
                    details: { missingProductIds: [item.productId] }
                })
            }

            return {
                product: maystroProductId,
                description: item.product?.title ? String(item.product.title) : undefined,
                quantity: item.quantity
            }
        })

        const payload: MaystroOrderPayload = {
            customer_name: input.customerName,
            customer_phone: input.customerPhone,
            customer_phone2: input.customerPhone2,
            destination_text: input.destinationText,
            note_to_driver: input.noteToDriver,
            express: input.express ?? false,
            external_id: externalId,
            total_price: this.computeCarrierTotalPrice(order as any),
            delivery_type: input.deliveryType,
            pickup_point: input.deliveryType === 3 ? input.pickupPoint : undefined,
            commune: normalizedLocation.commune,
            wilaya: normalizedLocation.wilaya,
            details
        }

        return { externalId, payload }
    }

    private async persistOrderMapping(input: {
        tenantId: string
        localOrderId: string
        externalId: string
        response: MaystroOrderResponse
    }) {
        const maystroOrderId = input.response.id ? String(input.response.id) : null
        const tracking = input.response.tracking ? String(input.response.tracking) : null
        const deliveryPrice =
            typeof input.response.delivery_price === 'number' && Number.isFinite(input.response.delivery_price)
                ? input.response.delivery_price
                : null
        const success = input.response.success !== undefined ? Boolean(input.response.success) : Boolean(maystroOrderId)

        return this.prisma.maystroOrderMapping.upsert({
            where: { tenantId_localOrderId: { tenantId: input.tenantId, localOrderId: input.localOrderId } },
            create: {
                tenantId: input.tenantId,
                localOrderId: input.localOrderId,
                externalId: input.externalId,
                maystroOrderId,
                tracking,
                deliveryPrice: deliveryPrice == null ? null : deliveryPrice,
                success,
                lastSyncedAt: new Date(),
                lastError: null
            },
            update: {
                externalId: input.externalId,
                maystroOrderId,
                tracking,
                deliveryPrice: deliveryPrice == null ? null : deliveryPrice,
                success,
                lastSyncedAt: new Date(),
                lastError: null
            }
        })
    }

    async createOrderFromLocalOrder(input: {
        tenantId: string
        apiToken: string
        storeId: string
        localOrderId: string
        customerName: string
        customerPhone: string
        customerPhone2?: string
        destinationText: string
        commune: string
        wilaya: string
        express?: boolean
        noteToDriver?: string
        deliveryType: 1 | 2 | 3
        pickupPoint?: number
    }) {
        const existing = await this.prisma.maystroOrderMapping.findUnique({
            where: { tenantId_localOrderId: { tenantId: input.tenantId, localOrderId: input.localOrderId } }
        })
        if (existing?.success && existing.maystroOrderId) return existing

        const client = new MaystroClient({ apiToken: input.apiToken })
        const { externalId, payload } = await this.buildPayload(input)

        try {
            let response: MaystroOrderResponse;
            try {
                response = await client.request<MaystroOrderResponse>({
                    method: 'POST',
                    path: '/orders/',
                    data: payload
                })
            } catch (error: any) {
                // Code 55 means duplicate order in the last 24h. We bypass it by modifying the name slightly.
                const isDuplicate = error?.details?.errors?.some((e: any) => e.code === 55)
                if (isDuplicate) {
                    payload.order.customer_name = (payload.order.customer_name || '').trim() + ' .'
                    response = await client.request<MaystroOrderResponse>({
                        method: 'POST',
                        path: '/orders/',
                        data: payload
                    })
                } else {
                    throw error
                }
            }

            return this.persistOrderMapping({
                tenantId: input.tenantId,
                localOrderId: input.localOrderId,
                externalId,
                response
            })
        } catch (error: any) {
            await this.prisma.maystroOrderMapping.upsert({
                where: { tenantId_localOrderId: { tenantId: input.tenantId, localOrderId: input.localOrderId } },
                create: {
                    tenantId: input.tenantId,
                    localOrderId: input.localOrderId,
                    externalId,
                    success: false,
                    lastSyncedAt: null,
                    lastError: String(error?.message || 'Failed to create Maystro order')
                },
                update: {
                    success: false,
                    lastSyncedAt: null,
                    lastError: String(error?.message || 'Failed to create Maystro order')
                }
            })
            throw error
        }
    }

    async cancelMaystroOrder(input: {
        tenantId: string
        apiToken: string
        localOrderId: string
    }) {
        const mapping = await this.prisma.maystroOrderMapping.findUnique({
            where: { tenantId_localOrderId: { tenantId: input.tenantId, localOrderId: input.localOrderId } }
        })
        if (!mapping?.maystroOrderId) return null

        const client = new MaystroClient({ apiToken: input.apiToken })
        try {
            await client.request({
                method: 'DELETE',
                path: `/orders/${mapping.maystroOrderId}/`
            })
        } catch {
            // Maystro may return 404 if already deleted/not found — treat as success
        }

        return mapping
    }

    async createOrdersFromLocalOrdersBulk(input: {
        tenantId: string
        apiToken: string
        storeId: string
        orders: Array<{
            localOrderId: string
            customerName: string
            customerPhone: string
            customerPhone2?: string
            destinationText: string
            commune: string
            wilaya: string
            express?: boolean
            noteToDriver?: string
            deliveryType: 1 | 2 | 3
            pickupPoint?: number
        }>
    }) {
        if (!Array.isArray(input.orders) || input.orders.length === 0) {
            throw new MaystroIntegrationError({ statusCode: 400, statusMessage: 'orders list is required' })
        }
        if (input.orders.length > 100) {
            throw new MaystroIntegrationError({ statusCode: 400, statusMessage: 'orders list exceeded 100' })
        }

        const client = new MaystroClient({ apiToken: input.apiToken })
        const prepared: Array<{ localOrderId: string; externalId: string; payload: MaystroOrderPayload }> = []
        const existing: any[] = []

        for (const o of input.orders) {
            const current = await this.prisma.maystroOrderMapping.findUnique({
                where: { tenantId_localOrderId: { tenantId: input.tenantId, localOrderId: o.localOrderId } }
            })
            if (current?.success && current.maystroOrderId) {
                existing.push(current)
                continue
            }

            const built = await this.buildPayload({
                tenantId: input.tenantId,
                apiToken: input.apiToken,
                storeId: input.storeId,
                localOrderId: o.localOrderId,
                customerName: o.customerName,
                customerPhone: o.customerPhone,
                customerPhone2: o.customerPhone2,
                destinationText: o.destinationText,
                commune: o.commune,
                wilaya: o.wilaya,
                express: o.express,
                noteToDriver: o.noteToDriver,
                deliveryType: o.deliveryType,
                pickupPoint: o.pickupPoint
            })

            prepared.push({ localOrderId: o.localOrderId, externalId: built.externalId, payload: built.payload })
        }

        if (prepared.length === 0) return existing

        const payloads = prepared.map((p) => p.payload)

        let rawResponse: any
        try {
            rawResponse = await client.request<any>({
                method: 'POST',
                path: '/orders/',
                data: payloads
            })
        } catch (error: any) {
            const shouldTryAlternateShape =
                error instanceof MaystroIntegrationError &&
                (error.code === 80 || error.code === 90 || String(error.statusMessage || '').toLowerCase().includes('bulk'))

            if (shouldTryAlternateShape) {
                rawResponse = await client.request<any>({
                    method: 'POST',
                    path: '/orders/',
                    data: { orders: payloads }
                })
            } else {
                throw error
            }
        }

        const responseList: MaystroOrderResponse[] = Array.isArray(rawResponse)
            ? rawResponse
            : Array.isArray(rawResponse?.orders)
                ? rawResponse.orders
                : Array.isArray(rawResponse?.results)
                    ? rawResponse.results
                    : [rawResponse].filter(Boolean)

        const byExternalId = new Map<string, { localOrderId: string; externalId: string }>()
        for (const p of prepared) byExternalId.set(p.externalId, { localOrderId: p.localOrderId, externalId: p.externalId })

        const saved: any[] = []
        for (const item of responseList) {
            const ext = item?.external_id ? String(item.external_id) : ''
            const local = byExternalId.get(ext)
            if (!local) continue

            saved.push(
                await this.persistOrderMapping({
                    tenantId: input.tenantId,
                    localOrderId: local.localOrderId,
                    externalId: local.externalId,
                    response: item
                })
            )
        }

        return [...existing, ...saved]
    }
}
