import prisma from '../../lib/prisma'
import { Prisma } from '@prisma/client'
import { getPlanByCode } from '../../../../shared/pricing/plans'
import { computeBestBundleTotal, moneyToCents, centsToMoney } from '../../../../shared/pricing/bundle-pricing'
import { buildScopedProductPricing } from '../../../../shared/pricing/product-pricing'
import { TelegramService } from '../integrations/telegram.service'
import { syncProductStockForProducts } from '../inventory/product-stock.service'
import { suggestSkuFromProduct } from '../../lib/variant-identifiers'
import { CashService, CashValidationError } from '../cash/cash.service'
import { renderGenericBordereauPdf } from './bordereau-pdf'
import { getMaystroCredentials } from '../delivery/maystro/maystro.credentials'
import { MaystroBordereauService } from '../delivery/maystro/maystro-bordereau.service'
import { MaystroPickupPointService } from '../delivery/maystro/maystro-pickup-point.service'
import { LoyaltyCheckoutError, LoyaltyCheckoutService } from '../loyalty/loyalty-checkout.service'
import { LoyaltyFormulaService } from '../loyalty/loyalty-formula.service'
import { LoyaltyLedgerService } from '../loyalty/loyalty-ledger.service'
import { PhoneNormalizationError, PhoneNormalizationService } from '../loyalty/phone-normalization.service'
import { generatePublicOrderId, normalizeOrderIdPrefix } from '../../lib/order-public-id'
import { notificationsService } from '../notifications/notifications.service'

const telegramService = new TelegramService()
const cashService = new CashService()
const phoneNormalization = new PhoneNormalizationService()

export class OrderValidationError extends Error {
    statusCode: number
    statusMessage: string
    code?: string
    meta?: Record<string, unknown>

    constructor(statusCode: number, statusMessage: string, opts?: { code?: string; meta?: Record<string, unknown> }) {
        super(statusMessage)
        this.statusCode = statusCode
        this.statusMessage = statusMessage
        this.code = opts?.code
        this.meta = opts?.meta
    }
}

type PublicOrderItemInput = {
    productId: string
    variantId?: string | null
    quantity: number
}

type NormalizedPublicOrderItem = {
    productId: string
    variantId?: string
    quantity: number
}

type PreparedPublicOrderItem = {
    productId: string
    variantId: string
    quantity: number
    price: number
    referencePrice: number
    variantCost: number
    lineTotal: number
    pricingBreakdown: ReturnType<typeof computeBestBundleTotal>
    trackInventory: boolean
    reserved: number
    safetyStock: number
    isDefaultVariant: boolean
}

export type PublicOrderInput = {
    tenantId: string
    customerName?: string | null
    customerPhone?: string | null
    customerAddress?: string | null
    shippingWilayaCode?: string | null
    shippingCommuneCode?: string | null
    shippingServiceLevel?: string | null
    shippingAmount?: number | null
    shippingCurrency?: string | null
    shippingAddressLine1?: string | null
    shippingNotes?: string | null
    deliveryMode?: string | null
    shippingProvider?: string | null
    shippingPickupPoint?: number | string | null
    redeemPointsRequested?: number | null
    items: PublicOrderItemInput[]
}

export type AdminOrderInput = {
    tenantId: string
    customerId?: string | null
    customerName?: string | null
    customerPhone?: string | null
    customerAddress?: string | null
    shippingWilayaCode?: string | null
    shippingCommuneCode?: string | null
    shippingServiceLevel?: string | null
    shippingAmount?: number | null
    shippingCurrency?: string | null
    shippingAddressLine1?: string | null
    shippingNotes?: string | null
    deliveryMode?: string | null
    shippingProvider?: string | null
    shippingPickupPoint?: number | string | null
    items: PublicOrderItemInput[]
}

export type AdminOrderUpdateInput = {
    customerId?: string | null
    customerName?: string | null
    customerPhone?: string | null
    customerAddress?: string | null
    deliveryMode?: string | null
    shippingProvider?: string | null
    shippingWilayaCode?: string | null
    shippingCommuneCode?: string | null
    shippingServiceLevel?: string | null
    shippingAmount?: number | null
    shippingCurrency?: string | null
    shippingAddressLine1?: string | null
    shippingNotes?: string | null
    shippingPickupPoint?: number | string | null
    items?: PublicOrderItemInput[] | null
}

type SubscriptionContext = {
    planCode: string
    currentPeriodStart: Date
    currentPeriodEnd: Date | null
    interval: string
}

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'] as const

const normalizeDeliveryMode = (value: unknown): 'home' | 'pickup' | 'store' => {
    const raw = typeof value === 'string' ? value.trim().toLowerCase() : ''
    if (raw === 'store') return 'store'
    if (raw === 'pickup' || raw === 'desk' || raw === 'office') return 'pickup'
    return 'home'
}

const toOptionalPickupPoint = (value: unknown): number | null => {
    if (value === undefined || value === null) return null
    const n = typeof value === 'number' ? value : Number(String(value).trim())
    if (!Number.isFinite(n)) return null
    const i = Math.trunc(n)
    return i > 0 ? i : null
}

const computeTotalWithShipping = (itemsTotal: number, shippingAmount: number | null | undefined) => {
    const itemsCents = moneyToCents(itemsTotal || 0)
    const shippingCents = moneyToCents(shippingAmount || 0)
    return centsToMoney(itemsCents + shippingCents)
}

const normalizeCustomerPhoneForOrder = (phone: unknown) =>
    phoneNormalization.tryNormalizeAlgerianPhone(phone)?.normalized ?? null

const addUtcMonths = (date: Date, months: number) =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate(), 0, 0, 0, 0))

const addUtcYears = (date: Date, years: number) =>
    new Date(Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0))

export class OrdersService {
    private maystroBordereau = new MaystroBordereauService()
    private maystroPickupPoints = new MaystroPickupPointService()
    private loyaltyFormula = new LoyaltyFormulaService()
    private loyaltyLedger = new LoyaltyLedgerService()
    private loyaltyCheckout = new LoyaltyCheckoutService()

    private async generateUniquePublicId(tx: Prisma.TransactionClient, tenantId: string, configuredPrefix: unknown) {
        const prefix = normalizeOrderIdPrefix(configuredPrefix)

        for (let attempt = 0; attempt < 12; attempt += 1) {
            const candidate = generatePublicOrderId(prefix)
            const existing = await tx.order.findFirst({
                where: { tenantId, publicId: candidate },
                select: { id: true }
            })

            if (!existing) {
                return candidate
            }
        }

        throw new OrderValidationError(503, 'Unable to generate a unique order reference')
    }

    private static normalizePickupPointLabel(value: string) {
        return value.trim().toLowerCase().replace(/\s+/g, ' ')
    }

    private buildLoyaltyResponse(args: {
        availablePoints: number
        pendingRedeemPoints?: number
        basePointsToEarn: number
        productPointsToEarn: number
        totalPointsToEarn: number
        redeemedPoints: number
        redeemedAmount: number
        redeemError?: string | null
    }) {
        return {
            availablePoints: args.availablePoints,
            pendingRedeemPoints: args.pendingRedeemPoints ?? 0,
            basePointsToEarn: args.basePointsToEarn,
            productPointsToEarn: args.productPointsToEarn,
            totalPointsToEarn: args.totalPointsToEarn,
            pointsToEarn: args.totalPointsToEarn,
            redeemedPoints: args.redeemedPoints,
            redeemedAmount: args.redeemedAmount,
            redeemError: args.redeemError ?? null
        }
    }

    private normalizePublicOrderItems(items: PublicOrderItemInput[]) {
        if (!Array.isArray(items) || items.length === 0) {
            throw new OrderValidationError(400, 'At least one item is required')
        }

        const normalizedItems: NormalizedPublicOrderItem[] = items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId || undefined,
            quantity: Number(item.quantity || 0)
        }))

        normalizedItems.forEach((item) => {
            if (!item.productId) {
                throw new OrderValidationError(400, 'Product ID is required for each item')
            }
            if (!Number.isFinite(item.quantity) || item.quantity < 1) {
                throw new OrderValidationError(400, 'Quantity must be at least 1')
            }
        })

        return normalizedItems
    }

    private async preparePublicOrderItems(tenantId: string, items: NormalizedPublicOrderItem[]) {
        const storeSettings = await prisma.storeSettings.upsert({
            where: { tenantId },
            create: { tenantId },
            update: {}
        })

        const productIds = Array.from(new Set(items.map((item) => item.productId)))
        const variantIds = Array.from(
            new Set(
                items
                    .map((item) => item.variantId)
                    .filter((variantId): variantId is string => typeof variantId === 'string' && variantId.length > 0)
            )
        )
        const productIdsWithoutVariant = Array.from(
            new Set(items.filter((item) => !item.variantId).map((item) => item.productId))
        )

        const products = await prisma.product.findMany({
            where: { id: { in: productIds }, tenantId, isActive: true },
            select: {
                id: true,
                slug: true,
                price: true,
                title: true,
                stock: true,
                isPromotionActive: true,
                promotionalPrice: true,
                promotionStartDate: true,
                promotionEndDate: true,
                _count: {
                    select: { options: true }
                }
            }
        })

        if (products.length !== productIds.length) {
            throw new OrderValidationError(400, 'Some products are invalid or unavailable')
        }

        const productMap = new Map(products.map((product) => [product.id, { ...product, hasVariants: (product as any)._count?.options > 0 }]))

        const variantsById = variantIds.length
            ? await prisma.productVariant.findMany({
                where: { id: { in: variantIds }, tenantId, isActive: true },
                select: {
                    id: true,
                    productId: true,
                    price: true,
                    promotionalPrice: true,
                    isPromotionActive: true,
                    promotionStartDate: true,
                    promotionEndDate: true,
                    showCountdown: true,
                    cost: true,
                    stock: true,
                    reserved: true,
                    safetyStock: true,
                    trackInventory: true
                }
            })
            : []

        if (variantsById.length !== variantIds.length) {
            throw new OrderValidationError(400, 'Some variants are invalid or unavailable')
        }

        const defaultVariants = productIdsWithoutVariant.length
            ? await prisma.productVariant.findMany({
                where: {
                    tenantId,
                    productId: { in: productIdsWithoutVariant },
                    isActive: true,
                    optionValues: { none: {} }
                },
                select: {
                    id: true,
                    productId: true,
                    price: true,
                    promotionalPrice: true,
                    isPromotionActive: true,
                    promotionStartDate: true,
                    promotionEndDate: true,
                    showCountdown: true,
                    cost: true,
                    stock: true,
                    reserved: true,
                    safetyStock: true,
                    trackInventory: true
                }
            })
            : []

        const variantMap = new Map(variantsById.map((variant) => [variant.id, variant]))
        const defaultVariantByProductId = new Map(defaultVariants.map((variant) => [variant.productId, variant]))

        if (productIdsWithoutVariant.length > 0) {
            const optionRows = await prisma.productOption.findMany({
                where: { tenantId, productId: { in: productIdsWithoutVariant } },
                select: { productId: true },
                distinct: ['productId']
            })
            const productsWithOptions = new Set(optionRows.map((row) => row.productId))

            for (const productId of productIdsWithoutVariant) {
                if (defaultVariantByProductId.has(productId)) continue
                if (productsWithOptions.has(productId)) continue

                const product = productMap.get(productId)
                if (!product) continue

                const created = await prisma.productVariant.create({
                    data: {
                        tenantId,
                        productId,
                        sku: suggestSkuFromProduct(product.slug, ''),
                        price: product.price,
                        stock: product.stock,
                        reserved: 0,
                        safetyStock: 0,
                        trackInventory: true,
                        isActive: true
                    }
                })
                defaultVariantByProductId.set(productId, created as any)
            }
        }

        const now = new Date()
        const activeBundleDeals = await prisma.productBundleDeal.findMany({
            where: {
                tenantId,
                productId: { in: productIds },
                isActive: true,
                AND: [
                    { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
                    { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }
                ]
            },
            select: { productId: true, bundleQty: true, bundlePrice: true }
        })

        const bundleDealsByProductId = new Map<string, { bundleQty: number; bundlePrice: number }[]>()
        for (const deal of activeBundleDeals) {
            const rows = bundleDealsByProductId.get(deal.productId) ?? []
            rows.push({ bundleQty: deal.bundleQty, bundlePrice: Number(deal.bundlePrice) })
            bundleDealsByProductId.set(deal.productId, rows)
        }

        let totalCents = 0
        const validatedItems: PreparedPublicOrderItem[] = items.map((item) => {
            const product = productMap.get(item.productId)!
            const variant = item.variantId ? variantMap.get(item.variantId) : defaultVariantByProductId.get(product.id)

            if (!variant || variant.productId !== product.id) {
                throw new OrderValidationError(400, 'Variant selection is required for this product')
            }

            const price = buildScopedProductPricing(product as any, variant as any).effectivePrice
            const availableStock = variant.trackInventory
                ? Math.max(variant.stock - variant.reserved - variant.safetyStock, 0)
                : Number.POSITIVE_INFINITY
            const trackInventory = variant.trackInventory

            if (trackInventory && item.quantity > availableStock) {
                throw new OrderValidationError(400, `Insufficient stock for ${product.title}`)
            }

            const unitPriceCents = moneyToCents(price)
            const bundleDeals = bundleDealsByProductId.get(product.id) ?? []
            const pricing = computeBestBundleTotal({
                quantity: item.quantity,
                unitPriceCents,
                bundleDeals: bundleDeals.map((deal) => ({
                    bundleQty: deal.bundleQty,
                    bundlePriceCents: moneyToCents(deal.bundlePrice)
                }))
            })
            totalCents += pricing.bestTotalCents

            return {
                productId: product.id,
                variantId: variant.id,
                quantity: item.quantity,
                price,
                referencePrice: Number(variant.price ?? product.price ?? 0),
                variantCost: Number(variant.cost ?? 0),
                lineTotal: centsToMoney(pricing.bestTotalCents),
                pricingBreakdown: pricing,
                trackInventory,
                reserved: variant.reserved,
                safetyStock: variant.safetyStock,
                isDefaultVariant: !item.variantId && defaultVariantByProductId.get(product.id)?.id === variant.id
            }
        })

        return {
            storeSettings,
            validatedItems,
            totalAmount: centsToMoney(totalCents)
        }
    }

    private async resolveShippingPickupPoint(input: {
        tenantId: string
        shippingProvider: unknown
        deliveryMode: 'home' | 'pickup' | 'store'
        shippingCommuneCode?: string | null
        rawPickupPoint: unknown
    }): Promise<number | null> {
        const numeric = toOptionalPickupPoint(input.rawPickupPoint)
        if (numeric) return numeric

        const rawLabel = typeof input.rawPickupPoint === 'string' ? input.rawPickupPoint.trim() : ''
        if (!rawLabel) return null

        const provider = typeof input.shippingProvider === 'string' ? input.shippingProvider.toUpperCase() : ''
        if (provider !== 'MAYSTRO' || input.deliveryMode !== 'pickup') {
            throw new OrderValidationError(400, 'shippingPickupPoint must be a numeric id')
        }

        const commune = typeof input.shippingCommuneCode === 'string' ? input.shippingCommuneCode.trim() : ''
        if (!commune) {
            throw new OrderValidationError(400, 'shippingCommuneCode is required when shippingPickupPoint is provided')
        }

        try {
            const creds = await getMaystroCredentials(input.tenantId)
            const points = await this.maystroPickupPoints.listActivePickupPoints({
                apiToken: creds.apiToken,
                commune,
                deliveryType: 3
            })
            const wanted = OrdersService.normalizePickupPointLabel(rawLabel)
            const match = points.find((point) => {
                if (!Number.isFinite(point.pickup_point) || point.pickup_point <= 0) return false
                const names = [point.name, point.name_lt, point.name_ar].filter(
                    (name): name is string => typeof name === 'string' && name.trim().length > 0
                )
                return names.some((name) => OrdersService.normalizePickupPointLabel(name) === wanted)
            })
            if (!match) {
                throw new OrderValidationError(400, 'Invalid Maystro pickup point for commune')
            }
            return Math.trunc(match.pickup_point)
        } catch (error) {
            if (error instanceof OrderValidationError) throw error
            throw new OrderValidationError(400, 'Invalid Maystro pickup point for commune')
        }
    }

    async getBordereauPdf(tenantId: string, orderId: string, tenantName: string) {
        const order = await prisma.order.findFirst({
            where: { tenantId, id: orderId },
            select: {
                id: true,
                publicId: true,
                createdAt: true,
                customerName: true,
                customerPhone: true,
                customerAddress: true,
                deliveryMode: true,
                shippingProvider: true,
                shippingServiceLevel: true,
                shippingAmount: true,
                shippingCurrency: true,
                totalAmount: true,
                totalWithShippingAmount: true,
                shippingAddressLine1: true,
                shippingWilayaCode: true,
                shippingCommuneCode: true,
                shippingPickupPoint: true,
                shippingNotes: true,
                items: {
                    select: {
                        quantity: true,
                        price: true,
                        lineTotal: true,
                        product: { select: { title: true } },
                        variant: { select: { sku: true } }
                    }
                },
                shipments: {
                    orderBy: { createdAt: 'desc' },
                    select: { provider: true, providerShipmentId: true }
                },
                maystroMappings: {
                    orderBy: { createdAt: 'desc' },
                    select: { maystroOrderId: true, tracking: true }
                }
            }
        })
        if (!order) throw new OrderValidationError(404, 'Order not found')

        const currency = (order.shippingCurrency || 'DZD').toUpperCase()
        const computedTotalWithShipping =
            typeof order.totalWithShippingAmount === 'number' && Number.isFinite(order.totalWithShippingAmount)
                ? order.totalWithShippingAmount
                : computeTotalWithShipping(order.totalAmount || 0, order.shippingAmount ?? null)

        const shipment = order.shipments?.[0] ?? null
        const provider = shipment?.provider ?? order.shippingProvider ?? null
        const providerShipmentId = shipment?.providerShipmentId ?? order.maystroMappings?.[0]?.tracking ?? null

        if (provider === 'MAYSTRO') {
            const creds = await getMaystroCredentials(tenantId)
            // Bordereau requires display_id (= tracking), not the UUID.
            // providerShipmentId is now stored as tracking since the delivery service fix.
            // Fall back through: shipment.providerShipmentId → mapping.tracking → mapping.maystroOrderId
            const bordereauId =
                shipment?.providerShipmentId ??
                order.maystroMappings.find((m) => typeof m.tracking === 'string' && m.tracking)?.tracking ??
                order.maystroMappings.find((m) => typeof m.maystroOrderId === 'string' && m.maystroOrderId)?.maystroOrderId ??
                null
            if (!bordereauId) throw new OrderValidationError(409, 'Maystro order id not found for this order')

            const pdf = await this.maystroBordereau.createBordereauPdf({ apiToken: creds.apiToken, ordersIds: [bordereauId] })
            return { filename: `bordereau-${order.id}.pdf`, pdf: Buffer.from(pdf) }
        }

        const pdf = await renderGenericBordereauPdf({
            tenantName,
            order: {
                id: order.publicId || order.id,
                createdAt: order.createdAt,
                customerName: order.customerName,
                customerPhone: order.customerPhone,
                customerAddress: order.customerAddress ?? null,
                deliveryMode: order.deliveryMode ?? null,
                shippingProvider: provider ? String(provider) : null,
                shippingServiceLevel: order.shippingServiceLevel ?? null,
                shippingAmount: order.shippingAmount == null ? null : Number(order.shippingAmount),
                shippingCurrency: currency,
                totalAmount: Number(order.totalAmount || 0),
                totalWithShippingAmount: Number(computedTotalWithShipping || 0),
                shippingAddressLine1: order.shippingAddressLine1 ?? null,
                shippingWilayaCode: order.shippingWilayaCode ?? null,
                shippingCommuneCode: order.shippingCommuneCode ?? null,
                shippingPickupPoint: order.shippingPickupPoint ?? null,
                shippingNotes: order.shippingNotes ?? null,
                providerShipmentId: providerShipmentId ? String(providerShipmentId) : null,
                items: (order.items || []).map((i) => ({
                    title: i.product?.title || i.variant?.sku || 'Item',
                    quantity: Number(i.quantity || 0),
                    unitPrice: Number(i.price || 0),
                    lineTotal: Number(i.lineTotal ?? (i.price || 0) * (i.quantity || 0))
                }))
            }
        })

        return { filename: `bordereau-${order.id}.pdf`, pdf }
    }

    async getPublicLoyaltySummary(input: {
        tenantId: string
        customerPhone?: string | null
        redeemPointsRequested?: number | null
        items: PublicOrderItemInput[]
    }) {
        const normalizedItems = this.normalizePublicOrderItems(input.items)
        const { storeSettings, validatedItems, totalAmount } = await this.preparePublicOrderItems(input.tenantId, normalizedItems)
        const customerPhone = (input.customerPhone || '').trim()

        const pointsPreview = this.loyaltyFormula.computeTotal(
            storeSettings,
            validatedItems.map((item) => ({
                quantity: item.quantity,
                referencePrice: item.referencePrice,
                cost: item.variantCost
            }))
        )

        if (!customerPhone) {
            return this.buildLoyaltyResponse({
                availablePoints: 0,
                pendingRedeemPoints: 0,
                basePointsToEarn: pointsPreview.basePointsTotal,
                productPointsToEarn: pointsPreview.productPointsTotal,
                totalPointsToEarn: pointsPreview.totalPoints,
                redeemedPoints: 0,
                redeemedAmount: 0,
                redeemError: null
            })
        }

        try {
            const customer = await this.loyaltyLedger.findCustomerByPhone(prisma, input.tenantId, customerPhone)
            const summary = customer
                ? await this.loyaltyLedger.getCustomerPointsSummary(prisma, input.tenantId, customer.id)
                : { availablePoints: 0, pendingRedeemPoints: 0, earnedPointsTotal: 0, redeemedPointsTotal: 0 }
            const requestedPoints = Math.max(0, Math.trunc(Number(input.redeemPointsRequested || 0) || 0))

            if (requestedPoints <= 0) {
                return this.buildLoyaltyResponse({
                    availablePoints: summary.availablePoints,
                    pendingRedeemPoints: summary.pendingRedeemPoints,
                    basePointsToEarn: pointsPreview.basePointsTotal,
                    productPointsToEarn: pointsPreview.productPointsTotal,
                    totalPointsToEarn: pointsPreview.totalPoints,
                    redeemedPoints: 0,
                    redeemedAmount: 0,
                    redeemError: null
                })
            }

            try {
                const redemption = await this.loyaltyCheckout.evaluateRedemption(prisma, {
                    tenantId: input.tenantId,
                    customerId: customer?.id ?? null,
                    requestedPoints,
                    itemsSubtotal: totalAmount,
                    settings: storeSettings
                })

                return this.buildLoyaltyResponse({
                    availablePoints: redemption.availablePoints - redemption.pointsReserved,
                    pendingRedeemPoints: redemption.pendingRedeemPoints + redemption.pointsReserved,
                    basePointsToEarn: pointsPreview.basePointsTotal,
                    productPointsToEarn: pointsPreview.productPointsTotal,
                    totalPointsToEarn: pointsPreview.totalPoints,
                    redeemedPoints: redemption.pointsReserved,
                    redeemedAmount: redemption.redeemedAmount,
                    redeemError: null
                })
            } catch (error) {
                if (!(error instanceof LoyaltyCheckoutError)) throw error

                return this.buildLoyaltyResponse({
                    availablePoints: summary.availablePoints,
                    pendingRedeemPoints: summary.pendingRedeemPoints,
                    basePointsToEarn: pointsPreview.basePointsTotal,
                    productPointsToEarn: pointsPreview.productPointsTotal,
                    totalPointsToEarn: pointsPreview.totalPoints,
                    redeemedPoints: 0,
                    redeemedAmount: 0,
                    redeemError: error.statusMessage
                })
            }
        } catch (error) {
            if (error instanceof PhoneNormalizationError) {
                throw new OrderValidationError(error.statusCode, error.statusMessage)
            }
            throw error
        }
    }

    private async ensureDeliveredOrderSale(
        tx: any,
        tenantId: string,
        order: {
            id: string
            tenantId: string
            totalAmount: number
            customerId: string | null
            customerName: string
            customerPhone: string
            customerAddress: string | null
            earnedPointsTotal?: number
            redeemedPointsTotal?: number
            redeemedAmount?: number
            items: Array<{ productId: string; variantId: string | null; quantity: number; price: number }>
        },
        actor?: { userId?: string | null }
    ) {
        const existingSale = await tx.sale.findFirst({
            where: { tenantId, id: order.id },
            select: { id: true }
        })
        if (existingSale) return existingSale

        const created = await tx.sale.create({
            data: {
                id: order.id,
                tenantId,
                source: 'ORDER',
                orderId: order.id,
                status: 'COMPLETED',
                totalAmount: order.totalAmount,
                customerId: order.customerId,
                customerName: order.customerName,
                customerPhone: order.customerPhone,
                customerAddress: order.customerAddress,
                earnedPointsTotal: order.earnedPointsTotal ?? 0,
                redeemedPointsTotal: order.redeemedPointsTotal ?? 0,
                redeemedAmount: order.redeemedAmount ?? 0,
                notes: 'Converted from delivered order',
                createdByUserId: actor?.userId ?? null
            }
        })

        if (Array.isArray(order.items) && order.items.length > 0) {
            await tx.saleItem.createMany({
                data: order.items.map((i) => ({
                    tenantId,
                    saleId: created.id,
                    productId: i.productId,
                    variantId: i.variantId,
                    quantity: i.quantity,
                    price: i.price
                }))
            })
        }

        return created
    }

    async list(tenantId: string, filters: { status?: string; search?: string; startDate?: string; endDate?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }, pagination: { page: number; limit: number } = { page: 1, limit: 25 }) {
        const where: any = { tenantId }

        if (filters.status) {
            where.status = filters.status
        }

        if (filters.search) {
            where.OR = [
                { publicId: { contains: filters.search, mode: 'insensitive' } },
                { customerName: { contains: filters.search, mode: 'insensitive' } },
                { customerPhone: { contains: filters.search } }
            ]
        }

        if (filters.startDate || filters.endDate) {
            where.createdAt = {}
            if (filters.startDate) {
                const start = new Date(filters.startDate)
                start.setHours(0, 0, 0, 0)
                where.createdAt.gte = start
            }
            if (filters.endDate) {
                const end = new Date(filters.endDate)
                end.setHours(23, 59, 59, 999)
                where.createdAt.lte = end
            }
        }

        const { page, limit } = pagination
        const skip = (page - 1) * limit

        const sortableFields: Record<string, string> = {
            id: 'id',
            customerName: 'customerName',
            totalAmount: 'totalAmount',
            status: 'status',
            createdAt: 'createdAt'
        }

        const orderBy: any = {}
        if (filters.sortBy && sortableFields[filters.sortBy]) {
            orderBy[sortableFields[filters.sortBy]] = filters.sortOrder || 'desc'
        } else {
            orderBy.createdAt = 'desc'
        }

        const [items, total] = await Promise.all([
            prisma.order.findMany({
                where,
                select: {
                    id: true,
                    publicId: true,
                    status: true,
                    callStatus: true,
                    totalAmount: true,
                    totalWithShippingAmount: true,
                    shippingAmount: true,
                    shippingCurrency: true,
                    shippingProvider: true,
                    deliveryMode: true,
                    shippingServiceLevel: true,
                    customerName: true,
                    customerPhone: true,
                    customerId: true,
                    createdAt: true,
                    updatedAt: true
                },
                orderBy,
                skip,
                take: limit
            }),
            prisma.order.count({ where })
        ])

        return {
            items,
            total,
            page,
            totalPages: Math.max(1, Math.ceil(total / limit))
        }
    }

    async getUnreadCount(tenantId: string) {
        return prisma.order.count({
            where: {
                tenantId,
                readAt: null
            }
        })
    }

    async markAsRead(tenantId: string, id: string) {
        const existing = await prisma.order.findFirst({
            where: { tenantId, id },
            select: { id: true, readAt: true }
        })

        if (!existing) {
            throw new OrderValidationError(404, 'Order not found')
        }

        if (existing.readAt) {
            return {
                id: existing.id,
                readAt: existing.readAt
            }
        }

        const readAt = new Date()
        await prisma.order.updateMany({
            where: {
                tenantId,
                id,
                readAt: null
            },
            data: { readAt }
        })

        return {
            id,
            readAt
        }
    }

    async findById(tenantId: string, id: string) {
        const order = await prisma.order.findFirst({
            where: { id, tenantId },
            include: {
                items: {
                    include: {
                        product: true,
                        variant: {
                            include: {
                                optionValues: {
                                    include: { optionValue: true }
                                }
                            }
                        }
                    }
                },
                shipments: {
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        provider: true,
                        providerShipmentId: true,
                        status: true,
                        serviceLevel: true,
                        price: true,
                        currency: true,
                        labelUrl: true,
                        trackingUrl: true,
                        createdAt: true,
                        updatedAt: true
                    }
                }
            }
        })

        if (!order) return null

        const previousOrderItemSelect = {
            id: true,
            productId: true,
            variantId: true,
            quantity: true,
            price: true,
            lineTotal: true,
            product: {
                select: { title: true }
            },
            variant: {
                select: {
                    optionValues: {
                        select: {
                            optionValue: {
                                select: { label: true }
                            }
                        }
                    }
                }
            }
        } satisfies Prisma.OrderItemSelect

        let previousOrdersMatch:
            | { type: 'customer'; customerId: string; phoneNormalized?: string | null }
            | { type: 'phone'; customerId?: null; phoneNormalized: string }
            | { type: 'none'; customerId?: string | null; phoneNormalized?: string | null }

        let previousOrders: any[] = []

        if (order.customerId) {
            previousOrdersMatch = {
                type: 'customer',
                customerId: order.customerId,
                phoneNormalized: (order as any).customerPhoneNormalized ?? normalizeCustomerPhoneForOrder(order.customerPhone)
            }
            previousOrders = await prisma.order.findMany({
                where: {
                    tenantId,
                    customerId: order.customerId,
                    id: { not: order.id }
                },
                orderBy: { createdAt: 'desc' },
                take: 100,
                select: {
                    id: true,
                    publicId: true,
                    status: true,
                    callStatus: true,
                    customerName: true,
                    customerPhone: true,
                    totalAmount: true,
                    totalWithShippingAmount: true,
                    shippingAmount: true,
                    shippingProvider: true,
                    deliveryMode: true,
                    createdAt: true,
                    updatedAt: true,
                    items: { select: previousOrderItemSelect }
                }
            })
        } else {
            const phoneNormalized = (order as any).customerPhoneNormalized ?? normalizeCustomerPhoneForOrder(order.customerPhone)
            if (phoneNormalized) {
                previousOrdersMatch = {
                    type: 'phone',
                    customerId: null,
                    phoneNormalized
                }
                previousOrders = await prisma.order.findMany({
                    where: {
                        tenantId,
                        customerPhoneNormalized: phoneNormalized,
                        id: { not: order.id }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 100,
                    select: {
                        id: true,
                        publicId: true,
                        status: true,
                        callStatus: true,
                        customerName: true,
                        customerPhone: true,
                        totalAmount: true,
                        totalWithShippingAmount: true,
                        shippingAmount: true,
                        shippingProvider: true,
                        deliveryMode: true,
                        createdAt: true,
                        updatedAt: true,
                        items: { select: previousOrderItemSelect }
                    }
                })
            } else {
                previousOrdersMatch = {
                    type: 'none',
                    customerId: null,
                    phoneNormalized: null
                }
            }
        }

        return {
            ...order,
            previousOrders,
            previousOrdersMatch
        }
    }

    async deleteUnconfirmed(tenantId: string, id: string) {
        return prisma.$transaction(async (tx) => {
            const existing = await tx.order.findFirst({
                where: { tenantId, id },
                select: {
                    id: true,
                    status: true,
                    items: { select: { variantId: true, quantity: true } },
                    sale: { select: { id: true } },
                    _count: {
                        select: {
                            shipments: true,
                            cashTransactions: true,
                            inventoryMovements: true
                        }
                    }
                }
            })

            if (!existing) throw new OrderValidationError(404, 'Order not found')
            if (existing.status !== 'PENDING' && existing.status !== 'CONFIRMED') {
                throw new OrderValidationError(409, 'Only PENDING or just-CONFIRMED orders can be deleted', {
                    code: 'ORDER_DELETE_STATUS_NOT_ALLOWED'
                })
            }

            if (
                existing.sale ||
                existing._count.cashTransactions > 0
            ) {
                throw new OrderValidationError(409, 'Order cannot be deleted because it has linked records', {
                    code: 'ORDER_DELETE_HAS_LINKED_RECORDS',
                    meta: {
                        hasSale: Boolean(existing.sale),
                        cashTransactionsCount: existing._count.cashTransactions
                    }
                })
            }

            // Release reserved inventory for CONFIRMED orders
            if (existing.status === 'CONFIRMED') {
                for (const item of existing.items) {
                    if (!item.variantId) continue
                    const variant = await tx.productVariant.findFirst({
                        where: { tenantId, id: item.variantId },
                        select: { id: true, productId: true, stock: true, reserved: true, safetyStock: true, trackInventory: true }
                    })
                    if (!variant || variant.trackInventory === false) continue
                    if (variant.reserved < item.quantity) continue

                    await tx.productVariant.updateMany({
                        where: { tenantId, id: item.variantId },
                        data: { reserved: { decrement: item.quantity } }
                    })

                    const after = await tx.productVariant.findFirst({
                        where: { tenantId, id: item.variantId },
                        select: { stock: true, reserved: true, safetyStock: true }
                    })

                    await tx.inventoryMovement.create({
                        data: {
                            tenantId,
                            variantId: item.variantId,
                            type: 'RESERVED_ADJUSTMENT',
                            delta: 0,
                            reservedDelta: -item.quantity,
                            safetyStockDelta: 0,
                            reason: 'order_cancel',
                            note: 'delete_confirmed_order',
                            orderId: id,
                            stockAfter: after?.stock ?? null,
                            reservedAfter: after?.reserved ?? null,
                            safetyStockAfter: after?.safetyStock ?? null,
                            createdByUserId: null
                        }
                    })
                }

                // Remove Maystro mapping so it doesn't cause orphan issues
                await tx.maystroOrderMapping.deleteMany({ where: { tenantId, localOrderId: id } })
            }

            await this.loyaltyLedger.cancelPendingOrderRedemption(tx, tenantId, id)
            await tx.orderItem.deleteMany({ where: { tenantId, orderId: id } })
            const deleted = await tx.order.deleteMany({ where: { tenantId, id } })
            if (deleted.count !== 1) throw new OrderValidationError(404, 'Order not found')

            return { id }
        })
    }

    async bulkDeleteUnconfirmed(tenantId: string, ids: string[]) {
        const uniqueIds = Array.from(new Set(ids.filter((v) => typeof v === 'string' && v.trim()))).slice(0, 200)
        if (uniqueIds.length === 0) throw new OrderValidationError(400, 'ids must be a non-empty array')

        return prisma.$transaction(async (tx) => {
            const orders = await tx.order.findMany({
                where: { tenantId, id: { in: uniqueIds } },
                select: {
                    id: true,
                    status: true,
                    sale: { select: { id: true } },
                    _count: {
                        select: {
                            shipments: true,
                            cashTransactions: true,
                            inventoryMovements: true
                        }
                    }
                }
            })

            const foundIds = new Set(orders.map((o) => o.id))
            const missing = uniqueIds.filter((id) => !foundIds.has(id))
            if (missing.length) throw new OrderValidationError(404, 'Some orders were not found')

            const notDeletable = orders.filter((o) =>
                o.status !== 'PENDING' ||
                Boolean(o.sale) ||
                o._count.shipments > 0 ||
                o._count.cashTransactions > 0 ||
                o._count.inventoryMovements > 0
            )
            if (notDeletable.length) {
                throw new OrderValidationError(409, 'Some orders cannot be deleted', {
                    code: 'ORDER_BULK_DELETE_HAS_LINKED_OR_NON_PENDING'
                })
            }

            const deletableIds = orders.map((o) => o.id)

            for (const orderId of deletableIds) {
                await this.loyaltyLedger.cancelPendingOrderRedemption(tx, tenantId, orderId)
            }
            await tx.orderItem.deleteMany({ where: { tenantId, orderId: { in: deletableIds } } })
            const deleted = await tx.order.deleteMany({ where: { tenantId, id: { in: deletableIds }, status: 'PENDING' } })

            return { deletedCount: deleted.count, deletedIds: deletableIds }
        })
    }

    async getPublicPixelPayload(tenantId: string, orderId: string) {
        const order = await prisma.order.findFirst({
            where: { tenantId, id: orderId },
            select: {
                id: true,
                publicId: true,
                totalAmount: true,
                items: {
                    select: {
                        productId: true,
                        quantity: true,
                        price: true
                    }
                }
            }
        })

        if (!order) return null

        const storeSettings = await prisma.storeSettings.findUnique({
            where: { tenantId },
            select: { currencyCode: true }
        })

        const currency = storeSettings?.currencyCode || 'DZD'
        const contents = order.items.map((i) => ({ id: i.productId, quantity: i.quantity, item_price: i.price }))
        const numItems = order.items.reduce((sum, i) => sum + (i.quantity || 0), 0)

        const productIds = Array.from(new Set(order.items.map((i) => i.productId).filter(Boolean)))
        const pixelRows = productIds.length
            ? await prisma.productMetaPixel.findMany({
                where: { tenantId, productId: { in: productIds }, metaPixel: { isActive: true } },
                select: { metaPixel: { select: { pixelId: true } } }
            })
            : []
        const pixelIds = Array.from(
            new Set(
                pixelRows
                    .map((r) => r.metaPixel?.pixelId)
                    .filter((p): p is string => typeof p === 'string' && /^[0-9]+$/.test(p))
            )
        )

        return {
            orderId: order.id,
            publicOrderId: order.publicId,
            value: order.totalAmount,
            currency,
            numItems,
            contents,
            pixelIds
        }
    }

    async updateUnconfirmed(tenantId: string, id: string, input: AdminOrderUpdateInput, actor?: { userId?: string | null }) {
        const hasAnyField =
            input.customerId !== undefined ||
            input.customerName !== undefined ||
            input.customerPhone !== undefined ||
            input.customerAddress !== undefined ||
            input.deliveryMode !== undefined ||
            input.shippingProvider !== undefined ||
            input.shippingWilayaCode !== undefined ||
            input.shippingCommuneCode !== undefined ||
            input.shippingServiceLevel !== undefined ||
            input.shippingAmount !== undefined ||
            input.shippingCurrency !== undefined ||
            input.shippingAddressLine1 !== undefined ||
            input.shippingNotes !== undefined ||
            input.shippingPickupPoint !== undefined ||
            input.items !== undefined

        if (!hasAnyField) throw new OrderValidationError(400, 'No fields to update')

        const existing = await prisma.order.findFirst({
            where: { tenantId, id },
            select: {
                id: true,
                status: true,
                totalAmount: true,
                totalWithShippingAmount: true,
                redeemedPointsTotal: true,
                redeemedAmount: true,
                customerId: true,
                customerName: true,
                customerPhone: true,
                customerAddress: true,
                deliveryMode: true,
                shippingProvider: true,
                shippingServiceLevel: true,
                shippingAmount: true,
                shippingCurrency: true,
                shippingWilayaCode: true,
                shippingCommuneCode: true,
                shippingAddressLine1: true,
                shippingNotes: true,
                shippingPickupPoint: true,
                sale: { select: { id: true } },
                _count: {
                    select: {
                        shipments: true,
                        cashTransactions: true,
                        inventoryMovements: true
                    }
                }
            }
        })

        if (!existing) throw new OrderValidationError(404, 'Order not found')
        if (existing.status !== 'PENDING') throw new OrderValidationError(409, 'Only unconfirmed (PENDING) orders can be edited')
        if (
            existing.sale ||
            existing._count.shipments > 0 ||
            existing._count.cashTransactions > 0 ||
            existing._count.inventoryMovements > 0
        ) {
            throw new OrderValidationError(409, 'Order cannot be edited because it has linked records')
        }
        if ((existing.redeemedPointsTotal ?? 0) > 0) {
            throw new OrderValidationError(409, 'Orders with pending loyalty redemption cannot be edited')
        }

        const nextCustomerName =
            input.customerName === undefined ? existing.customerName : String(input.customerName ?? '').trim()
        const nextCustomerPhone =
            input.customerPhone === undefined ? existing.customerPhone : String(input.customerPhone ?? '').trim()

        if (!nextCustomerName) throw new OrderValidationError(400, 'Customer name is required')
        if (!nextCustomerPhone) throw new OrderValidationError(400, 'Customer phone is required')

        const nextDeliveryMode =
            input.deliveryMode === undefined ? normalizeDeliveryMode(existing.deliveryMode) : normalizeDeliveryMode(input.deliveryMode)

        let nextShippingProvider: any = existing.shippingProvider
        if (input.shippingProvider !== undefined) {
            nextShippingProvider = null
            if (input.shippingProvider) {
                const providerUpper = String(input.shippingProvider).toUpperCase()
                const validProviders = ['MAYSTRO', 'YALIDINE', 'SELF']
                if (validProviders.includes(providerUpper)) {
                    nextShippingProvider = providerUpper as any
                }
            }
        }

        if (nextDeliveryMode === 'store') {
            const settings = await prisma.storeSettings.upsert({
                where: { tenantId },
                create: { tenantId },
                update: {}
            })
            if (settings.storePickupEnabled !== true) {
                throw new OrderValidationError(403, 'Store pickup is disabled for this store')
            }
            nextShippingProvider = null
        }

        const nextShippingWilayaCode =
            input.shippingWilayaCode === undefined ? existing.shippingWilayaCode : (input.shippingWilayaCode || null)
        const nextShippingCommuneCode =
            input.shippingCommuneCode === undefined ? existing.shippingCommuneCode : (input.shippingCommuneCode || null)
        const nextCustomerAddress =
            input.customerAddress === undefined ? existing.customerAddress : (input.customerAddress || null)

        const customerAddressWasMirrored =
            (existing.shippingAddressLine1 ?? null) === (existing.customerAddress ?? null)

        const nextShippingAddressLine1 =
            input.shippingAddressLine1 !== undefined
                ? (input.shippingAddressLine1 || input.customerAddress || null)
                : (input.customerAddress !== undefined && customerAddressWasMirrored)
                    ? (input.customerAddress || null)
                    : existing.shippingAddressLine1

        const nextShippingNotes =
            input.shippingNotes === undefined ? existing.shippingNotes : (input.shippingNotes || null)

        const nextShippingServiceLevelRaw =
            input.shippingServiceLevel === undefined ? existing.shippingServiceLevel : (input.shippingServiceLevel || null)
        const nextShippingServiceLevel =
            nextShippingServiceLevelRaw == null ? null : String(nextShippingServiceLevelRaw).trim()
        if (nextShippingServiceLevel && nextShippingServiceLevel.length > 64) {
            throw new OrderValidationError(400, 'shippingServiceLevel is too long')
        }

        let nextShippingAmount: number | null
        if (nextDeliveryMode === 'store') {
            nextShippingAmount = 0
        } else if (input.shippingAmount === undefined) {
            nextShippingAmount =
                existing.shippingAmount == null
                    ? null
                    : (Number.isFinite(Number(existing.shippingAmount)) ? Number(existing.shippingAmount) : null)
        } else if ((input.shippingAmount as any) === null || String(input.shippingAmount).trim() === '') {
            nextShippingAmount = null
        } else {
            const parsed = Number(input.shippingAmount)
            if (!Number.isFinite(parsed) || parsed < 0) {
                throw new OrderValidationError(400, 'shippingAmount must be a positive number')
            }
            nextShippingAmount = parsed
        }

        const nextShippingCurrencyRaw =
            input.shippingCurrency === undefined ? existing.shippingCurrency : (input.shippingCurrency || null)
        const nextShippingCurrency = nextShippingCurrencyRaw == null ? null : String(nextShippingCurrencyRaw).trim().toUpperCase()
        if (nextShippingCurrency && nextShippingCurrency.length > 8) {
            throw new OrderValidationError(400, 'shippingCurrency is too long')
        }

        let nextShippingPickupPoint: number | null
        if (nextShippingProvider !== 'MAYSTRO' || nextDeliveryMode !== 'pickup') {
            nextShippingPickupPoint = null
        } else if (input.shippingPickupPoint === undefined) {
            nextShippingPickupPoint = existing.shippingPickupPoint ?? null
        } else {
            nextShippingPickupPoint = await this.resolveShippingPickupPoint({
                tenantId,
                shippingProvider: nextShippingProvider,
                deliveryMode: nextDeliveryMode,
                shippingCommuneCode: nextShippingCommuneCode,
                rawPickupPoint: input.shippingPickupPoint
            })
        }

        const nextCustomerId = input.customerId === undefined ? existing.customerId : (input.customerId || null)
        if (input.customerId !== undefined && nextCustomerId) {
            const customer = await prisma.customer.findFirst({
                where: { tenantId, id: nextCustomerId },
                select: { id: true }
            })
            if (!customer) throw new OrderValidationError(400, 'Invalid customerId')
        }

        const shouldUpdateItems = input.items !== undefined
        const itemsInput = input.items ?? null

        let validatedItems: Array<{
            productId: string
            variantId: string
            quantity: number
            price: number
            lineTotal: number
            pricingBreakdown: any
            trackInventory: boolean
        }> = []
        let totalCents = 0

        if (shouldUpdateItems) {
            if (!Array.isArray(itemsInput) || itemsInput.length === 0) {
                throw new OrderValidationError(400, 'At least one item is required')
            }

            const normalizedItems = itemsInput.map((item) => ({
                productId: (item as any)?.productId,
                variantId: (item as any)?.variantId || undefined,
                quantity: Number((item as any)?.quantity || 0)
            }))

            normalizedItems.forEach((item) => {
                if (!item.productId) throw new OrderValidationError(400, 'Product ID is required for each item')
                if (!Number.isFinite(item.quantity) || item.quantity < 1) {
                    throw new OrderValidationError(400, 'Quantity must be at least 1')
                }
            })

            const productIds = Array.from(new Set(normalizedItems.map((item) => item.productId)))
            const variantIds = Array.from(
                new Set(
                    normalizedItems
                        .map((item) => item.variantId)
                        .filter((v): v is string => typeof v === 'string' && v.length > 0)
                )
            )
            const productIdsWithoutVariant = Array.from(
                new Set(normalizedItems.filter((item) => !item.variantId).map((item) => item.productId))
            )

            const products = await prisma.product.findMany({
                where: { id: { in: productIds }, tenantId, isActive: true },
                select: {
                    id: true,
                    slug: true,
                    price: true,
                    title: true,
                    stock: true,
                    isPromotionActive: true,
                    promotionalPrice: true,
                    promotionStartDate: true,
                    promotionEndDate: true,
                    _count: {
                        select: { options: true }
                    }
                }
            })
            if (products.length !== productIds.length) throw new OrderValidationError(400, 'Some products are invalid or unavailable')
            const productMap = new Map(products.map((p) => [p.id, { ...p, hasVariants: (p as any)._count?.options > 0 }]))

            const variantsById = variantIds.length
                ? await prisma.productVariant.findMany({
                    where: { id: { in: variantIds }, tenantId, isActive: true },
                    select: {
                        id: true,
                        productId: true,
                        price: true,
                        promotionalPrice: true,
                        isPromotionActive: true,
                        promotionStartDate: true,
                        promotionEndDate: true,
                        showCountdown: true,
                        stock: true,
                        reserved: true,
                        safetyStock: true,
                        trackInventory: true
                    }
                })
                : []
            if (variantsById.length !== variantIds.length) throw new OrderValidationError(400, 'Some variants are invalid or unavailable')

            const defaultVariants = productIdsWithoutVariant.length
                ? await prisma.productVariant.findMany({
                    where: { tenantId, productId: { in: productIdsWithoutVariant }, isActive: true, optionValues: { none: {} } },
                    select: {
                        id: true,
                        productId: true,
                        price: true,
                        promotionalPrice: true,
                        isPromotionActive: true,
                        promotionStartDate: true,
                        promotionEndDate: true,
                        showCountdown: true,
                        stock: true,
                        reserved: true,
                        safetyStock: true,
                        trackInventory: true
                    }
                })
                : []

            const variantMap = new Map(variantsById.map((v) => [v.id, v]))
            const defaultVariantByProductId = new Map(defaultVariants.map((v) => [v.productId, v]))

            if (productIdsWithoutVariant.length > 0) {
                const optionRows = await prisma.productOption.findMany({
                    where: { tenantId, productId: { in: productIdsWithoutVariant } },
                    select: { productId: true },
                    distinct: ['productId']
                })
                const productsWithOptions = new Set(optionRows.map((r) => r.productId))

                for (const pid of productIdsWithoutVariant) {
                    if (defaultVariantByProductId.has(pid)) continue
                    if (productsWithOptions.has(pid)) continue

                    const product = productMap.get(pid)
                    if (!product) continue

                    const created = await prisma.productVariant.create({
                        data: {
                            tenantId,
                            productId: pid,
                            sku: suggestSkuFromProduct(product.slug, ''),
                            price: product.price,
                            stock: product.stock,
                            reserved: 0,
                            safetyStock: 0,
                            trackInventory: true,
                            isActive: true
                        }
                    })
                    defaultVariantByProductId.set(pid, created as any)
                }
            }

            const now = new Date()
            const activeBundleDeals = await prisma.productBundleDeal.findMany({
                where: {
                    tenantId,
                    productId: { in: productIds },
                    isActive: true,
                    AND: [
                        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
                        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }
                    ]
                },
                select: { productId: true, bundleQty: true, bundlePrice: true }
            })

            const bundleDealsByProductId = new Map<string, { bundleQty: number; bundlePrice: number }[]>()
            for (const d of activeBundleDeals) {
                const arr = bundleDealsByProductId.get(d.productId) ?? []
                arr.push({ bundleQty: d.bundleQty, bundlePrice: Number(d.bundlePrice) })
                bundleDealsByProductId.set(d.productId, arr)
            }

            validatedItems = normalizedItems.map((item) => {
                const product = productMap.get(item.productId)!
                const variant =
                    item.variantId
                        ? variantMap.get(item.variantId)
                        : defaultVariantByProductId.get(product.id)

                if (!variant || variant.productId !== product.id) {
                    throw new OrderValidationError(400, 'Variant selection is required for this product')
                }

                const price = buildScopedProductPricing(product as any, variant as any).effectivePrice

                const availableStock = variant.trackInventory
                    ? Math.max(variant.stock - variant.reserved - variant.safetyStock, 0)
                    : Number.POSITIVE_INFINITY
                const trackInventory = Boolean(variant.trackInventory)
                if (trackInventory && item.quantity > availableStock) {
                    throw new OrderValidationError(409, `Insufficient stock for ${product.title}`)
                }

                const unitPriceCents = moneyToCents(price)
                const bundleDeals = bundleDealsByProductId.get(product.id) ?? []
                const pricing = computeBestBundleTotal({
                    quantity: item.quantity,
                    unitPriceCents,
                    bundleDeals: bundleDeals.map((d) => ({
                        bundleQty: d.bundleQty,
                        bundlePriceCents: moneyToCents(d.bundlePrice)
                    }))
                })
                totalCents += pricing.bestTotalCents

                return {
                    productId: product.id,
                    variantId: variant.id,
                    quantity: item.quantity,
                    price,
                    lineTotal: centsToMoney(pricing.bestTotalCents),
                    pricingBreakdown: pricing,
                    trackInventory
                }
            })
        }

        await prisma.$transaction(async (tx) => {
            let resolvedNextCustomerId = nextCustomerId
            if (!resolvedNextCustomerId && nextCustomerPhone) {
                try {
                    const resolvedCustomer = await this.loyaltyLedger.ensureCustomerByPhone(tx, {
                        tenantId,
                        phone: nextCustomerPhone,
                        name: nextCustomerName,
                        address: nextCustomerAddress
                    })
                    resolvedNextCustomerId = resolvedCustomer?.id ?? null
                } catch (error) {
                    if (error instanceof PhoneNormalizationError) {
                        throw new OrderValidationError(error.statusCode, error.statusMessage)
                    }
                    throw error
                }
            }

            if (shouldUpdateItems) {
                await tx.orderItem.deleteMany({ where: { tenantId, orderId: id } })
                await tx.orderItem.createMany({
                    data: validatedItems.map((item) => ({
                        tenantId,
                        orderId: id,
                        productId: item.productId,
                        variantId: item.variantId,
                        quantity: item.quantity,
                        price: item.price,
                        lineTotal: item.lineTotal,
                        pricingBreakdown: item.pricingBreakdown as any
                    }))
                })

                await tx.productVariant.updateMany({
                    where: { tenantId, id: { in: validatedItems.map((i) => i.variantId) } },
                    data: { skuLocked: true }
                })

                for (const item of validatedItems) {
                    if (!item.trackInventory) continue
                    const current = await tx.productVariant.findFirst({
                        where: { id: item.variantId, tenantId },
                        select: { stock: true, reserved: true, safetyStock: true, trackInventory: true }
                    })
                    if (!current) throw new OrderValidationError(409, 'Insufficient stock')
                    if (current.trackInventory === false) continue
                    if (current.stock < item.quantity + current.reserved + current.safetyStock) {
                        throw new OrderValidationError(409, 'Insufficient stock')
                    }
                }
            }

            const updateData: any = {
                customerId: resolvedNextCustomerId,
                customerName: nextCustomerName,
                customerPhone: nextCustomerPhone,
                customerPhoneNormalized: normalizeCustomerPhoneForOrder(nextCustomerPhone),
                customerAddress: nextCustomerAddress,
                deliveryMode: nextDeliveryMode,
                shippingProvider: nextShippingProvider,
                shippingServiceLevel: nextShippingServiceLevel || null,
                shippingAmount: nextShippingAmount,
                shippingCurrency: nextShippingCurrency || null,
                shippingPickupPoint: nextShippingPickupPoint,
                shippingWilayaCode: nextShippingWilayaCode,
                shippingCommuneCode: nextShippingCommuneCode,
                shippingAddressLine1: nextShippingAddressLine1,
                shippingNotes: nextShippingNotes
            }
            const nextTotalAmount = shouldUpdateItems ? centsToMoney(totalCents) : existing.totalAmount
            updateData.totalAmount = nextTotalAmount

            updateData.totalWithShippingAmount = computeTotalWithShipping(nextTotalAmount, nextShippingAmount)

            const updated = await tx.order.updateMany({ where: { tenantId, id, status: 'PENDING' }, data: updateData })
            if (updated.count !== 1) throw new OrderValidationError(409, 'Order can no longer be edited')

            await tx.auditLog.create({
                data: {
                    action: 'order_edit_unconfirmed',
                    tenantId,
                    userId: actor?.userId ?? null,
                    targetId: id,
                    details: JSON.stringify({ editedItems: shouldUpdateItems })
                }
            })
        })

        return this.findById(tenantId, id)
    }

    async updateStatus(
        tenantId: string,
        id: string,
        status?: string,
        actor?: { userId?: string | null },
        opts?: {
            cashboxId?: string | null
            method?: string | null
            reference?: string | null
            note?: string | null
            callStatus?: string
            internalNotes?: string | null
            source?: 'admin' | 'carrier'
        }
    ) {
        if (status && !ORDER_STATUSES.includes(status as any)) {
            throw new OrderValidationError(400, 'Invalid status value')
        }

        const existing = await prisma.order.findFirst({
            where: { id, tenantId },
            include: { items: true, shipments: { select: { id: true, provider: true } } }
        })
        if (!existing) throw new OrderValidationError(404, 'Order not found')

        const fromStatus = existing.status
        const toStatus = status ?? existing.status
        const shouldUpdateStatus = status !== undefined && fromStatus !== toStatus

        if (!shouldUpdateStatus) {
            if (opts?.callStatus === undefined && opts?.internalNotes === undefined) {
                return prisma.order.findFirst({ where: { id, tenantId } })
            }
            const updateData: any = {}
            if (opts?.callStatus !== undefined) updateData.callStatus = opts.callStatus
            if (opts?.internalNotes !== undefined) updateData.internalNotes = opts.internalNotes

            await prisma.order.updateMany({ where: { tenantId, id }, data: updateData })
            return prisma.order.findFirst({ where: { id, tenantId } })
        }

        const provider = String((existing as any).shippingProvider || (Array.isArray((existing as any).shipments) && (existing as any).shipments.length > 0 ? (existing as any).shipments[0].provider : '') || '').toUpperCase()
        const isCarrierControlled = Boolean(provider) && provider !== 'SELF'
        if (opts?.source !== 'carrier' && isCarrierControlled && fromStatus !== 'PENDING') {
            throw new OrderValidationError(409, 'Order status is controlled by the delivery carrier and cannot be changed manually')
        }

        await prisma.$transaction(async (tx) => {
            const touchedProductIds = new Set<string>()
            const items = existing.items

            const legacyAlreadyDecremented =
                (await tx.inventoryMovement.count({ where: { tenantId, orderId: id, type: 'ORDER_DECREMENT' } })) > 0
            const legacyReservedAtPending =
                (await tx.inventoryMovement.count({ where: { tenantId, orderId: id, type: 'RESERVED_ADJUSTMENT' } })) >
                0

            const isTransitionAllowed = (() => {
                if (fromStatus === 'PENDING') return toStatus === 'CONFIRMED' || toStatus === 'CANCELLED'
                if (fromStatus === 'CONFIRMED') return toStatus === 'SHIPPED' || toStatus === 'CANCELLED'
                if (fromStatus === 'SHIPPED') return toStatus === 'DELIVERED' || toStatus === 'RETURNED'
                return false
            })()
            if (!isTransitionAllowed) {
                throw new OrderValidationError(400, `Invalid status transition: ${fromStatus} -> ${toStatus}`)
            }

            for (const item of items) {
                if (!item.variantId) continue

                const variantBefore = await tx.productVariant.findFirst({
                    where: { tenantId, id: item.variantId },
                    select: { id: true, productId: true, stock: true, reserved: true, safetyStock: true, trackInventory: true }
                })
                if (!variantBefore) continue
                if (variantBefore.trackInventory === false) continue

                const qty = item.quantity

                // PENDING -> CONFIRMED : reserve (unless this order already reserved in older versions)
                if (fromStatus === 'PENDING' && toStatus === 'CONFIRMED') {
                    if (legacyAlreadyDecremented || legacyReservedAtPending) {
                        // Don't double-apply inventory for old orders.
                        continue
                    }

                    if (variantBefore.stock < variantBefore.reserved + variantBefore.safetyStock + qty) {
                        throw new OrderValidationError(409, 'Insufficient stock')
                    }

                    const result = await tx.productVariant.updateMany({
                        where: {
                            tenantId,
                            id: item.variantId,
                            stock: variantBefore.stock,
                            reserved: variantBefore.reserved,
                            safetyStock: variantBefore.safetyStock
                        },
                        data: { reserved: { increment: qty } }
                    })
                    if (result.count !== 1) throw new OrderValidationError(409, 'Inventory conflict, please retry')
                    touchedProductIds.add(variantBefore.productId)

                    const after = await tx.productVariant.findFirst({
                        where: { tenantId, id: item.variantId },
                        select: { stock: true, reserved: true, safetyStock: true }
                    })

                    await tx.inventoryMovement.create({
                        data: {
                            tenantId,
                            variantId: item.variantId,
                            type: 'RESERVED_ADJUSTMENT',
                            delta: 0,
                            reservedDelta: qty,
                            safetyStockDelta: 0,
                            reason: 'order_confirm',
                            note: null,
                            orderId: id,
                            stockAfter: after?.stock ?? null,
                            reservedAfter: after?.reserved ?? null,
                            safetyStockAfter: after?.safetyStock ?? null,
                            createdByUserId: null
                        }
                    })
                }

                // CONFIRMED -> SHIPPED : decrement stock and release reserved.
                if (fromStatus === 'CONFIRMED' && toStatus === 'SHIPPED') {
                    if (legacyAlreadyDecremented) {
                        // If stock was already decremented in legacy flows, only release reserved if present.
                        if (variantBefore.reserved >= qty) {
                            await tx.productVariant.updateMany({
                                where: { tenantId, id: item.variantId, reserved: variantBefore.reserved },
                                data: { reserved: { decrement: qty } }
                            })
                            touchedProductIds.add(variantBefore.productId)
                        }
                        continue
                    }

                    if (variantBefore.reserved < qty) throw new OrderValidationError(409, 'Insufficient reserved stock')
                    if (variantBefore.stock < qty) throw new OrderValidationError(409, 'Insufficient stock')
                    if (variantBefore.stock < variantBefore.reserved + variantBefore.safetyStock) {
                        throw new OrderValidationError(409, 'Inventory invariant violated')
                    }

                    const result = await tx.productVariant.updateMany({
                        where: {
                            tenantId,
                            id: item.variantId,
                            stock: variantBefore.stock,
                            reserved: variantBefore.reserved,
                            safetyStock: variantBefore.safetyStock
                        },
                        data: { stock: { decrement: qty }, reserved: { decrement: qty } }
                    })
                    if (result.count !== 1) throw new OrderValidationError(409, 'Inventory conflict, please retry')
                    touchedProductIds.add(variantBefore.productId)

                    const after = await tx.productVariant.findFirst({
                        where: { tenantId, id: item.variantId },
                        select: { stock: true, reserved: true, safetyStock: true }
                    })

                    await tx.inventoryMovement.create({
                        data: {
                            tenantId,
                            variantId: item.variantId,
                            type: 'ORDER_DECREMENT',
                            delta: -qty,
                            reservedDelta: -qty,
                            safetyStockDelta: 0,
                            reason: 'order_ship',
                            note: null,
                            orderId: id,
                            stockAfter: after?.stock ?? null,
                            reservedAfter: after?.reserved ?? null,
                            safetyStockAfter: after?.safetyStock ?? null,
                            createdByUserId: null
                        }
                    })
                }

                // CONFIRMED -> CANCELLED : release reserved.
                if (fromStatus === 'CONFIRMED' && toStatus === 'CANCELLED') {
                    if (variantBefore.reserved < qty) throw new OrderValidationError(409, 'Insufficient reserved stock')

                    const result = await tx.productVariant.updateMany({
                        where: {
                            tenantId,
                            id: item.variantId,
                            stock: variantBefore.stock,
                            reserved: variantBefore.reserved,
                            safetyStock: variantBefore.safetyStock
                        },
                        data: { reserved: { decrement: qty } }
                    })
                    if (result.count !== 1) throw new OrderValidationError(409, 'Inventory conflict, please retry')
                    touchedProductIds.add(variantBefore.productId)

                    const after = await tx.productVariant.findFirst({
                        where: { tenantId, id: item.variantId },
                        select: { stock: true, reserved: true, safetyStock: true }
                    })

                    await tx.inventoryMovement.create({
                        data: {
                            tenantId,
                            variantId: item.variantId,
                            type: 'RESERVED_ADJUSTMENT',
                            delta: 0,
                            reservedDelta: -qty,
                            safetyStockDelta: 0,
                            reason: 'order_cancel',
                            note: null,
                            orderId: id,
                            stockAfter: after?.stock ?? null,
                            reservedAfter: after?.reserved ?? null,
                            safetyStockAfter: after?.safetyStock ?? null,
                            createdByUserId: null
                        }
                    })
                }

                // PENDING -> CANCELLED : normally nothing; but if legacy reserved-at-pending or legacy decrement existed, undo it.
                if (fromStatus === 'PENDING' && toStatus === 'CANCELLED') {
                    if (legacyReservedAtPending && variantBefore.reserved >= qty) {
                        const result = await tx.productVariant.updateMany({
                            where: { tenantId, id: item.variantId, reserved: variantBefore.reserved },
                            data: { reserved: { decrement: qty } }
                        })
                        if (result.count !== 1) throw new OrderValidationError(409, 'Inventory conflict, please retry')
                        touchedProductIds.add(variantBefore.productId)

                        const after = await tx.productVariant.findFirst({
                            where: { tenantId, id: item.variantId },
                            select: { stock: true, reserved: true, safetyStock: true }
                        })

                        await tx.inventoryMovement.create({
                            data: {
                                tenantId,
                                variantId: item.variantId,
                                type: 'RESERVED_ADJUSTMENT',
                                delta: 0,
                                reservedDelta: -qty,
                                safetyStockDelta: 0,
                                reason: 'order_cancel',
                                note: 'legacy_pending_reserved_release',
                                orderId: id,
                                stockAfter: after?.stock ?? null,
                                reservedAfter: after?.reserved ?? null,
                                safetyStockAfter: after?.safetyStock ?? null,
                                createdByUserId: null
                            }
                        })
                    }

                    if (legacyAlreadyDecremented) {
                        const result = await tx.productVariant.updateMany({
                            where: { tenantId, id: item.variantId, stock: variantBefore.stock },
                            data: { stock: { increment: qty } }
                        })
                        if (result.count !== 1) throw new OrderValidationError(409, 'Inventory conflict, please retry')
                        touchedProductIds.add(variantBefore.productId)

                        const after = await tx.productVariant.findFirst({
                            where: { tenantId, id: item.variantId },
                            select: { stock: true, reserved: true, safetyStock: true }
                        })

                        await tx.inventoryMovement.create({
                            data: {
                                tenantId,
                                variantId: item.variantId,
                                type: 'MANUAL_ADJUSTMENT',
                                delta: qty,
                                reservedDelta: 0,
                                safetyStockDelta: 0,
                                reason: 'order_cancel_restock',
                                note: 'legacy_pending_order_restock',
                                orderId: id,
                                stockAfter: after?.stock ?? null,
                                reservedAfter: after?.reserved ?? null,
                                safetyStockAfter: after?.safetyStock ?? null,
                                createdByUserId: null
                            }
                        })
                    }
                }

                // SHIPPED -> RETURNED : restock.
                if (fromStatus === 'SHIPPED' && toStatus === 'RETURNED') {
                    const result = await tx.productVariant.updateMany({
                        where: { tenantId, id: item.variantId, stock: variantBefore.stock },
                        data: { stock: { increment: qty } }
                    })
                    if (result.count !== 1) throw new OrderValidationError(409, 'Inventory conflict, please retry')
                    touchedProductIds.add(variantBefore.productId)

                    const after = await tx.productVariant.findFirst({
                        where: { tenantId, id: item.variantId },
                        select: { stock: true, reserved: true, safetyStock: true }
                    })

                    await tx.inventoryMovement.create({
                        data: {
                            tenantId,
                            variantId: item.variantId,
                            type: 'MANUAL_ADJUSTMENT',
                            delta: qty,
                            reservedDelta: 0,
                            safetyStockDelta: 0,
                            reason: 'order_return',
                            note: null,
                            orderId: id,
                            stockAfter: after?.stock ?? null,
                            reservedAfter: after?.reserved ?? null,
                            safetyStockAfter: after?.safetyStock ?? null,
                            createdByUserId: null
                        }
                    })
                }
            }

            await syncProductStockForProducts(tx as any, tenantId, Array.from(touchedProductIds))

            if (toStatus === 'CANCELLED' || toStatus === 'RETURNED') {
                await this.loyaltyLedger.cancelPendingOrderRedemption(tx, tenantId, id)
            }

            if (fromStatus === 'SHIPPED' && toStatus === 'DELIVERED') {
                let resolvedCustomerId = existing.customerId ?? null
                if (existing.customerPhone) {
                    try {
                        const resolvedCustomer = await this.loyaltyLedger.ensureCustomerByPhone(tx, {
                            tenantId,
                            phone: existing.customerPhone,
                            name: existing.customerName,
                            address: existing.customerAddress ?? null
                        })
                        resolvedCustomerId = resolvedCustomer?.id ?? resolvedCustomerId
                    } catch (error) {
                        if (error instanceof PhoneNormalizationError) {
                            throw new OrderValidationError(error.statusCode, error.statusMessage)
                        }
                        throw error
                    }
                }

                if (resolvedCustomerId && resolvedCustomerId !== existing.customerId) {
                    await tx.order.updateMany({
                        where: { tenantId, id },
                        data: { customerId: resolvedCustomerId }
                    })
                }

                const sale = await this.ensureDeliveredOrderSale(
                    tx,
                    tenantId,
                    {
                        id: existing.id,
                        tenantId: existing.tenantId,
                        totalAmount:
                            typeof (existing as any).totalWithShippingAmount === 'number' && Number.isFinite((existing as any).totalWithShippingAmount)
                                ? (existing as any).totalWithShippingAmount
                                : computeTotalWithShipping(existing.totalAmount, (existing as any).shippingAmount ?? null),
                        customerId: resolvedCustomerId,
                        customerName: existing.customerName,
                        customerPhone: existing.customerPhone,
                        customerAddress: existing.customerAddress ?? null,
                        earnedPointsTotal: existing.earnedPointsTotal ?? 0,
                        redeemedPointsTotal: existing.redeemedPointsTotal ?? 0,
                        redeemedAmount: existing.redeemedAmount ?? 0,
                        items: items.map((i: any) => ({
                            productId: i.productId,
                            variantId: i.variantId ?? null,
                            quantity: i.quantity,
                            price: i.price
                        }))
                    },
                    actor
                )

                await this.loyaltyLedger.consumePendingOrderRedemption(tx, {
                    tenantId,
                    orderId: existing.id,
                    saleId: sale.id
                })

                const loyaltySettings = await tx.storeSettings.findUnique({
                    where: { tenantId },
                    select: {
                        loyaltyEnabled: true,
                        loyaltyBasePoints: true,
                        loyaltyMarginFactor: true,
                        loyaltyPublicFormulaMode: true,
                        currencyCode: true
                    }
                })

                if (loyaltySettings?.loyaltyEnabled === true && resolvedCustomerId) {
                    const productIds = Array.from(new Set(items.map((item) => item.productId)))
                    const variantIds = Array.from(
                        new Set(items.map((item) => item.variantId).filter((variantId): variantId is string => !!variantId))
                    )
                    const [products, variants] = await Promise.all([
                        tx.product.findMany({
                            where: { tenantId, id: { in: productIds } },
                            select: { id: true, price: true }
                        }),
                        variantIds.length > 0
                            ? tx.productVariant.findMany({
                                where: { tenantId, id: { in: variantIds } },
                                select: { id: true, price: true, cost: true, productId: true }
                            })
                            : Promise.resolve([])
                    ])

                    const productPriceById = new Map(products.map((product) => [product.id, Number(product.price ?? 0)]))
                    const variantById = new Map(variants.map((variant) => [variant.id, variant]))
                    const earnPreview = this.loyaltyFormula.computeTotal(
                        loyaltySettings,
                        items.map((item) => ({
                            quantity: item.quantity,
                            referencePrice: item.variantId
                                ? Number(variantById.get(item.variantId)?.price ?? item.price ?? 0)
                                : Number(productPriceById.get(item.productId) ?? item.price ?? 0),
                            cost: Number(item.variantId ? variantById.get(item.variantId)?.cost ?? 0 : 0)
                        }))
                    )

                    if (earnPreview.totalPoints !== 0) {
                        await this.loyaltyLedger.createLedgerEntry(tx, {
                            tenantId,
                            customerId: resolvedCustomerId,
                            direction: 'EARN',
                            status: 'AVAILABLE',
                            sourceType: 'SALE',
                            sourceId: sale.id,
                            saleId: sale.id,
                            orderId: existing.id,
                            points: earnPreview.totalPoints,
                            createdByUserId: actor?.userId ?? null,
                            formulaSnapshot: {
                                lines: earnPreview.lines,
                                orderId: existing.id
                            }
                        })
                    }
                }

                const storeSettings = await tx.storeSettings.findUnique({
                    where: { tenantId },
                    select: { currencyCode: true }
                })
                const currency = (storeSettings?.currencyCode || 'DZD').toUpperCase()

                const method = typeof opts?.method === 'string' && opts.method.trim() ? opts.method.trim().toUpperCase() : 'CASH'
                const reference = typeof opts?.reference === 'string' && opts.reference.trim() ? opts.reference.trim().slice(0, 64) : null
                const note = typeof opts?.note === 'string' && opts.note.trim() ? opts.note.trim().slice(0, 500) : 'Order delivered payment'

                const amountNumber =
                    typeof (existing as any).totalWithShippingAmount === 'number' && Number.isFinite((existing as any).totalWithShippingAmount)
                        ? (existing as any).totalWithShippingAmount
                        : computeTotalWithShipping(existing.totalAmount, (existing as any).shippingAmount ?? null)
                const amount = new Prisma.Decimal(String(amountNumber || 0))
                if (!amount.isFinite() || amount.lte(0)) throw new OrderValidationError(400, 'Order total must be > 0')

                try {
                    await cashService.createTransactionInTx(
                        tx,
                        tenantId,
                        {
                            cashboxId: opts?.cashboxId ?? null,
                            type: 'SALE_PAYMENT',
                            direction: 'IN',
                            amount: amount.toString(),
                            currency,
                            method,
                            customerId: resolvedCustomerId,
                            saleId: sale.id,
                            orderId: existing.id,
                            reference,
                            note
                        },
                        actor
                    )
                } catch (error) {
                    if (error instanceof CashValidationError) {
                        throw new OrderValidationError(error.statusCode, error.statusMessage, {
                            code: error.code,
                            meta: error.meta
                        })
                    }
                    throw error
                }
            }

            const updateData: any = { status: toStatus }
            if (opts?.callStatus !== undefined) updateData.callStatus = opts.callStatus
            if (opts?.internalNotes !== undefined) updateData.internalNotes = opts.internalNotes

            const updated = await tx.order.updateMany({ where: { tenantId, id }, data: updateData })
            if (updated.count !== 1) throw new OrderValidationError(404, 'Order not found')
        })

        return prisma.order.findFirst({ where: { id, tenantId } })
    }

    async rollbackCarrierConfirmation(tenantId: string, id: string) {
        const existing = await prisma.order.findFirst({
            where: { id, tenantId },
            include: { items: true }
        })
        if (!existing) throw new OrderValidationError(404, 'Order not found')
        if (existing.status !== 'CONFIRMED') {
            throw new OrderValidationError(409, 'Only confirmed orders can be rolled back to pending')
        }

        await prisma.$transaction(async (tx) => {
            const touchedProductIds = new Set<string>()
            const items = existing.items
            const legacyAlreadyDecremented =
                (await tx.inventoryMovement.count({ where: { tenantId, orderId: id, type: 'ORDER_DECREMENT' } })) > 0
            const confirmReservationApplied =
                (await tx.inventoryMovement.count({
                    where: { tenantId, orderId: id, type: 'RESERVED_ADJUSTMENT', reason: 'order_confirm' }
                })) > 0

            for (const item of items) {
                if (!item.variantId) continue
                if (legacyAlreadyDecremented || !confirmReservationApplied) continue

                const variantBefore = await tx.productVariant.findFirst({
                    where: { tenantId, id: item.variantId },
                    select: { id: true, productId: true, stock: true, reserved: true, safetyStock: true, trackInventory: true }
                })
                if (!variantBefore) continue
                if (variantBefore.trackInventory === false) continue

                const qty = item.quantity
                if (variantBefore.reserved < qty) throw new OrderValidationError(409, 'Insufficient reserved stock')

                const result = await tx.productVariant.updateMany({
                    where: {
                        tenantId,
                        id: item.variantId,
                        stock: variantBefore.stock,
                        reserved: variantBefore.reserved,
                        safetyStock: variantBefore.safetyStock
                    },
                    data: { reserved: { decrement: qty } }
                })
                if (result.count !== 1) throw new OrderValidationError(409, 'Inventory conflict, please retry')
                touchedProductIds.add(variantBefore.productId)

                const after = await tx.productVariant.findFirst({
                    where: { tenantId, id: item.variantId },
                    select: { stock: true, reserved: true, safetyStock: true }
                })

                await tx.inventoryMovement.create({
                    data: {
                        tenantId,
                        variantId: item.variantId,
                        type: 'RESERVED_ADJUSTMENT',
                        delta: 0,
                        reservedDelta: -qty,
                        safetyStockDelta: 0,
                        reason: 'order_confirm_rollback',
                        note: 'carrier_sync_failed',
                        orderId: id,
                        stockAfter: after?.stock ?? null,
                        reservedAfter: after?.reserved ?? null,
                        safetyStockAfter: after?.safetyStock ?? null,
                        createdByUserId: null
                    }
                })
            }

            await syncProductStockForProducts(tx as any, tenantId, Array.from(touchedProductIds))

            const updated = await tx.order.updateMany({
                where: { tenantId, id, status: 'CONFIRMED' },
                data: { status: 'PENDING' }
            })
            if (updated.count !== 1) throw new OrderValidationError(409, 'Order rollback conflict, please retry')
        })

        return prisma.order.findFirst({ where: { id, tenantId } })
    }

    async applyCarrierStatus(tenantId: string, orderId: string, toStatus: string, actor?: { userId?: string | null }) {
        if (!ORDER_STATUSES.includes(toStatus as any)) {
            throw new OrderValidationError(400, 'Invalid status value')
        }

        const existing = await prisma.order.findFirst({
            where: { tenantId, id: orderId },
            select: { id: true, status: true }
        })
        if (!existing) return null
        if (existing.status === toStatus) return prisma.order.findFirst({ where: { tenantId, id: orderId } })

        const planSequence = (from: string, to: string) => {
            if (from === to) return []
            if (to === 'CONFIRMED') return ['CONFIRMED']
            if (to === 'SHIPPED') return from === 'PENDING' ? ['CONFIRMED', 'SHIPPED'] : ['SHIPPED']
            if (to === 'DELIVERED') {
                if (from === 'PENDING') return ['CONFIRMED', 'SHIPPED', 'DELIVERED']
                if (from === 'CONFIRMED') return ['SHIPPED', 'DELIVERED']
                return ['DELIVERED']
            }
            if (to === 'RETURNED') {
                if (from === 'PENDING') return ['CONFIRMED', 'SHIPPED', 'RETURNED']
                if (from === 'CONFIRMED') return ['SHIPPED', 'RETURNED']
                return ['RETURNED']
            }
            if (to === 'CANCELLED') return ['CANCELLED']
            return [to]
        }

        const sequence = planSequence(existing.status, toStatus)
        for (const status of sequence) {
            await this.updateStatus(tenantId, orderId, status, actor, { source: 'carrier' })
        }

        return prisma.order.findFirst({ where: { tenantId, id: orderId } })
    }

    async createPublicOrder(input: PublicOrderInput, subscription?: SubscriptionContext | null) {
        if (subscription) {
            const plan = getPlanByCode(subscription.planCode as any) ?? getPlanByCode('basic')
            const limit = plan?.ordersPerMonth ?? 0

            const periodStart = subscription.currentPeriodStart
            const periodEnd =
                subscription.currentPeriodEnd ??
                (subscription.interval === 'year' ? addUtcYears(periodStart, 1) : addUtcMonths(periodStart, 1))

            const ordersInPeriod = await prisma.order.count({
                where: {
                    tenantId: input.tenantId,
                    createdAt: { gte: periodStart, lt: periodEnd }
                }
            })

            if (limit > 0 && ordersInPeriod >= limit) {
                throw new OrderValidationError(
                    429,
                    `Monthly order limit reached (${ordersInPeriod}/${limit}). Upgrade your plan to accept more orders.`
                )
            }
        }

        const customerName = (input.customerName || '').trim()
        const customerPhone = (input.customerPhone || '').trim()
        const deliveryMode = normalizeDeliveryMode(input.deliveryMode)

        if (!customerPhone) {
            throw new OrderValidationError(400, 'Customer phone is required')
        }

        if (!customerName) {
            throw new OrderValidationError(400, 'Customer name is required')
        }

        const normalizedItems = this.normalizePublicOrderItems(input.items)

        const shippingServiceLevel =
            input.shippingServiceLevel == null ? null : String(input.shippingServiceLevel || '').trim()
        if (shippingServiceLevel && shippingServiceLevel.length > 64) {
            throw new OrderValidationError(400, 'shippingServiceLevel is too long')
        }

        const shippingCurrency =
            input.shippingCurrency == null ? null : String(input.shippingCurrency || '').trim().toUpperCase()
        if (shippingCurrency && shippingCurrency.length > 8) {
            throw new OrderValidationError(400, 'shippingCurrency is too long')
        }

        const shippingAmount =
            input.shippingAmount == null ? null : Number((input as any).shippingAmount)
        if (shippingAmount != null && (!Number.isFinite(shippingAmount) || shippingAmount < 0)) {
            throw new OrderValidationError(400, 'shippingAmount must be a positive number')
        }

        const { storeSettings, validatedItems, totalAmount } = await this.preparePublicOrderItems(input.tenantId, normalizedItems)

        if (storeSettings.cartEnabled === false) {
            throw new OrderValidationError(403, 'Checkout is disabled for this store')
        }

        if (storeSettings.codEnabled === false) {
            throw new OrderValidationError(403, 'Cash on delivery is disabled for this store')
        }

        if (deliveryMode === 'store' && storeSettings.storePickupEnabled !== true) {
            throw new OrderValidationError(403, 'Store pickup is disabled for this store')
        }

        const minimumOrderAmountDzdRaw = Number((storeSettings as any).minimumOrderAmountDzd ?? 1000)
        const minimumOrderAmountDzd =
            Number.isFinite(minimumOrderAmountDzdRaw) && minimumOrderAmountDzdRaw >= 0
                ? Math.trunc(minimumOrderAmountDzdRaw)
                : 1000
        const hideOptionalAddress = (storeSettings as any).hideOptionalAddress !== false

        // Validate and normalize shippingProvider
        let shippingProvider = null
        if (input.shippingProvider) {
            const providerUpper = input.shippingProvider.toUpperCase()
            const validProviders = ['MAYSTRO', 'YALIDINE', 'SELF']
            if (validProviders.includes(providerUpper)) {
                shippingProvider = providerUpper as any
            }
        }

        if (deliveryMode === 'store') {
            shippingProvider = null
        }

        const shippingPickupPoint = await this.resolveShippingPickupPoint({
            tenantId: input.tenantId,
            shippingProvider,
            deliveryMode,
            shippingCommuneCode: input.shippingCommuneCode,
            rawPickupPoint: input.shippingPickupPoint
        })

        const effectiveShippingAmount = deliveryMode === 'store' ? 0 : shippingAmount
        if (minimumOrderAmountDzd > 0 && totalAmount < minimumOrderAmountDzd) {
            throw new OrderValidationError(
                400,
                `Minimum order amount is ${minimumOrderAmountDzd} DZD`,
                {
                    code: 'MIN_ORDER_AMOUNT_NOT_MET',
                    meta: { minimumOrderAmountDzd, currentOrderAmountDzd: totalAmount }
                }
            )
        }

        const normalizedCustomerAddress = hideOptionalAddress ? null : (input.customerAddress || null)
        const normalizedShippingAddressLine1 = hideOptionalAddress
            ? null
            : (input.shippingAddressLine1 || input.customerAddress || null)

        const pointsPreview = this.loyaltyFormula.computeTotal(
            storeSettings,
            validatedItems.map((item) => ({
                quantity: item.quantity,
                referencePrice: item.referencePrice,
                cost: item.variantCost
            }))
        )
        const orderIdPrefix = normalizeOrderIdPrefix((storeSettings as any).orderIdPrefix)

        const orderResult = await prisma.$transaction(async (tx) => {
            let resolvedCustomer
            try {
                resolvedCustomer = await this.loyaltyLedger.ensureCustomerByPhone(tx, {
                    tenantId: input.tenantId,
                    phone: customerPhone,
                    name: customerName,
                    address: normalizedCustomerAddress
                })
            } catch (error) {
                if (error instanceof PhoneNormalizationError) {
                    throw new OrderValidationError(error.statusCode, error.statusMessage)
                }
                throw error
            }

            let redemption
            try {
                redemption = await this.loyaltyCheckout.evaluateRedemption(tx, {
                    tenantId: input.tenantId,
                    customerId: resolvedCustomer?.id ?? null,
                    requestedPoints: input.redeemPointsRequested,
                    itemsSubtotal: totalAmount,
                    settings: storeSettings
                })
            } catch (error) {
                if (error instanceof LoyaltyCheckoutError) {
                    throw new OrderValidationError(error.statusCode, error.statusMessage)
                }
                throw error
            }

            const payableItemsTotal = Math.max(0, Number((totalAmount - redemption.redeemedAmount).toFixed(2)))
            const totalWithShippingAmount = computeTotalWithShipping(payableItemsTotal, effectiveShippingAmount)
            const publicId = await this.generateUniquePublicId(tx, input.tenantId, orderIdPrefix)
            const createdOrder = await tx.order.create({
                data: {
                    tenantId: input.tenantId,
                    publicId,
                    customerId: resolvedCustomer?.id ?? null,
                    customerName,
                    customerPhone,
                    customerPhoneNormalized: resolvedCustomer?.phoneNormalized ?? normalizeCustomerPhoneForOrder(customerPhone),
                    customerAddress: normalizedCustomerAddress,
                    deliveryMode,
                    shippingProvider,
                    shippingWilayaCode: input.shippingWilayaCode || null,
                    shippingCommuneCode: input.shippingCommuneCode || null,
                    shippingServiceLevel: shippingServiceLevel || null,
                    shippingAmount: effectiveShippingAmount,
                    shippingCurrency: shippingCurrency || undefined,
                    shippingAddressLine1: normalizedShippingAddressLine1,
                    shippingNotes: input.shippingNotes || null,
                    shippingPickupPoint: shippingPickupPoint ?? undefined,
                    totalAmount,
                    totalWithShippingAmount,
                    earnedPointsTotal: pointsPreview.totalPoints,
                    redeemedPointsTotal: redemption.pointsReserved,
                    redeemedAmount: redemption.redeemedAmount,
                    status: 'PENDING',
                    readAt: null
                }
            })

            await tx.orderItem.createMany({
                data: validatedItems.map((item) => ({
                    tenantId: input.tenantId,
                    orderId: createdOrder.id,
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity,
                    price: item.price,
                    lineTotal: item.lineTotal,
                    pricingBreakdown: item.pricingBreakdown as any
                }))
            })

            await tx.productVariant.updateMany({
                where: { tenantId: input.tenantId, id: { in: validatedItems.map((i) => i.variantId) } },
                data: { skuLocked: true }
            })

            for (const item of validatedItems) {
                if (item.trackInventory !== false) {
                    // COD flow: no inventory change at PENDING. Reserve at CONFIRMED, decrement at SHIPPED.
                    const current = await tx.productVariant.findFirst({
                        where: { id: item.variantId, tenantId: input.tenantId },
                        select: { stock: true, reserved: true, safetyStock: true, trackInventory: true }
                    })
                    if (!current) throw new OrderValidationError(409, 'Insufficient stock')
                    if (current.trackInventory === false) continue
                    if (current.stock < item.quantity + current.reserved + current.safetyStock) {
                        throw new OrderValidationError(409, 'Insufficient stock')
                    }
                }
            }

            if (redemption.pointsReserved > 0 && resolvedCustomer?.id) {
                await this.loyaltyCheckout.createPendingOrderRedemption(tx, {
                    tenantId: input.tenantId,
                    customerId: resolvedCustomer.id,
                    orderId: createdOrder.id,
                    pointsReserved: redemption.pointsReserved,
                    redeemedAmount: redemption.redeemedAmount,
                    rateDzdPerPoint: Number(storeSettings.loyaltyRedeemRateDzdPerPoint || 0)
                })
            }

            return {
                createdOrder,
                loyaltySummary: this.buildLoyaltyResponse({
                    availablePoints: redemption.availablePoints - redemption.pointsReserved,
                    pendingRedeemPoints: redemption.pendingRedeemPoints + redemption.pointsReserved,
                    basePointsToEarn: pointsPreview.basePointsTotal,
                    productPointsToEarn: pointsPreview.productPointsTotal,
                    totalPointsToEarn: pointsPreview.totalPoints,
                    redeemedPoints: redemption.pointsReserved,
                    redeemedAmount: redemption.redeemedAmount
                })
            }
        })

        // Fire and forget notification
        const finalOrder = await prisma.order.findFirst({
            where: { id: orderResult.createdOrder.id, tenantId: input.tenantId },
            include: {
                items: {
                    include: { product: true, variant: true }
                }
            }
        })

        if (finalOrder) {
            telegramService.sendOrderNotification(input.tenantId, finalOrder).catch(console.error)
            notificationsService.emitOrderCreated(input.tenantId, finalOrder.id).catch(console.error)
        }

        return {
            order: finalOrder,
            loyaltySummary: orderResult.loyaltySummary
        }
    }

    async createAdminOrder(tenantId: string, input: AdminOrderInput, actor?: { userId?: string | null }) {
        // No subscription limit checks for admin order creation.

        const customerName = (input.customerName || '').trim()
        const customerPhone = (input.customerPhone || '').trim()
        const deliveryMode = normalizeDeliveryMode(input.deliveryMode)

        // For admin orders, we can make customer info optional if they just want to create a quick order,
        // but typically an order has a customer. Let's enforce name if phone is missing, or vice versa,
        // or just let them create empty ones if they really want, but let's stick to requiring name for now.
        if (!customerName && !input.customerId) {
            throw new OrderValidationError(400, 'Customer name or existing customer is required')
        }

        if (!Array.isArray(input.items) || input.items.length === 0) {
            throw new OrderValidationError(400, 'At least one item is required')
        }

        const normalizedItems = input.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId || undefined,
            quantity: Number(item.quantity || 0)
        }))

        normalizedItems.forEach((item) => {
            if (!item.productId) {
                throw new OrderValidationError(400, 'Product ID is required for each item')
            }
            if (!Number.isFinite(item.quantity) || item.quantity < 1) {
                throw new OrderValidationError(400, 'Quantity must be at least 1')
            }
        })

        const shippingServiceLevel =
            input.shippingServiceLevel == null ? null : String(input.shippingServiceLevel || '').trim()
        if (shippingServiceLevel && shippingServiceLevel.length > 64) {
            throw new OrderValidationError(400, 'shippingServiceLevel is too long')
        }

        const shippingCurrency =
            input.shippingCurrency == null ? null : String(input.shippingCurrency || '').trim().toUpperCase()
        if (shippingCurrency && shippingCurrency.length > 8) {
            throw new OrderValidationError(400, 'shippingCurrency is too long')
        }

        const shippingAmount =
            input.shippingAmount == null ? null : Number((input as any).shippingAmount)
        if (shippingAmount != null && (!Number.isFinite(shippingAmount) || shippingAmount < 0)) {
            throw new OrderValidationError(400, 'shippingAmount must be a positive number')
        }

        const storeSettings = await prisma.storeSettings.upsert({
            where: { tenantId },
            create: { tenantId },
            update: {}
        })

        if (deliveryMode === 'store' && storeSettings.storePickupEnabled !== true) {
            throw new OrderValidationError(403, 'Store pickup is disabled for this store')
        }

        const hideOptionalAddress = (storeSettings as any).hideOptionalAddress !== false

        const productIds = Array.from(new Set(normalizedItems.map((item) => item.productId)))
        const variantIds = Array.from(
            new Set(
                normalizedItems
                    .map((item) => item.variantId)
                    .filter((v): v is string => typeof v === 'string' && v.length > 0)
            )
        )
        const productIdsWithoutVariant = Array.from(
            new Set(normalizedItems.filter((item) => !item.variantId).map((item) => item.productId))
        )

        const products = await prisma.product.findMany({
            where: { id: { in: productIds }, tenantId: input.tenantId, isActive: true },
            select: {
                id: true,
                slug: true,
                price: true,
                title: true,
                stock: true,
                isPromotionActive: true,
                promotionalPrice: true,
                promotionStartDate: true,
                promotionEndDate: true,
                _count: {
                    select: { options: true }
                }
            }
        })

        if (products.length !== productIds.length) {
            throw new OrderValidationError(400, 'Some products are invalid or unavailable')
        }

        const productMap = new Map(products.map((p) => [p.id, { ...p, hasVariants: (p as any)._count?.options > 0 }]))

        const variantsById = variantIds.length
            ? await prisma.productVariant.findMany({
                where: { id: { in: variantIds }, tenantId: input.tenantId, isActive: true },
                select: {
                    id: true,
                    productId: true,
                    price: true,
                    promotionalPrice: true,
                    isPromotionActive: true,
                    promotionStartDate: true,
                    promotionEndDate: true,
                    showCountdown: true,
                    cost: true,
                    stock: true,
                    reserved: true,
                    safetyStock: true,
                    trackInventory: true
                }
            })
            : []

        if (variantsById.length !== variantIds.length) {
            throw new OrderValidationError(400, 'Some variants are invalid or unavailable')
        }

        const defaultVariants = productIdsWithoutVariant.length
            ? await prisma.productVariant.findMany({
                where: {
                    tenantId: input.tenantId,
                    productId: { in: productIdsWithoutVariant },
                    isActive: true,
                    optionValues: { none: {} }
                },
                select: {
                    id: true,
                    productId: true,
                    price: true,
                    promotionalPrice: true,
                    isPromotionActive: true,
                    promotionStartDate: true,
                    promotionEndDate: true,
                    showCountdown: true,
                    cost: true,
                    stock: true,
                    reserved: true,
                    safetyStock: true,
                    trackInventory: true
                }
            })
            : []

        const variantMap = new Map(variantsById.map((v) => [v.id, v]))
        const defaultVariantByProductId = new Map(defaultVariants.map((v) => [v.productId, v]))

        if (productIdsWithoutVariant.length > 0) {
            const optionRows = await prisma.productOption.findMany({
                where: { tenantId: input.tenantId, productId: { in: productIdsWithoutVariant } },
                select: { productId: true },
                distinct: ['productId']
            })
            const productsWithOptions = new Set(optionRows.map((r) => r.productId))

            for (const pid of productIdsWithoutVariant) {
                if (defaultVariantByProductId.has(pid)) continue
                if (productsWithOptions.has(pid)) continue

                const product = productMap.get(pid)
                if (!product) continue

                const created = await prisma.productVariant.create({
                    data: {
                        tenantId: input.tenantId,
                        productId: pid,
                        sku: suggestSkuFromProduct(product.slug, ''),
                        price: product.price,
                        stock: product.stock,
                        reserved: 0,
                        safetyStock: 0,
                        trackInventory: true,
                        isActive: true
                    }
                })
                defaultVariantByProductId.set(pid, created as any)
            }
        }

        const now = new Date()
        const activeBundleDeals = await prisma.productBundleDeal.findMany({
            where: {
                tenantId: input.tenantId,
                productId: { in: productIds },
                isActive: true,
                AND: [
                    { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
                    { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }
                ]
            },
            select: { productId: true, bundleQty: true, bundlePrice: true }
        })

        const bundleDealsByProductId = new Map<string, { bundleQty: number; bundlePrice: number }[]>()
        for (const d of activeBundleDeals) {
            const arr = bundleDealsByProductId.get(d.productId) ?? []
            arr.push({ bundleQty: d.bundleQty, bundlePrice: Number(d.bundlePrice) })
            bundleDealsByProductId.set(d.productId, arr)
        }

        let totalCents = 0
        const validatedItems = normalizedItems.map((item) => {
            const product = productMap.get(item.productId)!
            const variant =
                item.variantId
                    ? variantMap.get(item.variantId)
                    : defaultVariantByProductId.get(product.id)

            if (!variant || variant.productId !== product.id) {
                throw new OrderValidationError(400, 'Variant selection is required for this product')
            }

            const price = buildScopedProductPricing(product as any, variant as any).effectivePrice
            const availableStock = variant.trackInventory
                ? Math.max(variant.stock - variant.reserved - variant.safetyStock, 0)
                : Number.POSITIVE_INFINITY
            const trackInventory = variant.trackInventory

            // Note: Admins can force order creation even if stock is insufficient if they need to,
            // but for now we follow the same strict inventory checks.
            if (trackInventory && item.quantity > availableStock) {
                throw new OrderValidationError(400, `Insufficient stock for ${product.title}`)
            }

            const unitPriceCents = moneyToCents(price)
            const bundleDeals = bundleDealsByProductId.get(product.id) ?? []
            const pricing = computeBestBundleTotal({
                quantity: item.quantity,
                unitPriceCents,
                bundleDeals: bundleDeals.map((d) => ({
                    bundleQty: d.bundleQty,
                    bundlePriceCents: moneyToCents(d.bundlePrice)
                }))
            })
            totalCents += pricing.bestTotalCents

            return {
                productId: product.id,
                variantId: variant.id,
                quantity: item.quantity,
                price,
                referencePrice: Number(variant.price ?? product.price ?? 0),
                variantCost: Number(variant.cost ?? 0),
                lineTotal: centsToMoney(pricing.bestTotalCents),
                pricingBreakdown: pricing,
                trackInventory,
                reserved: variant.reserved,
                safetyStock: variant.safetyStock,
                isDefaultVariant: !item.variantId && defaultVariantByProductId.get(product.id)?.id === variant.id
            }
        })

        let shippingProvider = null
        if (input.shippingProvider) {
            const providerUpper = input.shippingProvider.toUpperCase()
            const validProviders = ['MAYSTRO', 'YALIDINE', 'SELF']
            if (validProviders.includes(providerUpper)) {
                shippingProvider = providerUpper as any
            }
        }

        if (deliveryMode === 'store') {
            shippingProvider = null
        }

        const shippingPickupPoint = await this.resolveShippingPickupPoint({
            tenantId: input.tenantId,
            shippingProvider,
            deliveryMode,
            shippingCommuneCode: input.shippingCommuneCode,
            rawPickupPoint: input.shippingPickupPoint
        })

        const effectiveShippingAmount = deliveryMode === 'store' ? 0 : shippingAmount
        const totalAmount = centsToMoney(totalCents)
        const totalWithShippingAmount = computeTotalWithShipping(totalAmount, effectiveShippingAmount)
        const normalizedCustomerAddress = hideOptionalAddress ? null : (input.customerAddress || null)
        const normalizedShippingAddressLine1 = hideOptionalAddress
            ? null
            : (input.shippingAddressLine1 || input.customerAddress || null)

        const pointsPreview = this.loyaltyFormula.computeTotal(
            storeSettings,
            validatedItems.map((item) => ({
                quantity: item.quantity,
                referencePrice: item.referencePrice,
                cost: item.variantCost
            }))
        )
        const orderIdPrefix = normalizeOrderIdPrefix((storeSettings as any).orderIdPrefix)

        let actualCustomerName = customerName
        let actualCustomerPhone = customerPhone
        let actualCustomerId = input.customerId || null

        // If customerId is provided, we should probably fetch the customer details
        if (input.customerId && (!actualCustomerName || !actualCustomerPhone)) {
            const customer = await prisma.customer.findFirst({
                where: { id: input.customerId, tenantId }
            })
            if (customer) {
                if (!actualCustomerName) actualCustomerName = customer.name
                if (!actualCustomerPhone) actualCustomerPhone = customer.phone ?? ''
            }
        }

        const order = await prisma.$transaction(async (tx) => {
            if (!actualCustomerId && actualCustomerPhone) {
                try {
                    const resolvedCustomer = await this.loyaltyLedger.ensureCustomerByPhone(tx, {
                        tenantId,
                        phone: actualCustomerPhone,
                        name: actualCustomerName,
                        address: normalizedCustomerAddress
                    })
                    actualCustomerId = resolvedCustomer?.id ?? null
                } catch (error) {
                    if (error instanceof PhoneNormalizationError) {
                        throw new OrderValidationError(error.statusCode, error.statusMessage)
                    }
                    throw error
                }
            }

            const publicId = await this.generateUniquePublicId(tx, input.tenantId, orderIdPrefix)
            const createdOrder = await tx.order.create({
                data: {
                    tenantId: input.tenantId,
                    publicId,
                    customerId: actualCustomerId,
                    customerName: actualCustomerName,
                    customerPhone: actualCustomerPhone,
                    customerPhoneNormalized: normalizeCustomerPhoneForOrder(actualCustomerPhone),
                    customerAddress: normalizedCustomerAddress,
                    deliveryMode,
                    shippingProvider,
                    shippingWilayaCode: input.shippingWilayaCode || null,
                    shippingCommuneCode: input.shippingCommuneCode || null,
                    shippingServiceLevel: shippingServiceLevel || null,
                    shippingAmount: effectiveShippingAmount,
                    shippingCurrency: shippingCurrency || undefined,
                    shippingAddressLine1: normalizedShippingAddressLine1,
                    shippingNotes: input.shippingNotes || null,
                    shippingPickupPoint: shippingPickupPoint ?? undefined,
                    totalAmount,
                    totalWithShippingAmount,
                    earnedPointsTotal: pointsPreview.totalPoints,
                    status: 'PENDING',
                    readAt: new Date()
                }
            })

            await tx.orderItem.createMany({
                data: validatedItems.map((item) => ({
                    tenantId: input.tenantId,
                    orderId: createdOrder.id,
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity,
                    price: item.price,
                    lineTotal: item.lineTotal,
                    pricingBreakdown: item.pricingBreakdown as any
                }))
            })

            await tx.productVariant.updateMany({
                where: { tenantId: input.tenantId, id: { in: validatedItems.map((i) => i.variantId) } },
                data: { skuLocked: true }
            })

            for (const item of validatedItems) {
                if (item.trackInventory !== false) {
                    const current = await tx.productVariant.findFirst({
                        where: { id: item.variantId, tenantId: input.tenantId },
                        select: { stock: true, reserved: true, safetyStock: true, trackInventory: true }
                    })
                    if (!current) throw new OrderValidationError(409, 'Insufficient stock')
                    if (current.trackInventory === false) continue
                    if (current.stock < item.quantity + current.reserved + current.safetyStock) {
                        throw new OrderValidationError(409, 'Insufficient stock')
                    }
                }
            }

            return createdOrder
        })

        const finalOrder = await prisma.order.findFirst({
            where: { id: order.id, tenantId: input.tenantId },
            include: {
                items: {
                    include: { product: true, variant: true }
                }
            }
        })

        if (finalOrder) {
            telegramService.sendOrderNotification(input.tenantId, finalOrder).catch(console.error)
            notificationsService.emitOrderCreated(input.tenantId, finalOrder.id).catch(console.error)
        }

        return finalOrder
    }

    async recordPayment(tenantId: string, userId: string, orderId: string, data: { amount: number, method: string, cashboxId: string, note?: string }) {
        const order = await prisma.order.findUnique({
            where: { tenantId, id: orderId }
        })

        if (!order) {
            throw new OrderValidationError(404, 'Order not found')
        }

        return await cashService.createTransaction(tenantId, {
            cashboxId: data.cashboxId,
            direction: 'IN',
            type: 'ORDER_PAYMENT',
            amount: data.amount,
            method: data.method || 'CASH',
            orderId: order.id,
            customerId: order.customerId,
            note: data.note
        }, { userId })
    }
}
