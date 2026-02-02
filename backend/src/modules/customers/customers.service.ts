import prisma from '../../lib/prisma'

export interface CustomersListFilters {
    search?: string
}

export interface CustomerSummary {
    id: string
    phone: string
    name: string
    email: string | null
    address: string | null
    ordersCount: number
    totalSpent: number
    lastOrderAt: Date | null
    lastOrderId: string | null
}

export class CustomersService {
    async list(tenantId: string, filters: CustomersListFilters): Promise<CustomerSummary[]> {
        const search = filters.search?.trim()

        const customers = await prisma.customer.findMany({
            where: {
                tenantId,
                ...(search
                    ? {
                          OR: [
                              { name: { contains: search, mode: 'insensitive' } },
                              { phone: { contains: search } },
                              { email: { contains: search, mode: 'insensitive' } }
                          ]
                      }
                    : {})
            },
            orderBy: { updatedAt: 'desc' },
            take: 200,
            select: {
                id: true,
                phone: true,
                name: true,
                email: true,
                address: true
            }
        })

        if (customers.length === 0) return []

        const customerIds = customers.map((c) => c.id)

        const [stats, lastOrders] = await Promise.all([
            prisma.order.groupBy({
                by: ['customerId'],
                where: { tenantId, customerId: { in: customerIds } },
                _count: { _all: true },
                _sum: { totalAmount: true },
                _max: { createdAt: true }
            }),
            prisma.order.findMany({
                where: { tenantId, customerId: { in: customerIds } },
                orderBy: { createdAt: 'desc' },
                distinct: ['customerId'],
                select: { id: true, customerId: true, createdAt: true }
            })
        ])

        const statsById = new Map(
            stats.map((s) => [
                s.customerId as string,
                { count: s._count._all, total: s._sum.totalAmount ?? 0, lastAt: s._max.createdAt ?? null }
            ])
        )
        const lastById = new Map(lastOrders.map((o) => [o.customerId as string, { id: o.id, at: o.createdAt }]))

        return customers.map((c) => {
            const stat = statsById.get(c.id) ?? { count: 0, total: 0, lastAt: null }
            const last = lastById.get(c.id) ?? { id: null, at: null }

            return {
                id: c.id,
                phone: c.phone,
                name: c.name,
                email: c.email ?? null,
                address: c.address ?? null,
                ordersCount: stat.count,
                totalSpent: stat.total,
                lastOrderAt: stat.lastAt ?? last.at,
                lastOrderId: last.id
            }
        })
    }

    async getById(tenantId: string, id: string) {
        const customer = await prisma.customer.findUnique({
            where: { tenantId_id: { tenantId, id } },
            select: { id: true, phone: true, name: true, email: true, address: true }
        })

        const orders = await prisma.order.findMany({
            where: { tenantId, customerId: id },
            orderBy: { createdAt: 'desc' },
            take: 100,
            select: {
                id: true,
                status: true,
                totalAmount: true,
                customerName: true,
                customerPhone: true,
                customerAddress: true,
                createdAt: true,
                updatedAt: true
            }
        })

        const summary = customer
            ? {
                  id: customer.id,
                  phone: customer.phone,
                  name: customer.name,
                  address: customer.address ?? null,
                  lastOrderAt: orders[0]?.createdAt ?? null,
                  lastOrderId: orders[0]?.id ?? null
              }
            : null

        return { summary, orders }
    }

    async getByPhone(tenantId: string, phone: string) {
        const customer = await prisma.customer.findUnique({
            where: { tenantId_phone: { tenantId, phone } },
            select: { id: true, phone: true, name: true, email: true, address: true }
        })

        const orders = await prisma.order.findMany({
            where: { tenantId, customerId: customer?.id ?? '__nope__' },
            orderBy: { createdAt: 'desc' },
            take: 100,
            select: {
                id: true,
                status: true,
                totalAmount: true,
                customerName: true,
                customerPhone: true,
                customerAddress: true,
                createdAt: true,
                updatedAt: true
            }
        })

        const summary = customer
            ? {
                  id: customer.id,
                  phone: customer.phone,
                  name: customer.name,
                  address: customer.address ?? null,
                  lastOrderAt: orders[0]?.createdAt ?? null,
                  lastOrderId: orders[0]?.id ?? null
              }
            : null

        return { summary, orders }
    }
}
