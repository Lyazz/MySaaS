import { ShipmentProvider, ShipmentStatus, type PrismaClient, type Shipment, type DeliveryRate } from '@prisma/client'
import prisma from '../../lib/prisma'
import { MaystroProvider } from './providers/maystro.provider'
import { YalidineProvider } from './providers/yalidine.provider'
import { SelfDeliveryProvider } from './providers/self.provider'
import type {
    CreateShipmentInput,
    QuoteOption,
    QuoteRequest,
    TrackingEvent,
    DeliveryProvider
} from './types'

type ProviderMap = Record<ShipmentProvider, DeliveryProvider>

export class DeliveryService {
    private prisma: PrismaClient
    private providers: ProviderMap

    constructor(client: PrismaClient = prisma) {
        this.prisma = client
        this.providers = {
            MAYSTRO: new MaystroProvider(),
            YALIDINE: new YalidineProvider(),
            SELF: new SelfDeliveryProvider()
        }
    }

    private getProvider(provider: ShipmentProvider): DeliveryProvider {
        const impl = this.providers[provider]
        if (!impl) throw new Error(`Unsupported provider: ${provider}`)
        return impl
    }

    async listOptions(input: QuoteRequest): Promise<QuoteOption[]> {
        const provider = this.getProvider(input.provider)
        const providerQuotes = provider.quote ? await provider.quote(input) : []

        // Check allowed providers from store settings
        const settings = await this.prisma.storeSettings.findUnique({
            where: { tenantId: input.tenantId }
        })

        const allowedProviders = settings?.allowedDeliveryProviders || ['SELF'] // Default to SELF if no settings
        if (!allowedProviders.includes(input.provider)) {
            return []
        }

        if (providerQuotes.length > 0) {
            return providerQuotes
        }

        const rate = await this.prisma.deliveryRate.findFirst({
            where: {
                tenantId: input.tenantId,
                provider: input.provider,
                wilayaCode: input.destination.wilayaCode,
                OR: [
                    { communeCode: input.destination.communeCode || null },
                    { communeCode: null }
                ],
                serviceLevel: input.serviceLevel || undefined,
                isActive: true
            }
        })

        if (!rate) {
            return []
        }

        return [
            {
                provider: input.provider,
                serviceLevel: rate.serviceLevel || undefined,
                price: Number(rate.price),
                currency: rate.currency,
                estimatedMinDays: rate.estimatedMinDays || undefined,
                estimatedMaxDays: rate.estimatedMaxDays || undefined,
                source: 'fallback-rate'
            }
        ]
    }

    async listShipments(
        tenantId: string,
        filters: { status?: ShipmentStatus; provider?: ShipmentProvider; search?: string }
    ) {
        return this.prisma.shipment.findMany({
            where: {
                tenantId,
                status: filters.status,
                provider: filters.provider,
                OR: filters.search
                    ? [
                        { orderId: { contains: filters.search, mode: 'insensitive' } },
                        { contactName: { contains: filters.search, mode: 'insensitive' } },
                        { contactPhone: { contains: filters.search, mode: 'insensitive' } },
                        { providerShipmentId: { contains: filters.search, mode: 'insensitive' } }
                    ]
                    : undefined
            },
            include: {
                order: {
                    select: {
                        id: true,
                        totalAmount: true,
                        currency: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })
    }

    async createShipment(input: CreateShipmentInput) {
        // Idempotency: return existing shipment if same provider+order+tenant
        const existing = await this.prisma.shipment.findUnique({
            where: {
                tenantId_provider_orderId: {
                    tenantId: input.tenantId,
                    provider: input.provider,
                    orderId: input.orderId
                }
            },
            include: { events: true }
        })
        if (existing) return existing

        // Ensure order belongs to tenant
        const order = await this.prisma.order.findFirst({
            where: { id: input.orderId, tenantId: input.tenantId },
            include: { tenant: true }
        })
        if (!order) throw new Error('Order not found for tenant')

        const provider = this.getProvider(input.provider)

        const result = await provider.createShipment(input)

        const shipment = await this.prisma.shipment.create({
            data: {
                tenantId: input.tenantId,
                orderId: input.orderId,
                provider: input.provider,
                providerShipmentId: result.providerShipmentId,
                status: result.status || ShipmentStatus.PENDING,
                serviceLevel: input.serviceLevel,
                price: result.price ?? input.price ?? undefined,
                currency: result.currency || input.currency || 'DZD',
                contactName: input.contactName,
                contactPhone: input.contactPhone,
                wilayaCode: input.wilayaCode,
                communeCode: input.communeCode,
                addressLine1: input.addressLine1,
                addressLine2: input.addressLine2,
                notes: input.notes,
                labelUrl: result.labelUrl ?? undefined,
                trackingUrl: result.trackingUrl ?? undefined,
                metadata: input.metadata ?? result.raw ?? undefined
            }
        })

        if (result.status) {
            await this.prisma.shipmentEvent.create({
                data: {
                    tenantId: input.tenantId,
                    shipmentId: shipment.id,
                    status: result.status,
                    description: 'Shipment created',
                    rawPayload: result.raw || null
                }
            })
        }

        return shipment
    }

    async getShipment(tenantId: string, shipmentId: string) {
        return this.prisma.shipment.findFirst({
            where: { id: shipmentId, tenantId },
            include: { events: true, order: true }
        })
    }

    async trackShipment(tenantId: string, shipmentId: string) {
        const shipment = await this.getShipment(tenantId, shipmentId)
        if (!shipment) return null
        const provider = this.getProvider(shipment.provider)

        let providerEvents: TrackingEvent[] = []
        if (provider.track) {
            providerEvents = await provider.track(shipment as Shipment)
        }

        // Persist new events if any
        const newEvents = providerEvents.map((e) => ({
            tenantId,
            shipmentId: shipment.id,
            status: e.status || undefined,
            code: e.code,
            description: e.description,
            rawPayload: e.raw || undefined,
            eventTime: e.eventTime || new Date()
        }))
        if (newEvents.length) {
            await this.prisma.shipmentEvent.createMany({ data: newEvents, skipDuplicates: true })
        }

        const events = await this.prisma.shipmentEvent.findMany({
            where: { shipmentId: shipment.id, tenantId },
            orderBy: { eventTime: 'desc' }
        })

        return { shipment, events }
    }

    async handleMaystroWebhook(rawPayload: any) {
        const provider = this.getProvider('MAYSTRO') as MaystroProvider
        if (!provider.handleWebhook) return null

        const parsed = await provider.handleWebhook(rawPayload)
        if (!parsed?.shipmentId) return null

        const shipment = await this.prisma.shipment.findFirst({
            where: {
                providerShipmentId: parsed.shipmentId,
                provider: 'MAYSTRO'
            }
        })
        if (!shipment) return null

        const status = parsed.status || ShipmentStatus.PENDING

        await this.prisma.shipment.update({
            where: { id: shipment.id },
            data: { status }
        })

        if (parsed.events?.length) {
            await this.prisma.shipmentEvent.createMany({
                data: parsed.events.map((ev) => ({
                    tenantId: shipment.tenantId,
                    shipmentId: shipment.id,
                    status: ev.status,
                    code: ev.code,
                    description: ev.description,
                    rawPayload: ev.raw,
                    eventTime: ev.eventTime || new Date()
                }))
            })
        }

        return { shipmentId: shipment.id, status }
    }

    async updateSelfStatus(tenantId: string, shipmentId: string, status: ShipmentStatus) {
        const shipment = await this.prisma.shipment.findFirst({
            where: { id: shipmentId, tenantId, provider: 'SELF' }
        })
        if (!shipment) throw new Error('Shipment not found')
        const updated = await this.prisma.shipment.update({
            where: { id: shipment.id },
            data: { status }
        })
        await this.prisma.shipmentEvent.create({
            data: {
                tenantId,
                shipmentId,
                status,
                description: 'Self delivery status update'
            }
        })
        return updated
    }





    async getDeliveryRates(tenantId: string, provider: ShipmentProvider) {
        return this.prisma.deliveryRate.findMany({
            where: { tenantId, provider }
        })
    }

    async updateDeliveryRates(
        tenantId: string,
        provider: ShipmentProvider,
        rates: {
            wilayaCode: string
            price: number
            communeCode?: string
        }[]
    ) {
        // Use a transaction to ensure atomicity
        return this.prisma.$transaction(
            rates.map((rate) =>
                this.prisma.deliveryRate.upsert({
                    where: {
                        tenantId_provider_wilayaCode_communeCode_serviceLevel: {
                            tenantId,
                            provider,
                            wilayaCode: rate.wilayaCode,
                            communeCode: rate.communeCode || '',
                            serviceLevel: '' // Default service level for now
                        }
                    },
                    create: {
                        tenantId,
                        provider,
                        wilayaCode: rate.wilayaCode,
                        communeCode: rate.communeCode || '',
                        serviceLevel: '',
                        price: rate.price,
                        currency: 'DZD' // Default currency
                    },
                    update: {
                        price: rate.price
                    }
                })
            )
        )
    }
}
