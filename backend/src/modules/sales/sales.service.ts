import prisma from '../../lib/prisma'
import { PosService } from '../pos/pos.service'
import { CashService } from '../cash/cash.service'
import { syncProductStockForProducts } from '../inventory/product-stock.service'

export interface SalesListFilters {
    search?: string
    startDate?: Date | null
    endDate?: Date | null
    userId?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
}

export interface SalesPagination {
    page: number
    limit: number
}

const posService = new PosService()
const cashService = new CashService()

export class SalesValidationError extends Error {
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

export class SalesService {
    async list(tenantId: string, filters: SalesListFilters, pagination: SalesPagination = { page: 1, limit: 25 }) {
        const search = filters.search?.trim()
        const { page, limit } = pagination
        const skip = (page - 1) * limit
        // Over-fetch so we can merge both sources and still have enough rows for slicing
        const fetchLimit = page * limit + limit

        const orderWhere: any = { tenantId, status: 'DELIVERED', sale: { is: null } }
        const saleWhere: any = { tenantId, status: 'COMPLETED' }

        if (search) {
            orderWhere.OR = [
                { customerName: { contains: search, mode: 'insensitive' } },
                { customerPhone: { contains: search } },
                { id: { contains: search } }
            ]
            saleWhere.OR = [
                { customerName: { contains: search, mode: 'insensitive' } },
                { customerPhone: { contains: search } },
                { id: { contains: search } }
            ]
        }

        if (filters.startDate || filters.endDate) {
            orderWhere.createdAt = {}
            saleWhere.createdAt = {}
            if (filters.startDate) {
                const start = new Date(filters.startDate)
                start.setHours(0, 0, 0, 0)
                orderWhere.createdAt.gte = start
                saleWhere.createdAt.gte = start
            }
            if (filters.endDate) {
                const end = new Date(filters.endDate)
                end.setHours(23, 59, 59, 999)
                orderWhere.createdAt.lte = end
                saleWhere.createdAt.lte = end
            }
        }

        const [orders, sales] = await Promise.all([
            filters.userId
                ? []
                : prisma.order.findMany({
                    where: orderWhere,
                    orderBy: { updatedAt: 'desc' },
                    take: fetchLimit,
                    select: {
                        id: true,
                        status: true,
                        totalAmount: true,
                        customerName: true,
                        customerPhone: true,
                        customerId: true,
                        createdAt: true,
                        updatedAt: true
                    }
                }),
            prisma.sale.findMany({
                where: {
                    ...saleWhere,
                    ...(filters.userId ? { createdByUserId: filters.userId } : {})
                },
                orderBy: { updatedAt: 'desc' },
                take: fetchLimit,
                select: {
                    id: true,
                    source: true,
                    orderId: true,
                    status: true,
                    totalAmount: true,
                    customerName: true,
                    customerPhone: true,
                    customerId: true,
                    createdAt: true,
                    updatedAt: true,
                    createdBy: {
                        select: {
                            id: true,
                            email: true
                        }
                    }
                }
            })
        ])

        const merged = [
            ...orders.map((o) => ({
                ...o,
                type: 'ORDER' as const,
                createdByEmail: null
            })),
            ...sales.map((s) => ({
                ...s,
                type: (s.source === 'ORDER' ? 'ORDER' : 'POS') as 'ORDER' | 'POS',
                customerName: s.customerName ?? 'Guest',
                customerPhone: s.customerPhone ?? '',
                createdByEmail: s.createdBy?.email
            }))
        ].sort((a: any, b: any) => {
            const dir = (filters.sortOrder || 'desc') === 'asc' ? 1 : -1
            switch (filters.sortBy) {
                case 'customerName':
                    return a.customerName.localeCompare(b.customerName) * dir
                case 'totalAmount':
                    return (a.totalAmount - b.totalAmount) * dir
                case 'id':
                    return a.id.localeCompare(b.id) * dir
                case 'updatedAt':
                case 'completed':
                    return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir
                default:
                    return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir
            }
        })

        const total = merged.length
        const items = merged.slice(skip, skip + limit)

        return {
            items,
            total,
            page,
            totalPages: Math.max(1, Math.ceil(total / limit))
        }
    }

    async getById(tenantId: string, id: string) {
        const sale = await prisma.sale.findFirst({
            where: { tenantId, id },
            include: { items: { include: { product: true, variant: true } } }
        })
        if (sale) return sale

        const order = await prisma.order.findFirst({
            where: { tenantId, id, status: 'DELIVERED' },
            include: { items: { include: { product: true, variant: true } } }
        })
        if (!order) return null

        return {
            id: order.id,
            tenantId: order.tenantId,
            source: 'ORDER',
            orderId: order.id,
            status: order.status,
            totalAmount: order.totalAmount,
            customerId: order.customerId ?? null,
            customerName: order.customerName ?? null,
            customerPhone: order.customerPhone ?? null,
            customerAddress: order.customerAddress ?? null,
            notes: 'Legacy delivered order (not yet converted)',
            createdByUserId: null,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            items: order.items.map((i: any) => ({
                id: i.id,
                tenantId: i.tenantId,
                saleId: order.id,
                productId: i.productId,
                variantId: i.variantId ?? null,
                quantity: i.quantity,
                price: i.price,
                product: i.product,
                variant: i.variant
            }))
        }
    }

    async getPosSaleById(tenantId: string, id: string) {
        return prisma.sale.findFirst({
            where: { tenantId, id },
            include: {
                items: {
                    include: { product: true, variant: true }
                }
            }
        })
    }

    async createPosSale(
        tenantId: string,
        input: { customerId?: string | null; items: Array<{ productId: string; variantId?: string | null; quantity: number }>; cashboxId?: string | null; payment?: { method?: string | null } | null },
        subscription?: { planCode: string; currentPeriodStart: Date; currentPeriodEnd: Date | null; interval: string } | null,
        actor?: { userId?: string | null }
    ) {
        const wantsPayment = !!input?.payment

        if (!wantsPayment) {
            return posService.createSale(
                tenantId,
                {
                    customerId: input.customerId ?? null,
                    items: Array.isArray(input.items) ? input.items : []
                },
                subscription ?? null,
                actor ? { userId: actor.userId ?? null } : { userId: null }
            )
        }

        return prisma.$transaction(async (tx) => {
            const sale = await posService.createSaleInTx(
                tx,
                tenantId,
                {
                    customerId: input.customerId ?? null,
                    items: Array.isArray(input.items) ? input.items : []
                },
                subscription ?? null,
                { userId: actor?.userId ?? null }
            )

            if (!sale) {
                throw new Error('Failed to create POS sale')
            }

            await cashService.createTransactionInTx(
                tx,
                tenantId,
                {
                    cashboxId: input.cashboxId ?? null,
                    type: 'SALE_PAYMENT',
                    direction: 'IN',
                    amount: String((sale as any).totalAmount ?? 0),
                    method: input.payment?.method ?? 'CASH',
                    customerId: (sale as any).customerId ?? null,
                    saleId: (sale as any).id ?? null,
                    reference: 'POS',
                    note: 'POS sale payment'
                },
                actor
            )

            return sale
        })
    }

    async updateStatus(
        tenantId: string,
        id: string,
        status: string,
        opts?: {
            refund?: {
                cashboxId?: string | null
                method?: string | null
                reference?: string | null
                note?: string | null
                amount?: number | string | null
            } | null
        },
        actor?: { userId?: string | null }
    ) {
        const targetStatus = String(status || '').trim().toUpperCase()
        if (targetStatus !== 'REFUNDED') {
            throw new SalesValidationError(400, 'Invalid status value', {
                code: 'SALE_STATUS_INVALID'
            })
        }

        const sale = await prisma.sale.findFirst({
            where: { tenantId, id },
            select: {
                id: true,
                status: true,
                source: true,
                orderId: true,
                totalAmount: true,
                customerId: true,
                items: {
                    select: { variantId: true, quantity: true }
                }
            }
        })
        if (!sale) {
            throw new SalesValidationError(404, 'Sale not found')
        }
        if (sale.orderId || sale.source === 'ORDER') {
            throw new SalesValidationError(409, 'Order-linked sales cannot be refunded here', {
                code: 'SALE_REFUND_ORDER_LINKED_NOT_ALLOWED'
            })
        }
        if (sale.status === 'REFUNDED') {
            return prisma.sale.findFirst({
                where: { tenantId, id },
                include: { items: { include: { product: true, variant: true } } }
            })
        }
        if (sale.status !== 'COMPLETED') {
            throw new SalesValidationError(409, `Invalid status transition: ${sale.status} -> ${targetStatus}`, {
                code: 'SALE_STATUS_TRANSITION_NOT_ALLOWED'
            })
        }

        const refund = opts?.refund ?? null
        const refundCashboxId = typeof refund?.cashboxId === 'string' ? refund.cashboxId.trim() : ''
        if (!refundCashboxId) {
            throw new SalesValidationError(400, 'refund.cashboxId is required', {
                code: 'SALE_REFUND_CASHBOX_REQUIRED'
            })
        }

        const refundAmount = (() => {
            const raw = refund?.amount
            if (raw === undefined || raw === null || raw === '') return Number(sale.totalAmount || 0)
            const n = typeof raw === 'number' ? raw : Number(String(raw).trim())
            return Number.isFinite(n) ? n : NaN
        })()
        if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
            throw new SalesValidationError(400, 'refund amount must be greater than 0', {
                code: 'SALE_REFUND_AMOUNT_INVALID'
            })
        }
        const totalAmount = Number(sale.totalAmount || 0)
        if (refundAmount > totalAmount) {
            throw new SalesValidationError(400, 'refund amount cannot exceed sale total', {
                code: 'SALE_REFUND_AMOUNT_EXCEEDS_TOTAL'
            })
        }

        return prisma.$transaction(async (tx) => {
            const touchedProductIds = new Set<string>()
            for (const item of sale.items) {
                if (!item.variantId) continue

                const variantBefore = await tx.productVariant.findFirst({
                    where: { tenantId, id: item.variantId },
                    select: { id: true, productId: true, stock: true, reserved: true, safetyStock: true, trackInventory: true }
                })
                if (!variantBefore) continue
                if (variantBefore.trackInventory === false) continue

                const updated = await tx.productVariant.updateMany({
                    where: {
                        tenantId,
                        id: item.variantId,
                        stock: variantBefore.stock,
                        reserved: variantBefore.reserved,
                        safetyStock: variantBefore.safetyStock
                    },
                    data: {
                        stock: { increment: item.quantity }
                    }
                })
                if (updated.count !== 1) {
                    throw new SalesValidationError(409, 'Inventory conflict, please retry', {
                        code: 'SALE_REFUND_INVENTORY_CONFLICT'
                    })
                }
                touchedProductIds.add(variantBefore.productId)

                const variantAfter = await tx.productVariant.findFirst({
                    where: { tenantId, id: item.variantId },
                    select: { stock: true, reserved: true, safetyStock: true }
                })

                await tx.inventoryMovement.create({
                    data: {
                        tenantId,
                        variantId: item.variantId,
                        type: 'MANUAL_ADJUSTMENT',
                        delta: item.quantity,
                        reservedDelta: 0,
                        safetyStockDelta: 0,
                        reason: 'sale_refund',
                        note: `sale_refund:${sale.id}`.slice(0, 500),
                        saleId: sale.id,
                        stockAfter: variantAfter?.stock ?? null,
                        reservedAfter: variantAfter?.reserved ?? null,
                        safetyStockAfter: variantAfter?.safetyStock ?? null,
                        createdByUserId: actor?.userId ?? null
                    }
                })
            }

            await syncProductStockForProducts(tx as any, tenantId, Array.from(touchedProductIds))

            await cashService.createTransactionInTx(
                tx,
                tenantId,
                {
                    cashboxId: refundCashboxId,
                    type: 'SALE_REFUND',
                    direction: 'OUT',
                    amount: String(refundAmount),
                    currency: 'DZD',
                    method: refund?.method ?? 'CASH',
                    customerId: sale.customerId ?? null,
                    saleId: sale.id,
                    reference: refund?.reference ?? undefined,
                    note: refund?.note ?? `POS sale refund: ${sale.id}`.slice(0, 500)
                },
                actor
            )

            const statusUpdate = await tx.sale.updateMany({
                where: { tenantId, id: sale.id, status: 'COMPLETED' },
                data: { status: 'REFUNDED' }
            })
            if (statusUpdate.count !== 1) {
                throw new SalesValidationError(409, 'Sale was updated by another request, please retry', {
                    code: 'SALE_REFUND_STATUS_CONFLICT'
                })
            }

            return tx.sale.findFirst({
                where: { tenantId, id: sale.id },
                include: { items: { include: { product: true, variant: true } } }
            })
        })
    }
}
