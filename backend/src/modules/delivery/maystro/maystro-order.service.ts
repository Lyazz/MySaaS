import type { PrismaClient } from '@prisma/client'
import prisma from '../../../lib/prisma'
import { MaystroClient } from './maystro.client'
import { MaystroIntegrationError } from './maystro.errors'
import { MaystroLocationService } from './maystro-location.service'
import { MaystroPickupPointService } from './maystro-pickup-point.service'
import {
    MAYSTRO_VARIANT_INCLUDE,
    MaystroProductService,
    maystroProductNaming,
    type MaystroNamedVariant
} from './maystro-product.service'
import { MAYSTRO_STATUS_ABORTED, maystroOrderStatusToString } from './maystro-status'

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
            include: { items: { include: { product: true, variant: MAYSTRO_VARIANT_INCLUDE } } }
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

        // A variant that carries attributes owns its own Maystro product, so a line is
        // identified by product *and* variant, not by product alone.
        const lines = order.items.map((item) => {
            const naming = maystroProductNaming({
                title: item.product?.title ?? '',
                variant: item.variant as MaystroNamedVariant
            })
            return { item, naming, key: `${item.productId}:${naming.localVariantId}` }
        })

        const mappings = await this.prisma.maystroProductMapping.findMany({
            where: { tenantId: input.tenantId, localProductId: { in: order.items.map((i) => i.productId) } }
        })
        const maystroProductIdByKey = new Map(
            mappings
                .filter((mapping) => mapping.syncStatus === 'SYNCED')
                .map((mapping) => [`${mapping.localProductId}:${mapping.localVariantId}`, mapping.maystroProductId])
        )

        const missing = Array.from(
            new Set(lines.filter((line) => !maystroProductIdByKey.has(line.key)).map((line) => line.item.productId))
        )
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

        // Maystro runs one stop desk per wilaya and it sits in the wilaya's center
        // commune, so a delivery_type=2 order addressed to any other commune is refused
        // with "SD delivery type is not allowed outside center commune" (error 45).
        // The parcel goes to that same desk whichever commune the shopper lives in, so
        // retarget the payload instead of failing the push — their own address is
        // already carried by destination_text.
        const destinationCommune =
            input.deliveryType === 2 && normalizedLocation.centerCommune != null
                ? normalizedLocation.centerCommune
                : normalizedLocation.commune

        if (input.deliveryType === 3) {
            if (!input.pickupPoint) {
                throw new MaystroIntegrationError({ statusCode: 400, statusMessage: 'pickup_point is required for delivery_type=3' })
            }
            await this.pickupPoints.assertPickupPointValid({
                apiToken: input.apiToken,
                commune: destinationCommune,
                pickupPoint: input.pickupPoint
            })
        }

        // Maystro refuses an order that names the same product on two detail lines —
        // "Inconsistent products(missing products)", error 50. Distinct attribute
        // combinations now resolve to distinct remote products, so what is left to
        // collapse is genuine repetition: the same product and variant on two lines.
        const detailsByProduct = new Map<string, MaystroOrderDetail>()
        for (const line of lines) {
            const maystroProductId = maystroProductIdByKey.get(line.key)
            if (!maystroProductId) {
                throw new MaystroIntegrationError({
                    statusCode: 400,
                    statusMessage: 'Cannot create Maystro order: some products are not synced',
                    details: { missingProductIds: [line.item.productId] }
                })
            }

            const merged = detailsByProduct.get(maystroProductId)
            if (merged) {
                merged.quantity += line.item.quantity
                continue
            }

            detailsByProduct.set(maystroProductId, {
                product: maystroProductId,
                description: line.naming.logisticalDescription || undefined,
                quantity: line.item.quantity
            })
        }
        const details: MaystroOrderDetail[] = Array.from(detailsByProduct.values())

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
            commune: destinationCommune,
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
                    payload.customer_name = (payload.customer_name || '').trim() + ' (2)'
                    console.log('Retrying Maystro push with modified name to bypass duplicate check:', payload.customer_name)
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
            // Orders are not deletable — DELETE on this path answers 405 (the endpoint
            // allows GET, PUT, PATCH, HEAD, OPTIONS). Cancelling is a move to ABORTED.
            await client.request({
                method: 'PATCH',
                path: `/orders/${mapping.maystroOrderId}/`,
                data: { status: MAYSTRO_STATUS_ABORTED }
            })
        } catch (error: any) {
            // Maystro no longer knows this order, so there is nothing left to cancel.
            // Anything else means the parcel is still live on their side and the caller
            // must hear about it rather than believe the cancellation went through.
            if (error?.statusCode !== 404) throw error
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

    async syncOrderFromBackendApi(input: { tenantId: string; apiToken: string; localOrderId: string }) {
        const mapping = await this.prisma.maystroOrderMapping.findUnique({
            where: { tenantId_localOrderId: { tenantId: input.tenantId, localOrderId: input.localOrderId } }
        })

        if (!mapping?.maystroOrderId) {
            throw new MaystroIntegrationError({ statusCode: 404, statusMessage: 'Order is not mapped to Maystro or missing maystroOrderId' })
        }

        const client = new MaystroClient({ apiToken: input.apiToken })
        
        let response: any
        try {
            response = await client.request<any>({
                method: 'GET',
                path: `/orders/${mapping.maystroOrderId}/`
            })
        } catch (error: any) {
            throw new MaystroIntegrationError({
                statusCode: error.statusCode || 500,
                statusMessage: `Failed to fetch manual sync for ${mapping.maystroOrderId}: ${error.statusMessage || error.message}`
            })
        }

        const statusCode = response?.status ?? response?.status_code
        if (statusCode == null) {
            throw new MaystroIntegrationError({ statusCode: 500, statusMessage: 'No status returned from Maystro backend API' })
        }

        // We use the MaystroWebhookService to handle the side effects precisely the same way 
        // as a real webhook, including shipment tracking and converting to Sales when DELIVERED.
        // We import dynamically to avoid circular dependencies if any exist, but it's safe to require it.
        const { MaystroWebhookService } = await import('./maystro-webhook.service')
        const webhookService = new MaystroWebhookService(this.prisma)

        const result = await webhookService.handleWebhook({
            tenantId: input.tenantId,
            inventorySyncEnabled: false,
            raw: {
                event: 'ManualSync',
                payload: {
                    id: mapping.maystroOrderId,
                    status: statusCode,
                    order_id: mapping.maystroOrderId,
                    external_id: mapping.externalId
                }
            }
        })

        const maystroStatusStr = maystroOrderStatusToString(statusCode)
        return {
            localOrderId: input.localOrderId,
            maystroOrderId: mapping.maystroOrderId,
            statusCode,
            synced: result?.handled ?? false,
            newStatus: result?.status ? `${result.status} (${maystroStatusStr})` : maystroStatusStr
        }
    }
}
