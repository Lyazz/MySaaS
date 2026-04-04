import { ShipmentProvider, ShipmentStatus, type PrismaClient, type Shipment } from '@prisma/client'
import prisma from '../../lib/prisma'
import { MaystroProvider } from './providers/maystro.provider'
import { YalidineProvider } from './providers/yalidine.provider'
import { SelfDeliveryProvider } from './providers/self.provider'
import { DELIVERY_PROVIDER_CATALOG, getProviderCatalogItem } from './catalog'
import type {
    CreateShipmentInput,
    QuoteOption,
    QuoteRequest,
    TrackingEvent,
    DeliveryProvider
} from './types'

type ProviderApiConfig = {
    apiKey?: string
    apiId?: string
    apiToken?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

export class DeliveryConfigurationError extends Error {
    statusCode: number
    statusMessage: string

    constructor(statusCode: number, statusMessage: string) {
        super(statusMessage)
        this.statusCode = statusCode
        this.statusMessage = statusMessage
    }
}

export class DeliveryService {
    private prisma: PrismaClient
    private staticProviders: Partial<Record<ShipmentProvider, DeliveryProvider>>

    constructor(client: PrismaClient = prisma) {
        this.prisma = client
        this.staticProviders = {
            SELF: new SelfDeliveryProvider()
        }
    }

    private supportedProviders(): ShipmentProvider[] {
        return DELIVERY_PROVIDER_CATALOG.map((p) => p.provider)
    }

    private async getOfferedProviders(tenantId: string): Promise<ShipmentProvider[]> {
        const settings = await this.prisma.storeSettings.upsert({
            where: { tenantId },
            create: { tenantId },
            update: {},
            select: { allowedDeliveryProviders: true }
        })

        const offered =
            settings?.allowedDeliveryProviders && settings.allowedDeliveryProviders.length > 0
                ? settings.allowedDeliveryProviders
                : this.supportedProviders()

        const supported = new Set(this.supportedProviders())
        return offered.filter((p): p is ShipmentProvider => supported.has(p as ShipmentProvider))
    }

    private parseProviderAccountConfig(provider: ShipmentProvider, accountConfig: unknown): ProviderApiConfig {
        const raw = isRecord(accountConfig) ? accountConfig : {}

        if (provider === 'MAYSTRO') {
            return {
                apiKey: typeof raw.apiKey === 'string' ? raw.apiKey.trim() : undefined
            }
        }

        if (provider === 'YALIDINE') {
            return {
                apiId: typeof raw.apiId === 'string' ? raw.apiId.trim() : undefined,
                apiToken: typeof raw.apiToken === 'string' ? raw.apiToken.trim() : undefined
            }
        }

        return {}
    }

    private async getProviderApiConfig(tenantId: string, provider: ShipmentProvider): Promise<ProviderApiConfig | null> {
        const account = await this.prisma.tenantDeliveryAccount.findUnique({
            where: { tenantId_provider: { tenantId, provider } },
            select: { isActive: true, config: true }
        })

        if (account) {
            if (!account.isActive) return null
            const cfg = this.parseProviderAccountConfig(provider, account.config)
            if (provider === 'MAYSTRO') return cfg.apiKey ? cfg : null
            if (provider === 'YALIDINE') return cfg.apiId && cfg.apiToken ? cfg : null
            return cfg
        }

        return null
    }

    private async resolveProvider(
        tenantId: string,
        provider: ShipmentProvider
    ): Promise<{ impl: DeliveryProvider; apiConfig: ProviderApiConfig | null }> {
        const staticProvider = this.staticProviders[provider]
        if (staticProvider) return { impl: staticProvider, apiConfig: null }

        if (provider === 'MAYSTRO') {
            const cfg = await this.getProviderApiConfig(tenantId, provider)
            return {
                impl: new MaystroProvider(cfg ? { apiKey: cfg.apiKey } : undefined),
                apiConfig: cfg
            }
        }

        if (provider === 'YALIDINE') {
            const cfg = await this.getProviderApiConfig(tenantId, provider)
            return {
                impl: new YalidineProvider({
                    apiId: cfg?.apiId,
                    apiToken: cfg?.apiToken
                }),
                apiConfig: cfg
            }
        }

        throw new Error(`Unsupported provider: ${provider}`)
    }

    private resolveServiceLevel(input: { serviceLevel?: string; deliveryMode?: 'home' | 'office' }) {
        if (typeof input.serviceLevel === 'string' && input.serviceLevel.trim().length > 0) {
            return input.serviceLevel.trim()
        }
        if (input.deliveryMode === 'home' || input.deliveryMode === 'office') return input.deliveryMode
        return undefined
    }

    private async findBestFallbackRate(input: {
        tenantId: string
        provider: ShipmentProvider
        destination: { wilayaCode: string; communeCode?: string }
        serviceLevel?: string
    }) {
        const communeCode = input.destination.communeCode?.trim() || null
        const serviceLevel = input.serviceLevel?.trim() || null

        const attempts: Array<{ communeCode: string | null; serviceLevel: string | null }> = []
        if (communeCode && serviceLevel) attempts.push({ communeCode, serviceLevel })
        if (communeCode) attempts.push({ communeCode, serviceLevel: null })
        if (serviceLevel) attempts.push({ communeCode: null, serviceLevel })
        attempts.push({ communeCode: null, serviceLevel: null })

        for (const attempt of attempts) {
            const rate = await this.prisma.deliveryRate.findFirst({
                where: {
                    tenantId: input.tenantId,
                    provider: input.provider,
                    wilayaCode: input.destination.wilayaCode,
                    communeCode: attempt.communeCode,
                    serviceLevel: attempt.serviceLevel,
                    isActive: true
                }
            })
            if (rate) return rate
        }

        return null
    }

    private async applyTenantOverridesToQuotes(input: {
        tenantId: string
        provider: ShipmentProvider
        destination: { wilayaCode: string; communeCode?: string }
        effectiveServiceLevel?: string
        quotes: QuoteOption[]
    }): Promise<QuoteOption[]> {
        const out: QuoteOption[] = []

        for (const quote of input.quotes) {
            const serviceLevel = quote.serviceLevel || input.effectiveServiceLevel
            const overrideRate = await this.findBestFallbackRate({
                tenantId: input.tenantId,
                provider: input.provider,
                destination: input.destination,
                serviceLevel
            })

            if (!overrideRate) {
                out.push(quote)
                continue
            }

            out.push({
                ...quote,
                providerPrice: quote.price,
                price: Number(overrideRate.price),
                currency: overrideRate.currency || quote.currency,
                estimatedMinDays: overrideRate.estimatedMinDays ?? quote.estimatedMinDays,
                estimatedMaxDays: overrideRate.estimatedMaxDays ?? quote.estimatedMaxDays,
                source: 'tenant-override'
            })
        }

        return out
    }

    async listOptions(input: QuoteRequest): Promise<QuoteOption[]> {
        const offeredProviders = await this.getOfferedProviders(input.tenantId)
        if (!offeredProviders.includes(input.provider)) return []

        const effectiveServiceLevel = this.resolveServiceLevel(input)

        const { impl, apiConfig } = await this.resolveProvider(input.tenantId, input.provider)
        const requiresCredentials = getProviderCatalogItem(input.provider).credentialFields.some((f) => f.required)

        const quoteInput: QuoteRequest = {
            ...input,
            serviceLevel: effectiveServiceLevel,
            originWilayaCode: input.originWilayaCode
        }

        const providerQuotes =
            impl.quote && (!requiresCredentials || apiConfig) ? await impl.quote(quoteInput) : []

        if (providerQuotes.length > 0) {
            return this.applyTenantOverridesToQuotes({
                tenantId: input.tenantId,
                provider: input.provider,
                destination: input.destination,
                effectiveServiceLevel,
                quotes: providerQuotes
            })
        }

        const rate = await this.findBestFallbackRate({
            tenantId: input.tenantId,
            provider: input.provider,
            destination: input.destination,
            serviceLevel: effectiveServiceLevel
        })

        if (!rate) return []

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

    async rateShopOptions(input: Omit<QuoteRequest, 'provider'>): Promise<QuoteOption[]> {
        const offeredProviders = await this.getOfferedProviders(input.tenantId)
        const effectiveServiceLevel = this.resolveServiceLevel(input)

        const all: QuoteOption[] = []

        for (const provider of offeredProviders) {
            const { impl, apiConfig } = await this.resolveProvider(input.tenantId, provider)
            const requiresCredentials = getProviderCatalogItem(provider).credentialFields.some((f) => f.required)

            const quoteInput: QuoteRequest = {
                ...input,
                provider,
                serviceLevel: effectiveServiceLevel,
                originWilayaCode: input.originWilayaCode
            }

            const providerQuotes =
                impl.quote && (!requiresCredentials || apiConfig) ? await impl.quote(quoteInput) : []

            if (providerQuotes.length > 0) {
                all.push(
                    ...(await this.applyTenantOverridesToQuotes({
                        tenantId: input.tenantId,
                        provider,
                        destination: input.destination,
                        effectiveServiceLevel,
                        quotes: providerQuotes
                    }))
                )
                continue
            }

            const rate = await this.findBestFallbackRate({
                tenantId: input.tenantId,
                provider,
                destination: input.destination,
                serviceLevel: effectiveServiceLevel
            })

            if (!rate) continue

            all.push({
                provider,
                serviceLevel: rate.serviceLevel || undefined,
                price: Number(rate.price),
                currency: rate.currency,
                estimatedMinDays: rate.estimatedMinDays || undefined,
                estimatedMaxDays: rate.estimatedMaxDays || undefined,
                source: 'fallback-rate'
            })
        }

        all.sort((a, b) => a.price - b.price)
        return all
    }

    private static padWilaya(code: number) {
        return String(code).padStart(2, '0')
    }

    private static wilayaCodes(): string[] {
        return Array.from({ length: 58 }, (_, idx) => DeliveryService.padWilaya(idx + 1))
    }

    private static async mapWithConcurrency<T, R>(
        items: T[],
        concurrency: number,
        mapper: (item: T, index: number) => Promise<R>
    ): Promise<R[]> {
        const results: R[] = new Array(items.length)
        let nextIndex = 0

        const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
            while (nextIndex < items.length) {
                const current = nextIndex++
                if (current >= items.length) return
                results[current] = await mapper(items[current], current)
            }
        })

        await Promise.all(workers)
        return results
    }

    async getProviderLiveRatesByWilaya(input: {
        tenantId: string
        provider: ShipmentProvider
        deliveryMode?: 'home' | 'office'
        serviceLevel?: string
        weight?: number
        codAmount?: number
        originWilayaCode?: string
        communeCode?: string
    }): Promise<Array<{ wilayaCode: string; carrierPrice: number | null; currency: string; serviceLevel?: string }>> {
        const catalogItem = getProviderCatalogItem(input.provider)
        if (!catalogItem.supports.quote) {
            throw new DeliveryConfigurationError(400, 'Provider does not support live rates')
        }

        const effectiveServiceLevel = this.resolveServiceLevel({
            deliveryMode: input.deliveryMode,
            serviceLevel: input.serviceLevel
        })

        const { impl, apiConfig } = await this.resolveProvider(input.tenantId, input.provider)
        const requiresCredentials = catalogItem.credentialFields.some((f) => f.required)
        if (requiresCredentials && !apiConfig) {
            throw new DeliveryConfigurationError(400, 'Delivery provider credentials are not configured')
        }
        if (!impl.quote) {
            throw new DeliveryConfigurationError(400, 'Provider does not support live rates')
        }

        const wilayaCodes = DeliveryService.wilayaCodes()
        const communeCode =
            typeof input.communeCode === 'string' && input.communeCode.trim().length > 0 ? input.communeCode.trim() : undefined
        const weight = typeof input.weight === 'number' && Number.isFinite(input.weight) && input.weight > 0 ? input.weight : 1
        const codAmount =
            typeof input.codAmount === 'number' && Number.isFinite(input.codAmount) && input.codAmount > 0 ? input.codAmount : undefined

        return DeliveryService.mapWithConcurrency(wilayaCodes, 8, async (wilayaCode) => {
            const quotes = await impl.quote!({
                tenantId: input.tenantId,
                provider: input.provider,
                destination: { wilayaCode, communeCode },
                weight,
                codAmount,
                deliveryMode: input.deliveryMode,
                serviceLevel: effectiveServiceLevel,
                originWilayaCode: input.originWilayaCode
            })

            const best = quotes.length ? quotes.reduce((a, b) => (a.price <= b.price ? a : b)) : null
            return {
                wilayaCode,
                carrierPrice: best ? best.price : null,
                currency: best?.currency || 'DZD',
                serviceLevel: effectiveServiceLevel
            }
        })
    }

    async listCompanies(tenantId: string) {
        const offered = await this.getOfferedProviders(tenantId)
        return offered.map((provider) => ({
            code: provider,
            name: getProviderCatalogItem(provider).name,
            provider
        }))
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

        const offeredProviders = await this.getOfferedProviders(input.tenantId)
        if (!offeredProviders.includes(input.provider)) {
            throw new DeliveryConfigurationError(403, 'Delivery provider is not enabled for this store')
        }

        const effectiveServiceLevel = this.resolveServiceLevel(input)
        const { impl, apiConfig } = await this.resolveProvider(input.tenantId, input.provider)
        const requiresCredentials = getProviderCatalogItem(input.provider).credentialFields.some((f) => f.required)
        if (requiresCredentials && !apiConfig) {
            throw new DeliveryConfigurationError(400, 'Delivery provider credentials are not configured')
        }

        const result = await impl.createShipment({ ...input, serviceLevel: effectiveServiceLevel })

        const shipment = await this.prisma.shipment.create({
            data: {
                tenantId: input.tenantId,
                orderId: input.orderId,
                provider: input.provider,
                providerShipmentId: result.providerShipmentId,
                status: result.status || ShipmentStatus.PENDING,
                serviceLevel: effectiveServiceLevel,
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
        const { impl, apiConfig } = await this.resolveProvider(tenantId, shipment.provider)
        const requiresCredentials = getProviderCatalogItem(shipment.provider).credentialFields.some((f) => f.required)

        let providerEvents: TrackingEvent[] = []
        if (impl.track && (!requiresCredentials || apiConfig)) {
            providerEvents = await impl.track(shipment as Shipment)
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

    async handleMaystroWebhook(tenantId: string, rawPayload: any) {
        const provider = new MaystroProvider()
        if (!provider.handleWebhook) return null

        const parsed = await provider.handleWebhook(rawPayload)
        if (!parsed?.shipmentId) return null

        const shipment = await this.prisma.shipment.findFirst({
            where: {
                tenantId,
                providerShipmentId: parsed.shipmentId,
                provider: 'MAYSTRO'
            }
        })
        if (!shipment) return null

        const status = parsed.status || ShipmentStatus.PENDING

        await this.prisma.shipment.update({
            where: { tenantId_id: { tenantId, id: shipment.id } },
            data: { status }
        })

        if (parsed.events?.length) {
            await this.prisma.shipmentEvent.createMany({
                data: parsed.events.map((ev) => ({
                    tenantId,
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
            where: { tenantId_id: { tenantId, id: shipment.id } },
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
            where: { tenantId, provider },
            orderBy: [{ wilayaCode: 'asc' }, { communeCode: 'asc' }, { serviceLevel: 'asc' }]
        })
    }

    async updateDeliveryRates(
        tenantId: string,
        provider: ShipmentProvider,
        rates: {
            wilayaCode: string
            price: number
            communeCode?: string | null
            serviceLevel?: string | null
            currency?: string
            isActive?: boolean
            estimatedMinDays?: number | null
            estimatedMaxDays?: number | null
        }[]
    ) {
        return this.prisma.$transaction(
            rates.map((rate) => {
                const communeCode =
                    typeof rate.communeCode === 'string' && rate.communeCode.trim().length > 0
                        ? rate.communeCode.trim()
                        : null
                const serviceLevel =
                    typeof rate.serviceLevel === 'string' && rate.serviceLevel.trim().length > 0
                        ? rate.serviceLevel.trim()
                        : null
                const currency = typeof rate.currency === 'string' && rate.currency.trim().length > 0 ? rate.currency.trim() : 'DZD'
                const isActive = rate.isActive ?? true

                return this.prisma.deliveryRate.upsert({
                    where: {
                        tenantId_provider_wilayaCode_communeCode_serviceLevel: {
                            tenantId,
                            provider,
                            wilayaCode: rate.wilayaCode,
                            communeCode,
                            serviceLevel
                        }
                    },
                    create: {
                        tenantId,
                        provider,
                        wilayaCode: rate.wilayaCode,
                        communeCode,
                        serviceLevel,
                        price: rate.price,
                        currency,
                        isActive,
                        estimatedMinDays: rate.estimatedMinDays ?? undefined,
                        estimatedMaxDays: rate.estimatedMaxDays ?? undefined
                    },
                    update: {
                        price: rate.price,
                        currency,
                        isActive,
                        estimatedMinDays: rate.estimatedMinDays ?? undefined,
                        estimatedMaxDays: rate.estimatedMaxDays ?? undefined
                    }
                })
            })
        )
    }
}
