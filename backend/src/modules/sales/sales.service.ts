import prisma from '../../lib/prisma'
import { PosService } from '../pos/pos.service'
import { CashService } from '../cash/cash.service'

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
}
