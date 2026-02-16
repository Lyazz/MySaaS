import prisma from '../../lib/prisma'
import { Prisma } from '@prisma/client'
import { getPlanByCode } from '../../../../shared/pricing/plans'
import { computeBestBundleTotal, moneyToCents, centsToMoney } from '../../../../shared/pricing/bundle-pricing'
import { TelegramService } from '../integrations/telegram.service'
import { syncProductStockForProducts } from '../inventory/product-stock.service'
import { mirrorCashTransactionToPayments } from '../payments/payment-mirror'
import { suggestSkuFromProduct } from '../../lib/variant-identifiers'

const telegramService = new TelegramService()

export class OrderValidationError extends Error {
    statusCode: number
    statusMessage: string

    constructor(statusCode: number, statusMessage: string) {
        super(statusMessage)
        this.statusCode = statusCode
        this.statusMessage = statusMessage
    }
}

type PublicOrderItemInput = {
    productId: string
    variantId?: string | null
    quantity: number
}

export type PublicOrderInput = {
    tenantId: string
    customerName?: string | null
    customerPhone?: string | null
    customerAddress?: string | null
    shippingWilayaCode?: string | null
    shippingCommuneCode?: string | null
    shippingAddressLine1?: string | null
    shippingNotes?: string | null
    deliveryMode?: string | null
    shippingProvider?: string | null
    items: PublicOrderItemInput[]
}

type SubscriptionContext = {
    planCode: string
    currentPeriodStart: Date
    currentPeriodEnd: Date | null
    interval: string
}

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'] as const

const addUtcMonths = (date: Date, months: number) =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate(), 0, 0, 0, 0))

const addUtcYears = (date: Date, years: number) =>
    new Date(Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0))

export class OrdersService {
    private async ensureDeliveredOrderSale(
        tx: any,
        tenantId: string,
        order: { id: string; tenantId: string; totalAmount: number; customerId: string | null; customerName: string; customerPhone: string; customerAddress: string | null; items: Array<{ productId: string; variantId: string | null; quantity: number; price: number }> },
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

    async list(tenantId: string, filters: { status?: string; search?: string; startDate?: string; endDate?: string }) {
        const where: any = { tenantId }

        if (filters.status) {
            where.status = filters.status
        }

        if (filters.search) {
            where.OR = [
                { customerName: { contains: filters.search, mode: 'insensitive' } },
                { customerPhone: { contains: filters.search } }
            ]
        }

        if (filters.startDate || filters.endDate) {
            where.createdAt = {}
            if (filters.startDate) {
                // Parse start date and set time to beginning of day
                const start = new Date(filters.startDate)
                start.setHours(0, 0, 0, 0)
                where.createdAt.gte = start
            }
            if (filters.endDate) {
                // Parse end date and set time to end of day
                const end = new Date(filters.endDate)
                end.setHours(23, 59, 59, 999)
                where.createdAt.lte = end
            }
        }

        return prisma.order.findMany({
            where,
            include: {
                items: {
                    include: { product: true, variant: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })
    }

    async findById(tenantId: string, id: string) {
        return prisma.order.findFirst({
            where: { id, tenantId },
            include: {
                items: {
                    include: { product: true, variant: true }
                }
            }
        })
    }

    async getPublicPixelPayload(tenantId: string, orderId: string) {
        const order = await prisma.order.findFirst({
            where: { tenantId, id: orderId },
            select: {
                id: true,
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
            value: order.totalAmount,
            currency,
            numItems,
            contents,
            pixelIds
        }
    }

    async updateStatus(
        tenantId: string,
        id: string,
        status: string,
        actor?: { userId?: string | null },
        opts?: { cashboxId?: string | null; method?: string | null; reference?: string | null; note?: string | null }
    ) {
        if (!status || !ORDER_STATUSES.includes(status as any)) {
            throw new OrderValidationError(400, 'Invalid status value')
        }

        const existing = await prisma.order.findFirst({
            where: { id, tenantId },
            include: { items: true }
        })
        if (!existing) throw new OrderValidationError(404, 'Order not found')

        const fromStatus = existing.status
        const toStatus = status
        if (fromStatus === toStatus) return prisma.order.findFirst({ where: { id, tenantId } })

        if (fromStatus === 'SHIPPED' && toStatus === 'DELIVERED') {
            const cashboxId = typeof opts?.cashboxId === 'string' ? opts.cashboxId.trim() : ''
            if (!cashboxId) throw new OrderValidationError(400, 'cashboxId is required to mark an order DELIVERED')
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

            if (fromStatus === 'SHIPPED' && toStatus === 'DELIVERED') {
                const sale = await this.ensureDeliveredOrderSale(
                    tx,
                    tenantId,
                    {
                        id: existing.id,
                        tenantId: existing.tenantId,
                        totalAmount: existing.totalAmount,
                        customerId: existing.customerId ?? null,
                        customerName: existing.customerName,
                        customerPhone: existing.customerPhone,
                        customerAddress: existing.customerAddress ?? null,
                        items: items.map((i: any) => ({
                            productId: i.productId,
                            variantId: i.variantId ?? null,
                            quantity: i.quantity,
                            price: i.price
                        }))
                    },
                    actor
                )

                const cashboxId = typeof opts?.cashboxId === 'string' ? opts.cashboxId.trim() : ''
                if (!cashboxId) throw new OrderValidationError(400, 'cashboxId is required to mark an order DELIVERED')

                const openSession = await tx.cashSession.findFirst({
                    where: { tenantId, cashboxId, status: 'OPEN' },
                    orderBy: { openedAt: 'desc' },
                    select: { id: true }
                })
                if (!openSession) throw new OrderValidationError(409, 'Cashbox has no open session')

                const storeSettings = await tx.storeSettings.findUnique({
                    where: { tenantId },
                    select: { currencyCode: true }
                })
                const currency = (storeSettings?.currencyCode || 'DZD').toUpperCase()

                const method = typeof opts?.method === 'string' && opts.method.trim() ? opts.method.trim().toUpperCase() : 'CASH'
                const reference = typeof opts?.reference === 'string' && opts.reference.trim() ? opts.reference.trim().slice(0, 64) : null
                const note = typeof opts?.note === 'string' && opts.note.trim() ? opts.note.trim().slice(0, 500) : 'Order delivered payment'

                const amount = new Prisma.Decimal(String(existing.totalAmount || 0))
                if (!amount.isFinite() || amount.lte(0)) throw new OrderValidationError(400, 'Order totalAmount must be > 0')

                const cashTx = await tx.cashTransaction.create({
                    data: {
                        tenantId,
                        cashboxId,
                        sessionId: openSession.id,
                        direction: 'IN',
                        type: 'SALE_PAYMENT',
                        amount,
                        currency,
                        method,
                        customerId: existing.customerId ?? null,
                        saleId: sale.id,
                        orderId: existing.id,
                        reference,
                        note,
                        createdByUserId: actor?.userId ?? null
                    }
                })

                await mirrorCashTransactionToPayments(tx, tenantId, cashTx)
            }

            const updated = await tx.order.updateMany({ where: { tenantId, id }, data: { status: toStatus } })
            if (updated.count !== 1) throw new OrderValidationError(404, 'Order not found')
        })

        return prisma.order.findFirst({ where: { id, tenantId } })
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
        const deliveryMode = (input.deliveryMode || 'home').toLowerCase()

        if (!customerPhone) {
            throw new OrderValidationError(400, 'Customer phone is required')
        }

        if (!customerName) {
            throw new OrderValidationError(400, 'Customer name is required')
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

        const storeSettings = await prisma.storeSettings.upsert({
            where: { tenantId: input.tenantId },
            create: { tenantId: input.tenantId },
            update: {}
        })

        if (storeSettings.cartEnabled === false) {
            throw new OrderValidationError(403, 'Checkout is disabled for this store')
        }

        if (storeSettings.codEnabled === false) {
            throw new OrderValidationError(403, 'Cash on delivery is disabled for this store')
        }

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
            select: { id: true, slug: true, price: true, title: true, stock: true }
        })

        if (products.length !== productIds.length) {
            throw new OrderValidationError(400, 'Some products are invalid or unavailable')
        }

        const productMap = new Map(products.map((p) => [p.id, p]))

        const variantsById = variantIds.length
            ? await prisma.productVariant.findMany({
                where: { id: { in: variantIds }, tenantId: input.tenantId, isActive: true },
                select: { id: true, productId: true, price: true, stock: true, reserved: true, safetyStock: true, trackInventory: true }
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
                select: { id: true, productId: true, price: true, stock: true, reserved: true, safetyStock: true, trackInventory: true }
            })
            : []

        const variantMap = new Map(variantsById.map((v) => [v.id, v]))
        const defaultVariantByProductId = new Map(defaultVariants.map((v) => [v.productId, v]))

        // Back-compat / safety: if a product has no variantId but also has no default variant,
        // create one on-the-fly only when the product has no options.
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

            const price = Number(variant.price ?? product.price)
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
                trackInventory,
                reserved: variant.reserved,
                safetyStock: variant.safetyStock,
                isDefaultVariant: !item.variantId && defaultVariantByProductId.get(product.id)?.id === variant.id
            }
        })

        // Validate and normalize shippingProvider
        let shippingProvider = null
        if (input.shippingProvider) {
            const providerUpper = input.shippingProvider.toUpperCase()
            const validProviders = ['MAYSTRO', 'YALIDINE', 'ECOTRACK', 'ZR_EXPRESS', 'SELF']
            if (validProviders.includes(providerUpper)) {
                shippingProvider = providerUpper as any
            }
        }

        const order = await prisma.$transaction(async (tx) => {
            const createdOrder = await tx.order.create({
                data: {
                    tenantId: input.tenantId,
                    // Guest checkout: keep customerId null.
                    // Authenticated customer checkout (future): will set customerId explicitly.
                    customerId: null,
                    customerName,
                    customerPhone,
                    customerAddress: input.customerAddress || null,
                    deliveryMode,
                    shippingProvider,
                    shippingWilayaCode: input.shippingWilayaCode || null,
                    shippingCommuneCode: input.shippingCommuneCode || null,
                    shippingAddressLine1: input.shippingAddressLine1 || input.customerAddress || null,
                    shippingNotes: input.shippingNotes || null,
                    totalAmount: centsToMoney(totalCents),
                    status: 'PENDING'
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

            return createdOrder
        })

        // Fire and forget notification
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
        }

        return finalOrder
    }
}
