import { Prisma } from '@prisma/client'
import prisma from '../../lib/prisma'
import { getPlanByCode } from '../../../../shared/pricing/plans'
import { syncProductStockForProducts } from '../inventory/product-stock.service'
import { suggestSkuFromProduct } from '../../lib/variant-identifiers'
import { buildScopedProductPricing } from '../../../../shared/pricing/product-pricing'
import { LoyaltyFormulaService } from '../loyalty/loyalty-formula.service'
import { LoyaltyLedgerService } from '../loyalty/loyalty-ledger.service'

export class PosValidationError extends Error {
    statusCode: number
    statusMessage: string

    constructor(statusCode: number, statusMessage: string) {
        super(statusMessage)
        this.statusCode = statusCode
        this.statusMessage = statusMessage
    }
}

type SubscriptionContext = {
    planCode: string
    currentPeriodStart: Date
    currentPeriodEnd: Date | null
    interval: string
}

type PosOrderItemInput = {
    productId: string
    variantId?: string | null
    quantity: number
}

export type CreatePosSaleInput = {
    customerId?: string | null
    clientRequestId?: string | null
    items: PosOrderItemInput[]
}

const addUtcMonths = (date: Date, months: number) =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate(), 0, 0, 0, 0))

const addUtcYears = (date: Date, years: number) =>
    new Date(Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0))

const normalizeClientRequestId = (value?: string | null) => {
    const normalized = typeof value === 'string' ? value.trim() : ''
    if (!normalized) return null
    if (normalized.length > 200) {
        throw new PosValidationError(400, 'Idempotency key is too long')
    }
    return normalized
}

export class PosService {
    private loyaltyFormula = new LoyaltyFormulaService()
    private loyaltyLedger = new LoyaltyLedgerService()

    private async enforceOrderLimit(tenantId: string, subscription?: SubscriptionContext | null) {
        if (!subscription) return

        const plan = getPlanByCode(subscription.planCode as any) ?? getPlanByCode('basic')
        const limit = plan?.ordersPerMonth ?? 0
        if (limit <= 0) return

        const periodStart = subscription.currentPeriodStart
        const periodEnd =
            subscription.currentPeriodEnd ??
            (subscription.interval === 'year' ? addUtcYears(periodStart, 1) : addUtcMonths(periodStart, 1))

        const [ordersInPeriod, salesInPeriod] = await Promise.all([
            prisma.order.count({
                where: {
                    tenantId,
                    createdAt: { gte: periodStart, lt: periodEnd }
                }
            }),
            prisma.sale.count({
                where: {
                    tenantId,
                    createdAt: { gte: periodStart, lt: periodEnd }
                }
            })
        ])
        const total = ordersInPeriod + salesInPeriod

        if (total >= limit) {
            throw new PosValidationError(
                429,
                `Monthly order limit reached (${total}/${limit}). Upgrade your plan to accept more orders.`
            )
        }
    }

    async createSaleInTx(
        tx: Prisma.TransactionClient,
        tenantId: string,
        input: CreatePosSaleInput,
        subscription?: SubscriptionContext | null,
        actor?: { userId: string | null }
    ) {
        const clientRequestId = normalizeClientRequestId(input.clientRequestId)
        if (clientRequestId) {
            const existing = await tx.sale.findFirst({
                where: { tenantId, clientRequestId },
                include: { items: { include: { product: true, variant: true } } }
            })
            if (existing) return existing
        }

        await this.enforceOrderLimit(tenantId, subscription)

        if (!Array.isArray(input.items) || input.items.length === 0) {
            throw new PosValidationError(400, 'At least one item is required')
        }

        const normalizedItems = input.items.map((item) => ({
            productId: String(item.productId || '').trim(),
            variantId: item.variantId ? String(item.variantId).trim() : undefined,
            quantity: Number(item.quantity || 0)
        }))

        normalizedItems.forEach((item) => {
            if (!item.productId) throw new PosValidationError(400, 'Product ID is required for each item')
            if (!Number.isFinite(item.quantity) || item.quantity < 1) {
                throw new PosValidationError(400, 'Quantity must be at least 1')
            }
        })

        const customerId = input.customerId ? String(input.customerId).trim() : null

        const resolvedCustomer = customerId
            ? await tx.customer.findUnique({
                where: { tenantId_id: { tenantId, id: customerId } },
                select: { id: true, name: true, phone: true, address: true }
            })
            : null

        if (customerId && !resolvedCustomer) {
            throw new PosValidationError(400, 'Invalid customer')
        }

        const customerName = resolvedCustomer?.name ?? null
        const customerPhone = resolvedCustomer?.phone ?? null
        const customerAddress = resolvedCustomer?.address ?? null

        const productIds = Array.from(new Set(normalizedItems.map((i) => i.productId)))
        const variantIds = Array.from(
            new Set(normalizedItems.map((i) => i.variantId).filter((v): v is string => typeof v === 'string' && v.length > 0))
        )
        const productIdsWithoutVariant = Array.from(new Set(normalizedItems.filter((i) => !i.variantId).map((i) => i.productId)))

        const products = await tx.product.findMany({
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
            throw new PosValidationError(400, 'Some products are invalid or unavailable')
        }

        const productMap = new Map(products.map((p) => [p.id, { ...p, hasVariants: (p as any)._count?.options > 0 }]))

        const variantsById = variantIds.length
            ? await tx.productVariant.findMany({
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
            throw new PosValidationError(400, 'Some variants are invalid or unavailable')
        }

        const defaultVariants = productIdsWithoutVariant.length
            ? await tx.productVariant.findMany({
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

        const variantMap = new Map(variantsById.map((v) => [v.id, v]))
        const defaultVariantByProductId = new Map(defaultVariants.map((v) => [v.productId, v]))

        if (productIdsWithoutVariant.length > 0) {
            const optionRows = await tx.productOption.findMany({
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

                const created = await tx.productVariant.create({
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

        let total = 0
        const validatedItems = normalizedItems.map((item) => {
            const product = productMap.get(item.productId)!
            const variant = item.variantId ? variantMap.get(item.variantId) : defaultVariantByProductId.get(product.id)

            if (!variant || variant.productId !== product.id) {
                throw new PosValidationError(400, 'Variant selection is required for this product')
            }

            const price = Number(buildScopedProductPricing(product as any, variant as any).effectivePrice)
            const availableStock = variant.trackInventory
                ? Math.max(variant.stock - variant.reserved - variant.safetyStock, 0)
                : Number.POSITIVE_INFINITY

            if (variant.trackInventory && item.quantity > availableStock) {
                throw new PosValidationError(400, `Insufficient stock for ${product.title}`)
            }

            total += price * item.quantity

            return {
                productId: product.id,
                variantId: variant.id,
                productTitle: product.title,
                quantity: item.quantity,
                price,
                referencePrice: Number(variant.price ?? product.price ?? 0),
                variantCost: Number(variant.cost ?? 0),
                trackInventory: variant.trackInventory,
                isDefaultVariant: !item.variantId && defaultVariantByProductId.get(product.id)?.id === variant.id
            }
        })

        const loyaltySettings = await tx.storeSettings.upsert({
            where: { tenantId },
            create: { tenantId },
            update: {}
        })
        const pointsPreview = this.loyaltyFormula.computeTotal(
            loyaltySettings,
            validatedItems.map((item) => ({
                quantity: item.quantity,
                referencePrice: item.referencePrice,
                cost: item.variantCost
            }))
        )

        const touchedProductIds = new Set<string>()
        const createdSale = await tx.sale.create({
            data: {
                tenantId,
                customerId: resolvedCustomer?.id ?? null,
                customerName,
                customerPhone,
                customerAddress,
                notes: 'POS sale',
                totalAmount: total,
                status: 'COMPLETED',
                earnedPointsTotal: resolvedCustomer?.id ? pointsPreview.totalPoints : 0,
                createdByUserId: actor?.userId ?? null,
                clientRequestId
            }
        })

        await tx.saleItem.createMany({
            data: validatedItems.map((i) => ({
                tenantId,
                saleId: createdSale.id,
                productId: i.productId,
                variantId: i.variantId,
                quantity: i.quantity,
                price: i.price
            }))
        })

        await tx.productVariant.updateMany({
            where: { tenantId, id: { in: validatedItems.map((i) => i.variantId) } },
            data: { skuLocked: true }
        })

        for (const item of validatedItems) {
            if (item.trackInventory === false) continue

            const variantBefore = await tx.productVariant.findFirst({
                where: { id: item.variantId, tenantId },
                select: { id: true, productId: true, stock: true, reserved: true, safetyStock: true, trackInventory: true }
            })
            if (!variantBefore) throw new PosValidationError(409, 'Insufficient stock')
            if (variantBefore.trackInventory === false) continue

            if (variantBefore.stock < item.quantity + variantBefore.reserved + variantBefore.safetyStock) {
                throw new PosValidationError(409, `Insufficient stock for ${item.productTitle}`)
            }

            const updated = await tx.productVariant.updateMany({
                where: {
                    tenantId,
                    id: item.variantId,
                    stock: variantBefore.stock,
                    reserved: variantBefore.reserved,
                    safetyStock: variantBefore.safetyStock
                },
                data: { stock: { decrement: item.quantity } }
            })
            if (updated.count !== 1) throw new PosValidationError(409, 'Inventory conflict, please retry')
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
                    delta: -item.quantity,
                    reservedDelta: 0,
                    safetyStockDelta: 0,
                    reason: 'pos_sale',
                    note: null,
                    orderId: null,
                    saleId: createdSale.id,
                    stockAfter: after?.stock ?? null,
                    reservedAfter: after?.reserved ?? null,
                    safetyStockAfter: after?.safetyStock ?? null,
                    createdByUserId: actor?.userId ?? null
                }
            })
        }

        await syncProductStockForProducts(tx as any, tenantId, Array.from(touchedProductIds))

        if (resolvedCustomer?.id && loyaltySettings.loyaltyEnabled === true && pointsPreview.totalPoints !== 0) {
            await this.loyaltyLedger.createLedgerEntry(tx, {
                tenantId,
                customerId: resolvedCustomer.id,
                direction: 'EARN',
                status: 'AVAILABLE',
                sourceType: 'SALE',
                sourceId: createdSale.id,
                saleId: createdSale.id,
                points: pointsPreview.totalPoints,
                createdByUserId: actor?.userId ?? null,
                formulaSnapshot: {
                    lines: pointsPreview.lines,
                    source: 'POS'
                }
            })
        }

        return tx.sale.findFirst({
            where: { id: createdSale.id, tenantId },
            include: { items: { include: { product: true, variant: true } } }
        })
    }

    async createSale(
        tenantId: string,
        input: CreatePosSaleInput,
        subscription?: SubscriptionContext | null,
        actor?: { userId: string | null }
    ) {
        try {
            return await prisma.$transaction(async (tx) => this.createSaleInTx(tx, tenantId, input, subscription ?? null, actor))
        } catch (error) {
            const clientRequestId = normalizeClientRequestId(input.clientRequestId)
            if (
                clientRequestId &&
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                const existing = await prisma.sale.findFirst({
                    where: { tenantId, clientRequestId },
                    include: { items: { include: { product: true, variant: true } } }
                })
                if (existing) return existing
            }
            throw error
        }
    }

    async lookupByCode(tenantId: string, code: string) {
        const normalized = String(code || '').trim().toUpperCase()
        if (!normalized) return null

        const variant = await prisma.productVariant.findFirst({
            where: {
                tenantId,
                isActive: true,
                OR: [{ barcode: normalized }, { sku: normalized }]
            },
            include: {
                product: {
                    include: {
                        productImages: { orderBy: { position: 'asc' } }
                    }
                },
                optionValues: {
                    include: { optionValue: true }
                }
            }
        })

        if (!variant) return null

        const labels = Array.isArray(variant.optionValues)
            ? variant.optionValues.map((ov: any) => ov?.optionValue?.label).filter(Boolean)
            : []

        const stock = Number(variant.stock ?? 0)
        const reserved = Number(variant.reserved ?? 0)
        const safety = Number(variant.safetyStock ?? 0)
        const trackInventory = variant.trackInventory !== false
        const availableStock = trackInventory ? Math.max(stock - reserved - safety, 0) : Number.POSITIVE_INFINITY

        const productImages = variant.product?.productImages ?? []
        const mainImage = productImages.find((i: any) => i?.isMain) ?? productImages[0]

        return {
            productId: variant.productId,
            variantId: variant.id,
            sku: variant.sku,
            title: variant.product?.title ?? '',
            variantLabel: labels.length > 0 ? labels.join(' / ') : null,
            price: Number((variant as any).price ?? variant.product?.price ?? 0),
            trackInventory,
            availableStock,
            imageUrl: mainImage?.url ?? null
        }
    }
}
