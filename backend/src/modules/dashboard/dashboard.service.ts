import prisma from '../../lib/prisma'

export type AdminDashboardData = {
    counts: {
        products: number
        categories: number
        orders: number
    }
    last7d: {
        orders: number
        revenue: number
    }
    inventory: {
        lowStockProducts: number
        outOfStockProducts: number
    }
    ordersByStatus: Record<string, number>
    recentOrders: Array<{
        id: string
        status: string
        totalAmount: number
        customerName: string
        customerPhone: string
        createdAt: Date
    }>
}

export class DashboardService {
    async getAdminDashboard(tenantId: string): Promise<AdminDashboardData> {
        const now = Date.now()
        const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

        const [
            products,
            categories,
            orders,
            lowStockProducts,
            outOfStockProducts,
            ordersByStatusGrouped,
            recentOrders,
            last7dOrders
        ] = await Promise.all([
            prisma.product.count({ where: { tenantId } }),
            prisma.category.count({ where: { tenantId } }),
            prisma.order.count({ where: { tenantId } }),
            prisma.product.count({ where: { tenantId, stock: { lte: 5 } } }),
            prisma.product.count({ where: { tenantId, stock: { lte: 0 } } }),
            prisma.order.groupBy({
                by: ['status'],
                where: { tenantId },
                _count: { _all: true }
            }),
            prisma.order.findMany({
                where: { tenantId },
                select: {
                    id: true,
                    status: true,
                    totalAmount: true,
                    customerName: true,
                    customerPhone: true,
                    createdAt: true
                },
                orderBy: { createdAt: 'desc' },
                take: 8
            }),
            prisma.order.findMany({
                where: { tenantId, createdAt: { gte: sevenDaysAgo } },
                select: { totalAmount: true }
            })
        ])

        const ordersByStatus: Record<string, number> = {}
        for (const row of ordersByStatusGrouped) {
            ordersByStatus[row.status] = row._count._all
        }

        const revenue7d = last7dOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0)

        return {
            counts: { products, categories, orders },
            last7d: { orders: last7dOrders.length, revenue: revenue7d },
            inventory: { lowStockProducts, outOfStockProducts },
            ordersByStatus,
            recentOrders
        }
    }
}

