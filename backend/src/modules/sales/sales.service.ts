import prisma from '../../lib/prisma'
import { PosService } from '../pos/pos.service'
import { CashService } from '../cash/cash.service'

export interface SalesListFilters {
    search?: string
    startDate?: Date | null
    endDate?: Date | null
}

const posService = new PosService()
const cashService = new CashService()

export class SalesService {
    async list(tenantId: string, filters: SalesListFilters) {
        const search = filters.search?.trim()

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
                orderWhere.createdAt.gte = filters.startDate
                saleWhere.createdAt.gte = filters.startDate
            }
            if (filters.endDate) {
                orderWhere.createdAt.lt = filters.endDate
                saleWhere.createdAt.lt = filters.endDate
            }
        }

        const [orders, sales] = await Promise.all([
            prisma.order.findMany({
                where: orderWhere,
                orderBy: { updatedAt: 'desc' },
                take: 200,
                select: {
                    id: true,
                    status: true,
                    totalAmount: true,
                    customerName: true,
                    customerPhone: true,
                    createdAt: true,
                    updatedAt: true
                }
            }),
            prisma.sale.findMany({
                where: saleWhere,
                orderBy: { updatedAt: 'desc' },
                take: 200,
                select: {
                    id: true,
                    source: true,
                    orderId: true,
                    status: true,
                    totalAmount: true,
                    customerName: true,
                    customerPhone: true,
                    createdAt: true,
                    updatedAt: true
                }
            })
        ])

        const merged = [
            ...orders.map((o) => ({
                ...o,
                type: 'ORDER' as const
            })),
            ...sales.map((s) => ({
                ...s,
                type: (s.source === 'ORDER' ? 'ORDER' : 'POS') as const,
                customerName: s.customerName ?? 'Guest',
                customerPhone: s.customerPhone ?? ''
            }))
        ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

        return merged.slice(0, 200)
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
        const sale = await posService.createSale(
            tenantId,
            {
                customerId: input.customerId ?? null,
                items: Array.isArray(input.items) ? input.items : []
            },
            subscription ?? null,
            actor
        )

        if (sale && input?.payment && input.cashboxId) {
            await cashService.createTransaction(
                tenantId,
                {
                    cashboxId: input.cashboxId,
                    type: 'SALE_PAYMENT',
                    direction: 'IN',
                    amount: String((sale as any).totalAmount ?? 0),
                    method: input.payment.method ?? 'CASH',
                    customerId: (sale as any).customerId ?? null,
                    saleId: (sale as any).id ?? null,
                    reference: 'POS',
                    note: 'POS sale payment'
                },
                actor
            )
        }

        return sale
    }
}
