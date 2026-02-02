import prisma from '../../lib/prisma'

export interface SalesListFilters {
    search?: string
    startDate?: Date | null
    endDate?: Date | null
}

export class SalesService {
    async list(tenantId: string, filters: SalesListFilters) {
        const search = filters.search?.trim()

        const orderWhere: any = { tenantId, status: 'DELIVERED' }
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
                type: 'POS' as const,
                customerName: s.customerName ?? 'Guest',
                customerPhone: s.customerPhone ?? ''
            }))
        ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

        return merged.slice(0, 200)
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
}
