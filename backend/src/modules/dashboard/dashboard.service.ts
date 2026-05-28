import prisma from '../../lib/prisma'

export type AdminDashboardRange = 'today' | '7d' | '30d' | '90d' | 'custom'

export type AdminDashboardQuery = {
    range: AdminDashboardRange
    from?: Date | null
    to?: Date | null
}

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
    period: {
        range: AdminDashboardRange
        from: string
        to: string
        days: number
    }
    revenue: {
        total: number
        orders: number
        pos: number
    }
    trends: Array<{
        date: string
        ordersCount: number
        ordersRevenue: number
        posRevenue: number
        totalRevenue: number
    }>
    topProducts: Array<{
        productId: string
        title: string
        quantity: number
        revenue: number
    }>
    topCategories: Array<{
        categoryId: string
        title: string
        quantity: number
        revenue: number
    }>
    criticalStock: Array<{
        productId: string
        title: string
        stock: number
        lowStockThreshold: number
    }>
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

const DAY_MS = 24 * 60 * 60 * 1000
const ORDER_REVENUE_EXCLUDED_STATUSES = ['CANCELLED', 'RETURNED']

const startOfUtcDay = (date: Date) =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0))

const endOfUtcDay = (date: Date) =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999))

const isoDay = (date: Date) => startOfUtcDay(date).toISOString().slice(0, 10)

const numberOrZero = (value: unknown) => {
    const n = Number(value ?? 0)
    return Number.isFinite(n) ? n : 0
}

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

type ResolvedPeriod = {
    range: AdminDashboardRange
    fromAt: Date
    toAt: Date
    from: string
    to: string
    days: number
}

export class DashboardService {
    private resolvePeriod(query: AdminDashboardQuery): ResolvedPeriod {
        const now = new Date()
        const range = query.range || '7d'

        if (range === 'custom' && query.from && query.to) {
            const fromAt = startOfUtcDay(query.from)
            const toAt = endOfUtcDay(query.to)
            const days = Math.floor((startOfUtcDay(query.to).getTime() - startOfUtcDay(query.from).getTime()) / DAY_MS) + 1
            return { range, fromAt, toAt, from: isoDay(fromAt), to: isoDay(toAt), days }
        }

        const days = range === 'today' ? 1 : range === '90d' ? 90 : range === '30d' ? 30 : 7
        const toAt = endOfUtcDay(now)
        const fromAt = startOfUtcDay(new Date(toAt.getTime() - (days - 1) * DAY_MS))
        return { range, fromAt, toAt, from: isoDay(fromAt), to: isoDay(toAt), days }
    }

    async getAdminDashboard(tenantId: string, query: AdminDashboardQuery = { range: '7d' }): Promise<AdminDashboardData> {
        const period = this.resolvePeriod(query)
        const sevenDaysAgo = new Date(Date.now() - 7 * DAY_MS)

        const [
            products,
            categories,
            orders,
            lowStockProducts,
            outOfStockProducts,
            ordersByStatusGrouped,
            recentOrders,
            last7dOrders,
            periodOrders,
            periodPosSales,
            periodOrderItems,
            periodPosSaleItems,
            tenantProducts
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
            }),
            prisma.order.findMany({
                where: {
                    tenantId,
                    createdAt: { gte: period.fromAt, lte: period.toAt },
                    status: { notIn: ORDER_REVENUE_EXCLUDED_STATUSES }
                },
                select: { createdAt: true, totalAmount: true }
            }),
            prisma.sale.findMany({
                where: {
                    tenantId,
                    source: 'POS',
                    status: 'COMPLETED',
                    createdAt: { gte: period.fromAt, lte: period.toAt }
                },
                select: { createdAt: true, totalAmount: true }
            }),
            prisma.orderItem.findMany({
                where: {
                    tenantId,
                    order: {
                        tenantId,
                        createdAt: { gte: period.fromAt, lte: period.toAt },
                        status: { notIn: ORDER_REVENUE_EXCLUDED_STATUSES }
                    }
                },
                select: {
                    productId: true,
                    quantity: true,
                    price: true,
                    lineTotal: true,
                    product: {
                        select: {
                            title: true,
                            category: { select: { id: true, title: true } },
                            categoryLinks: {
                                select: {
                                    category: { select: { id: true, title: true } }
                                }
                            }
                        }
                    }
                }
            }),
            prisma.saleItem.findMany({
                where: {
                    tenantId,
                    sale: {
                        tenantId,
                        source: 'POS',
                        status: 'COMPLETED',
                        createdAt: { gte: period.fromAt, lte: period.toAt }
                    }
                },
                select: {
                    productId: true,
                    quantity: true,
                    price: true,
                    product: {
                        select: {
                            title: true,
                            category: { select: { id: true, title: true } },
                            categoryLinks: {
                                select: {
                                    category: { select: { id: true, title: true } }
                                }
                            }
                        }
                    }
                }
            }),
            prisma.product.findMany({
                where: { tenantId },
                select: {
                    id: true,
                    title: true,
                    stock: true,
                    lowStockThreshold: true
                }
            })
        ])

        const ordersByStatus: Record<string, number> = {}
        for (const row of ordersByStatusGrouped) {
            ordersByStatus[row.status] = row._count._all
        }

        const trends = Array.from({ length: period.days }).map((_, index) => {
            const date = new Date(period.fromAt.getTime() + index * DAY_MS)
            return {
                date: isoDay(date),
                ordersCount: 0,
                ordersRevenue: 0,
                posRevenue: 0,
                totalRevenue: 0
            }
        })
        const trendByDate = new Map(trends.map((row) => [row.date, row]))

        let ordersRevenue = 0
        for (const order of periodOrders) {
            const day = isoDay(order.createdAt)
            const row = trendByDate.get(day)
            if (!row) continue
            const amount = numberOrZero(order.totalAmount)
            row.ordersCount += 1
            row.ordersRevenue = round2(row.ordersRevenue + amount)
            ordersRevenue = round2(ordersRevenue + amount)
        }

        let posRevenue = 0
        for (const sale of periodPosSales) {
            const day = isoDay(sale.createdAt)
            const row = trendByDate.get(day)
            if (!row) continue
            const amount = numberOrZero(sale.totalAmount)
            row.posRevenue = round2(row.posRevenue + amount)
            posRevenue = round2(posRevenue + amount)
        }

        for (const row of trends) {
            row.totalRevenue = round2(row.ordersRevenue + row.posRevenue)
        }

        type AggregateRow = { title: string; quantity: number; revenue: number }
        const productAgg = new Map<string, AggregateRow>()
        const categoryAgg = new Map<string, AggregateRow>()

        const pushAggregate = (
            productId: string,
            productTitle: string | null | undefined,
            quantity: number,
            revenue: number,
            categoriesList: Array<{ id: string; title: string }>
        ) => {
            const pKey = productId
            const productCurrent = productAgg.get(pKey) || {
                title: productTitle || '—',
                quantity: 0,
                revenue: 0
            }
            productCurrent.quantity += quantity
            productCurrent.revenue = round2(productCurrent.revenue + revenue)
            if (!productCurrent.title || productCurrent.title === '—') {
                productCurrent.title = productTitle || '—'
            }
            productAgg.set(pKey, productCurrent)

            for (const category of categoriesList) {
                const cKey = category.id
                const current = categoryAgg.get(cKey) || {
                    title: category.title || '—',
                    quantity: 0,
                    revenue: 0
                }
                current.quantity += quantity
                current.revenue = round2(current.revenue + revenue)
                categoryAgg.set(cKey, current)
            }
        }

        for (const item of periodOrderItems) {
            const quantity = numberOrZero(item.quantity)
            const fallbackRevenue = quantity * numberOrZero(item.price)
            const revenue = round2(numberOrZero(item.lineTotal) || fallbackRevenue)
            const categoriesForItem = new Map<string, { id: string; title: string }>()

            if (item.product?.category?.id) {
                categoriesForItem.set(item.product.category.id, {
                    id: item.product.category.id,
                    title: item.product.category.title || '—'
                })
            }
            for (const link of item.product?.categoryLinks || []) {
                if (!link.category?.id) continue
                categoriesForItem.set(link.category.id, {
                    id: link.category.id,
                    title: link.category.title || '—'
                })
            }

            pushAggregate(
                item.productId,
                item.product?.title,
                quantity,
                revenue,
                Array.from(categoriesForItem.values())
            )
        }

        for (const item of periodPosSaleItems) {
            const quantity = numberOrZero(item.quantity)
            const revenue = round2(quantity * numberOrZero(item.price))
            const categoriesForItem = new Map<string, { id: string; title: string }>()

            if (item.product?.category?.id) {
                categoriesForItem.set(item.product.category.id, {
                    id: item.product.category.id,
                    title: item.product.category.title || '—'
                })
            }
            for (const link of item.product?.categoryLinks || []) {
                if (!link.category?.id) continue
                categoriesForItem.set(link.category.id, {
                    id: link.category.id,
                    title: link.category.title || '—'
                })
            }

            pushAggregate(
                item.productId,
                item.product?.title,
                quantity,
                revenue,
                Array.from(categoriesForItem.values())
            )
        }

        const topProducts = Array.from(productAgg.entries())
            .map(([productId, row]) => ({
                productId,
                title: row.title,
                quantity: row.quantity,
                revenue: row.revenue
            }))
            .sort((a, b) => {
                if (b.revenue !== a.revenue) return b.revenue - a.revenue
                return b.quantity - a.quantity
            })
            .slice(0, 8)

        const topCategories = Array.from(categoryAgg.entries())
            .map(([categoryId, row]) => ({
                categoryId,
                title: row.title,
                quantity: row.quantity,
                revenue: row.revenue
            }))
            .sort((a, b) => {
                if (b.revenue !== a.revenue) return b.revenue - a.revenue
                return b.quantity - a.quantity
            })
            .slice(0, 8)

        const criticalStock = tenantProducts
            .filter((product) => numberOrZero(product.stock) <= numberOrZero(product.lowStockThreshold))
            .sort((a, b) => {
                const aGap = numberOrZero(a.stock) - numberOrZero(a.lowStockThreshold)
                const bGap = numberOrZero(b.stock) - numberOrZero(b.lowStockThreshold)
                if (aGap !== bGap) return aGap - bGap
                return numberOrZero(a.stock) - numberOrZero(b.stock)
            })
            .slice(0, 8)
            .map((product) => ({
                productId: product.id,
                title: product.title,
                stock: numberOrZero(product.stock),
                lowStockThreshold: numberOrZero(product.lowStockThreshold)
            }))

        const revenue7d = last7dOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0)

        return {
            counts: { products, categories, orders },
            last7d: { orders: last7dOrders.length, revenue: revenue7d },
            inventory: { lowStockProducts, outOfStockProducts },
            period: {
                range: period.range,
                from: period.from,
                to: period.to,
                days: period.days
            },
            revenue: {
                total: round2(ordersRevenue + posRevenue),
                orders: round2(ordersRevenue),
                pos: round2(posRevenue)
            },
            trends,
            topProducts,
            topCategories,
            criticalStock,
            ordersByStatus,
            recentOrders
        }
    }
}
