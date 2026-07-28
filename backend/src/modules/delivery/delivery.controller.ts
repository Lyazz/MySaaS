import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Request, Response } from 'express'
import { DeliveryConfigurationError, DeliveryService } from './delivery.service'
import { ShipmentProvider } from '@prisma/client'
import { getProviderCatalogItem } from './catalog'
import { MaystroIntegrationError } from './maystro/maystro.errors'
import { YalidineIntegrationError } from './yalidine/yalidine.errors'
import { YalidineWebhookService } from './yalidine/yalidine-webhook.service'
import prisma from '../../lib/prisma'

const service = new DeliveryService()
const yalidineWebhookService = new YalidineWebhookService()

const isShipmentProvider = (value: string): value is ShipmentProvider =>
    (Object.values(ShipmentProvider) as string[]).includes(value)

export class DeliveryController {
    async getOptions(req: Request, res: Response) {
        const tenant = req.tenant
        if (!tenant) return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant is required' })

        const { provider, destination, codAmount, weight, serviceLevel, deliveryMode } = req.body
        if (!destination?.wilayaCode) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'destination.wilayaCode is required' })
        }

        const normalizedProviderRaw =
            typeof provider === 'string' && provider.trim().length > 0 ? provider.trim().toUpperCase() : undefined

        if (normalizedProviderRaw && !isShipmentProvider(normalizedProviderRaw)) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Invalid provider' })
        }
        const normalizedProvider = normalizedProviderRaw as ShipmentProvider | undefined

        if (normalizedProvider === 'MAYSTRO' && !destination?.communeCode) {
            return res.status(400).json({
                statusCode: 400,
                statusMessage: 'destination.communeCode is required for Maystro pricing'
            })
        }

        const rawDeliveryMode =
            typeof deliveryMode === 'string' && deliveryMode.trim().length > 0
                ? deliveryMode.trim().toLowerCase()
                : undefined
        const normalizedDeliveryMode: 'home' | 'office' | undefined =
            rawDeliveryMode === 'pickup'
                ? 'office'
                : rawDeliveryMode === 'home' || rawDeliveryMode === 'office'
                    ? rawDeliveryMode
                    : undefined

        if (rawDeliveryMode && !normalizedDeliveryMode) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'deliveryMode must be home or office' })
        }

        try {
            const options = normalizedProvider
                ? await service.listOptions({
                      tenantId: tenant.id,
                      provider: normalizedProvider,
                      destination,
                      codAmount,
                      weight,
                      serviceLevel,
                      deliveryMode: normalizedDeliveryMode
                  })
                : await service.rateShopOptions({
                      tenantId: tenant.id,
                      destination,
                      codAmount,
                      weight,
                      serviceLevel,
                      deliveryMode: normalizedDeliveryMode
                  })
            res.json(options)
        } catch (error) {
            console.error('Delivery options error', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async listCompanies(req: Request, res: Response) {
        const tenant = req.tenant
        if (!tenant) return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant is required' })

        try {
            const companies = await service.listCompanies(tenant.id)
            res.json(companies)
        } catch (error) {
            console.error('List delivery companies error', error)
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
            codAmount?: number
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
            if (error instanceof DeliveryConfigurationError || error.name === 'DeliveryConfigurationError') {
                return res
                    .status(error.statusCode)
                    .json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            if (error instanceof MaystroIntegrationError || error.name === 'MaystroIntegrationError') {
                return res
                    .status(error.statusCode)
                    .json({ statusCode: error.statusCode, statusMessage: error.statusMessage, code: error.code })
            }
            if (error instanceof YalidineIntegrationError || error.name === 'YalidineIntegrationError') {
                return res
                    .status(error.statusCode)
                    .json({ statusCode: error.statusCode, statusMessage: error.statusMessage, code: error.code })
            }
            console.error('Create shipment error', error)
            res.status(500).json({ 
                statusCode: 500, 
                message: 'Internal Server Error (Debug)', 
                debugMessage: String(error?.message || error), 
                debugStack: error?.stack 
            })
        }
    }

    async getShipment(req: Request, res: Response) {
        const tenant = req.tenant
        if (!tenant) return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant is required' })
        const id = String(req.params.id || '')
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
        const id = String(req.params.id || '')
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
        const tenant = req.tenant
        if (!tenant) return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant is required' })

        try {
            console.log(`[Webhook] Maystro payload received for tenant ${tenant.id}:`, req.body ? 'Payload present' : 'Empty body')
            // Preferred authentication is X-Webhook-Secret.
            // Legacy fallback (?secret=...) remains for backward compatibility.
            const incomingHeaderSecret = req.get('x-webhook-secret')
            const incomingHeader = typeof incomingHeaderSecret === 'string' ? incomingHeaderSecret.trim() : ''
            const incomingQuery = typeof req.query.secret === 'string' ? req.query.secret.trim() : ''
            const incoming = incomingHeader || incomingQuery
            const account = await prisma.tenantDeliveryAccount.findUnique({
                where: { tenantId_provider: { tenantId: tenant.id, provider: 'MAYSTRO' } },
                select: { config: true }
            })
            const config = (account?.config && typeof account.config === 'object' ? account.config : {}) as Record<string, unknown>
            const storedSecret = typeof config.webhookSecret === 'string' ? config.webhookSecret : ''

            if (!storedSecret || !incoming) {
                return res.status(401).json({ statusCode: 401, statusMessage: 'Unauthorized' })
            }

            // timingSafeEqual prevents timing-based secret enumeration.
            const incomingBuf = Buffer.from(incoming)
            const storedBuf = Buffer.from(storedSecret)
            if (incomingBuf.length !== storedBuf.length || !timingSafeEqual(incomingBuf, storedBuf)) {
                return res.status(401).json({ statusCode: 401, statusMessage: 'Unauthorized' })
            }

            const result = await service.handleMaystroWebhook(tenant.id, req.body?.payload || req.body)
            if (!result) return res.status(202).json({ received: true })
            res.json({ success: true, ...result })
        } catch (error) {
            if (typeof (error as any)?.statusCode === 'number' && typeof (error as any)?.statusMessage === 'string') {
                return res.status((error as any).statusCode).json({
                    statusCode: (error as any).statusCode,
                    statusMessage: (error as any).statusMessage,
                    code: (error as any).code,
                    meta: (error as any).meta
                })
            }
            if (error instanceof MaystroIntegrationError) {
                return res
                    .status(error.statusCode)
                    .json({ statusCode: error.statusCode, statusMessage: error.statusMessage, code: error.code })
            }
            console.error('Maystro webhook error', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async yalidineWebhookChallenge(req: Request, res: Response) {
        const subscribePresent = Object.prototype.hasOwnProperty.call(req.query, 'subscribe')
        const crcToken = typeof req.query.crc_token === 'string' ? req.query.crc_token : ''
        if (!subscribePresent || !crcToken) {
            return res.status(405).json({ statusCode: 405, statusMessage: 'Method Not Allowed' })
        }

        return res.status(200).json({ crc_token: crcToken })
    }

    private normalizeYalidineSignature(value: string) {
        const trimmed = value.trim()
        return trimmed.toLowerCase().startsWith('sha256=') ? trimmed.slice('sha256='.length).trim() : trimmed
    }

    private verifyYalidineSignature(input: { rawBody: Buffer; signature: string; secret: string }) {
        const incoming = this.normalizeYalidineSignature(input.signature)
        const expected = createHmac('sha256', input.secret).update(input.rawBody).digest('hex')
        const incomingBuffer = Buffer.from(incoming)
        const expectedBuffer = Buffer.from(expected)
        return incomingBuffer.length === expectedBuffer.length && timingSafeEqual(incomingBuffer, expectedBuffer)
    }

    async yalidineWebhook(req: Request, res: Response) {
        const tenant = req.tenant
        if (!tenant) return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant is required' })

        try {
            const account = await prisma.tenantDeliveryAccount.findUnique({
                where: { tenantId_provider: { tenantId: tenant.id, provider: 'YALIDINE' } },
                select: { config: true }
            })
            const config = (account?.config && typeof account.config === 'object' ? account.config : {}) as Record<string, unknown>
            const secret =
                typeof config.webhookSecret === 'string' && config.webhookSecret.trim()
                    ? config.webhookSecret.trim()
                    : ''
            const signature = req.get('x-yalidine-signature') || ''

            if (!secret || !signature || !req.rawBody) {
                return res.status(401).json({ statusCode: 401, statusMessage: 'Unauthorized' })
            }

            if (!this.verifyYalidineSignature({ rawBody: req.rawBody, signature, secret })) {
                return res.status(401).json({ statusCode: 401, statusMessage: 'Invalid signature' })
            }

            if (!req.body || typeof req.body?.type !== 'string' || !Array.isArray(req.body?.events)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Invalid payload' })
            }

            const result = await yalidineWebhookService.handleWebhook({ tenantId: tenant.id, payload: req.body })
            return res.status(200).json({ success: true, ...result })
        } catch (error) {
            if (typeof (error as any)?.statusCode === 'number' && typeof (error as any)?.statusMessage === 'string') {
                return res.status((error as any).statusCode).json({
                    statusCode: (error as any).statusCode,
                    statusMessage: (error as any).statusMessage,
                    code: (error as any).code,
                    meta: (error as any).meta
                })
            }
            console.error('Yalidine webhook error', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async updateSelfStatus(req: Request, res: Response) {
        const tenant = req.tenant
        if (!tenant) return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant is required' })
        const user = req.user
        const id = String(req.params.id || '')
        const { status } = req.body as { status: string }
        if (!status) return res.status(400).json({ statusCode: 400, statusMessage: 'status required' })

        try {
            const updated = await service.updateSelfStatus(tenant.id, id, status as any, { userId: user?.id ?? null })
            res.json(updated)
        } catch (error: any) {
            if (typeof error?.statusCode === 'number' && typeof error?.statusMessage === 'string') {
                return res.status(error.statusCode).json({
                    statusCode: error.statusCode,
                    statusMessage: error.statusMessage,
                    code: error.code,
                    meta: error.meta
                })
            }
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

    async getProviderLiveRates(req: Request, res: Response) {
        const tenant = req.tenant
        if (!tenant) return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant is required' })

        const provider = String(req.params.provider || '').toUpperCase()
        if (!provider || !isShipmentProvider(provider)) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Invalid provider' })
        }

        try {
            getProviderCatalogItem(provider)
        } catch {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Unsupported provider' })
        }

        const { deliveryMode, serviceLevel, weight, codAmount, originWilayaCode, communeCode } = req.query as {
            deliveryMode?: string
            serviceLevel?: string
            weight?: string
            codAmount?: string
            originWilayaCode?: string
            communeCode?: string
        }

        const rawDeliveryMode =
            typeof deliveryMode === 'string' && deliveryMode.trim().length > 0 ? deliveryMode.trim().toLowerCase() : undefined
        const normalizedDeliveryMode: 'home' | 'office' | undefined =
            rawDeliveryMode === 'pickup'
                ? 'office'
                : rawDeliveryMode === 'home' || rawDeliveryMode === 'office'
                    ? rawDeliveryMode
                    : undefined

        if (rawDeliveryMode && !normalizedDeliveryMode) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'deliveryMode must be home or office' })
        }

        const parsedWeight = weight ? Number(weight) : undefined
        const parsedCod = codAmount ? Number(codAmount) : undefined

        try {
            const rates = await service.getProviderLiveRatesByWilaya({
                tenantId: tenant.id,
                provider,
                deliveryMode: normalizedDeliveryMode,
                serviceLevel: typeof serviceLevel === 'string' ? serviceLevel : undefined,
                weight: parsedWeight,
                codAmount: parsedCod,
                originWilayaCode: typeof originWilayaCode === 'string' ? originWilayaCode : undefined,
                communeCode: typeof communeCode === 'string' ? communeCode : undefined
            })
            res.json(rates)
        } catch (error: any) {
            if (error instanceof DeliveryConfigurationError) {
                return res
                    .status(error.statusCode)
                    .json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Get provider live rates error', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }



    async getDeliveryRates(req: Request, res: Response) {
        const tenant = req.tenant
        if (!tenant) return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant is required' })
        const provider = String(req.params.provider || '').toUpperCase()
        if (!provider || !isShipmentProvider(provider)) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Invalid provider' })
        }

        try {
            const rates = await service.getDeliveryRates(tenant.id, provider)
            res.json(rates)
        } catch (error) {
            console.error('Get rates error', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async updateDeliveryRates(req: Request, res: Response) {
        const tenant = req.tenant
        if (!tenant) return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant is required' })
        const provider = String(req.params.provider || '').toUpperCase()
        if (!provider || !isShipmentProvider(provider)) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Invalid provider' })
        }

        const { rates } = req.body as { rates?: unknown }
        if (!Array.isArray(rates)) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'rates must be an array' })
        }

        const normalizedRates = rates.map((rate: any) => ({
            wilayaCode: typeof rate?.wilayaCode === 'string' ? rate.wilayaCode : '',
            communeCode: typeof rate?.communeCode === 'string' ? rate.communeCode : null,
            serviceLevel: typeof rate?.serviceLevel === 'string' ? rate.serviceLevel : null,
            price: typeof rate?.price === 'number' ? rate.price : Number(rate?.price),
            currency: typeof rate?.currency === 'string' ? rate.currency : undefined,
            isActive: typeof rate?.isActive === 'boolean' ? rate.isActive : undefined,
            estimatedMinDays:
                rate?.estimatedMinDays === null || rate?.estimatedMinDays === undefined
                    ? undefined
                    : Number(rate.estimatedMinDays),
            estimatedMaxDays:
                rate?.estimatedMaxDays === null || rate?.estimatedMaxDays === undefined
                    ? undefined
                    : Number(rate.estimatedMaxDays)
        }))

        const invalid = normalizedRates.find((r) => !r.wilayaCode || !Number.isFinite(r.price))
        if (invalid) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Each rate requires wilayaCode and numeric price' })
        }

        try {
            await service.updateDeliveryRates(tenant.id, provider, normalizedRates as any)
            res.json({ success: true })
        } catch (error) {
            console.error('Update rates error', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}
