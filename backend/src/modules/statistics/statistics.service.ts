import prisma from '../../lib/prisma'
import {
    ORDER_REVENUE_EXCLUDED_STATUSES,
    comparable,
    isoDay,
    numberOrZero,
    resolvePeriodWithPrevious,
    round2,
    type ResolvedPeriod,
    type StatsQuery
} from './statistics.types'

const DAY_MS = 24 * 60 * 60 * 1000

export type SalesStats = {
    period: { range: string; from: string; to: string; days: number }
    kpis: {
        revenue: ReturnType<typeof comparable>
        onlineRevenue: ReturnType<typeof comparable>
        posRevenue: ReturnType<typeof comparable>
        ordersCount: ReturnType<typeof comparable>
        avgBasket: ReturnType<typeof comparable>
    }
    trends: Array<{
        date: string
        ordersCount: number
        onlineRevenue: number
        posRevenue: number
        totalRevenue: number
    }>
    byCategory: Array<{ categoryId: string; title: string; revenue: number; quantity: number }>
}

export type DeliveryStats = {
    period: { range: string; from: string; to: string; days: number }
    kpis: {
        totalShipments: number
        deliveredRate: number
        returnedRate: number
        cancelledRate: number
        avgDeliveryDays: number | null
    }
    byProvider: Array<{
        provider: string
        total: number
        delivered: number
        returned: number
        cancelled: number
        inTransit: number
        deliveredRate: number
    }>
    byWilaya: Array<{
        wilayaCode: string
        total: number
        delivered: number
        returned: number
        deliveredRate: number
    }>
    byStatus: Record<string, number>
}

export type ProductsStats = {
    period: { range: string; from: string; to: string; days: number }
    kpis: {
        activeProducts: number
        lowStockProducts: number
        outOfStockProducts: number
        neverSoldProducts: number
        clearanceDiscountTotal: number
    }
    topProducts: Array<{ productId: string; title: string; quantity: number; revenue: number }>
    flopProducts: Array<{ productId: string; title: string; quantity: number; revenue: number }>
    stockRotation: Array<{ productId: string; title: string; stock: number; soldQuantity: number; rotation: number | null }>
    criticalStock: Array<{ productId: string; title: string; stock: number; lowStockThreshold: number }>
}

export type CustomersStats = {
    period: { range: string; from: string; to: string; days: number }
    kpis: {
        newCustomers: ReturnType<typeof comparable>
        returningCustomers: ReturnType<typeof comparable>
        repeatPurchaseRate: number
        avgOrdersPerCustomer: number
    }
    topCustomers: Array<{ customerId: string | null; name: string; phone: string; ordersCount: number; revenue: number }>
    byWilaya: Array<{ wilayaCode: string; customers: number; revenue: number }>
}

export type ProfitabilityStats = {
    period: { range: string; from: string; to: string; days: number }
    kpis: {
        revenue: number
        cogs: number
        grossMargin: number
        grossMarginPct: number | null
        shippingCost: number
        netMargin: number
        netMarginPct: number | null
        costDataCoverage: number
    }
    byProduct: Array<{
        productId: string
        title: string
        revenue: number
        cogs: number
        margin: number
        marginPct: number | null
        quantity: number
    }>
}

const productSelect = {
    select: { id: true, title: true, category: { select: { id: true, title: true } } }
}

export class StatisticsService {
    private buildOrderWhere(
        tenantId: string,
        period: ResolvedPeriod,
        query: StatsQuery,
        opts: { excludeCancelled?: boolean } = {}
    ) {
        const where: any = {
            tenantId,
            createdAt: { gte: period.fromAt, lte: period.toAt }
        }
        if (opts.excludeCancelled) where.status = { notIn: ORDER_REVENUE_EXCLUDED_STATUSES }
        if (query.wilayaCode) where.shippingWilayaCode = query.wilayaCode
        return where
    }

    async getSalesStats(tenantId: string, query: StatsQuery): Promise<SalesStats> {
        const period = resolvePeriodWithPrevious(query)
        const channel = query.channel || 'all'

        const wantsOnline = channel !== 'pos'
        const wantsPos = channel !== 'online'

        const [currentOrders, previousOrders, currentSales, previousSales, currentOrderItems] = await Promise.all([
            wantsOnline
                ? prisma.order.findMany({
                      where: this.buildOrderWhere(tenantId, period, query, { excludeCancelled: true }),
                      select: { createdAt: true, totalAmount: true }
                  })
                : Promise.resolve([]),
            wantsOnline
                ? prisma.order.findMany({
                      where: this.buildOrderWhere(tenantId, period.previous, query, { excludeCancelled: true }),
                      select: { totalAmount: true }
                  })
                : Promise.resolve([]),
            wantsPos
                ? prisma.sale.findMany({
                      where: { tenantId, source: 'POS', status: 'COMPLETED', createdAt: { gte: period.fromAt, lte: period.toAt } },
                      select: { createdAt: true, totalAmount: true }
                  })
                : Promise.resolve([]),
            wantsPos
                ? prisma.sale.findMany({
                      where: {
                          tenantId,
                          source: 'POS',
                          status: 'COMPLETED',
                          createdAt: { gte: period.previous.fromAt, lte: period.previous.toAt }
                      },
                      select: { totalAmount: true }
                  })
                : Promise.resolve([]),
            prisma.orderItem.findMany({
                where: {
                    tenantId,
                    order: this.buildOrderWhere(tenantId, period, query, { excludeCancelled: true })
                },
                select: {
                    quantity: true,
                    price: true,
                    lineTotal: true,
                    product: {
                        select: {
                            category: { select: { id: true, title: true } },
                            categoryLinks: { select: { category: { select: { id: true, title: true } } } }
                        }
                    }
                }
            })
        ])

        const trends = Array.from({ length: period.days }).map((_, index) => {
            const date = new Date(period.fromAt.getTime() + index * DAY_MS)
            return { date: isoDay(date), ordersCount: 0, onlineRevenue: 0, posRevenue: 0, totalRevenue: 0 }
        })
        const trendByDate = new Map(trends.map((row) => [row.date, row]))

        let onlineRevenue = 0
        for (const order of currentOrders) {
            const row = trendByDate.get(isoDay(order.createdAt))
            const amount = numberOrZero(order.totalAmount)
            onlineRevenue = round2(onlineRevenue + amount)
            if (!row) continue
            row.ordersCount += 1
            row.onlineRevenue = round2(row.onlineRevenue + amount)
        }

        let posRevenue = 0
        for (const sale of currentSales) {
            const row = trendByDate.get(isoDay(sale.createdAt))
            const amount = numberOrZero(sale.totalAmount)
            posRevenue = round2(posRevenue + amount)
            if (!row) continue
            row.posRevenue = round2(row.posRevenue + amount)
        }
        for (const row of trends) row.totalRevenue = round2(row.onlineRevenue + row.posRevenue)

        const prevOnlineRevenue = previousOrders.reduce((sum, o) => sum + numberOrZero(o.totalAmount), 0)
        const prevPosRevenue = previousSales.reduce((sum, s) => sum + numberOrZero(s.totalAmount), 0)

        const totalRevenue = round2(onlineRevenue + posRevenue)
        const prevTotalRevenue = round2(prevOnlineRevenue + prevPosRevenue)
        const ordersCount = currentOrders.length + currentSales.length
        const prevOrdersCount = previousOrders.length + previousSales.length
        const avgBasket = ordersCount > 0 ? totalRevenue / ordersCount : 0
        const prevAvgBasket = prevOrdersCount > 0 ? prevTotalRevenue / prevOrdersCount : 0

        const categoryAgg = new Map<string, { title: string; revenue: number; quantity: number }>()
        for (const item of currentOrderItems) {
            const quantity = numberOrZero(item.quantity)
            const revenue = round2(numberOrZero(item.lineTotal) || quantity * numberOrZero(item.price))
            const categories = new Map<string, { id: string; title: string }>()
            if (item.product?.category?.id) categories.set(item.product.category.id, item.product.category as any)
            for (const link of item.product?.categoryLinks || []) {
                if (link.category?.id) categories.set(link.category.id, link.category as any)
            }
            if (query.categoryId && !categories.has(query.categoryId)) continue
            for (const category of categories.values()) {
                const current = categoryAgg.get(category.id) || { title: category.title || '—', revenue: 0, quantity: 0 }
                current.revenue = round2(current.revenue + revenue)
                current.quantity += quantity
                categoryAgg.set(category.id, current)
            }
        }

        const byCategory = Array.from(categoryAgg.entries())
            .map(([categoryId, row]) => ({ categoryId, ...row }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 12)

        return {
            period: { range: period.range, from: period.from, to: period.to, days: period.days },
            kpis: {
                revenue: comparable(totalRevenue, prevTotalRevenue),
                onlineRevenue: comparable(onlineRevenue, prevOnlineRevenue),
                posRevenue: comparable(posRevenue, prevPosRevenue),
                ordersCount: comparable(ordersCount, prevOrdersCount),
                avgBasket: comparable(avgBasket, prevAvgBasket)
            },
            trends,
            byCategory
        }
    }

    async getDeliveryStats(tenantId: string, query: StatsQuery): Promise<DeliveryStats> {
        const period = resolvePeriodWithPrevious(query)
        const where: any = { tenantId, createdAt: { gte: period.fromAt, lte: period.toAt } }
        if (query.provider) where.provider = query.provider
        if (query.wilayaCode) where.wilayaCode = query.wilayaCode

        const shipments = await prisma.shipment.findMany({
            where,
            select: {
                provider: true,
                status: true,
                wilayaCode: true,
                createdAt: true,
                updatedAt: true,
                events: {
                    where: { status: 'DELIVERED' },
                    select: { eventTime: true },
                    orderBy: { eventTime: 'asc' },
                    take: 1
                }
            }
        })

        const byStatus: Record<string, number> = {}
        const providerAgg = new Map<string, { total: number; delivered: number; returned: number; cancelled: number; inTransit: number }>()
        const wilayaAgg = new Map<string, { total: number; delivered: number; returned: number }>()
        let deliveredCount = 0
        let returnedCount = 0
        let cancelledCount = 0
        let deliveryDurationSum = 0
        let deliveryDurationCount = 0

        for (const shipment of shipments) {
            byStatus[shipment.status] = (byStatus[shipment.status] || 0) + 1

            const provider = providerAgg.get(shipment.provider) || { total: 0, delivered: 0, returned: 0, cancelled: 0, inTransit: 0 }
            provider.total += 1
            if (shipment.status === 'DELIVERED') provider.delivered += 1
            if (shipment.status === 'RETURNED') provider.returned += 1
            if (shipment.status === 'CANCELLED') provider.cancelled += 1
            if (shipment.status === 'IN_TRANSIT') provider.inTransit += 1
            providerAgg.set(shipment.provider, provider)

            if (shipment.wilayaCode) {
                const wilaya = wilayaAgg.get(shipment.wilayaCode) || { total: 0, delivered: 0, returned: 0 }
                wilaya.total += 1
                if (shipment.status === 'DELIVERED') wilaya.delivered += 1
                if (shipment.status === 'RETURNED') wilaya.returned += 1
                wilayaAgg.set(shipment.wilayaCode, wilaya)
            }

            if (shipment.status === 'DELIVERED') {
                deliveredCount += 1
                const deliveredAt = shipment.events?.[0]?.eventTime
                if (deliveredAt) {
                    deliveryDurationSum += deliveredAt.getTime() - shipment.createdAt.getTime()
                    deliveryDurationCount += 1
                }
            }
            if (shipment.status === 'RETURNED') returnedCount += 1
            if (shipment.status === 'CANCELLED') cancelledCount += 1
        }

        const total = shipments.length
        const byProvider = Array.from(providerAgg.entries())
            .map(([provider, row]) => ({
                provider,
                ...row,
                deliveredRate: row.total > 0 ? round2((row.delivered / row.total) * 100) : 0
            }))
            .sort((a, b) => b.total - a.total)

        const byWilaya = Array.from(wilayaAgg.entries())
            .map(([wilayaCode, row]) => ({
                wilayaCode,
                ...row,
                deliveredRate: row.total > 0 ? round2((row.delivered / row.total) * 100) : 0
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 20)

        return {
            period: { range: period.range, from: period.from, to: period.to, days: period.days },
            kpis: {
                totalShipments: total,
                deliveredRate: total > 0 ? round2((deliveredCount / total) * 100) : 0,
                returnedRate: total > 0 ? round2((returnedCount / total) * 100) : 0,
                cancelledRate: total > 0 ? round2((cancelledCount / total) * 100) : 0,
                avgDeliveryDays: deliveryDurationCount > 0 ? round2(deliveryDurationSum / deliveryDurationCount / DAY_MS) : null
            },
            byProvider,
            byWilaya,
            byStatus
        }
    }

    async getProductsStats(tenantId: string, query: StatsQuery): Promise<ProductsStats> {
        const period = resolvePeriodWithPrevious(query)
        const channel = query.channel || 'all'
        const wantsOnline = channel !== 'pos'
        const wantsPos = channel !== 'online'

        const [orderItems, saleItems, allProducts, periodOrders] = await Promise.all([
            wantsOnline
                ? prisma.orderItem.findMany({
                      where: {
                          tenantId,
                          order: this.buildOrderWhere(tenantId, period, query, { excludeCancelled: true }),
                          ...(query.categoryId ? { product: { categoryId: query.categoryId } } : {})
                      },
                      select: { productId: true, quantity: true, price: true, lineTotal: true, product: productSelect }
                  })
                : Promise.resolve([]),
            wantsPos
                ? prisma.saleItem.findMany({
                      where: {
                          tenantId,
                          sale: { tenantId, source: 'POS', status: 'COMPLETED', createdAt: { gte: period.fromAt, lte: period.toAt } },
                          ...(query.categoryId ? { product: { categoryId: query.categoryId } } : {})
                      },
                      select: { productId: true, quantity: true, price: true, product: productSelect }
                  })
                : Promise.resolve([]),
            prisma.product.findMany({
                where: { tenantId, ...(query.categoryId ? { categoryId: query.categoryId } : {}) },
                select: { id: true, title: true, stock: true, lowStockThreshold: true, isActive: true }
            }),
            prisma.order.findMany({
                where: this.buildOrderWhere(tenantId, period, query),
                select: { clearanceDiscountAmount: true }
            })
        ])

        type Agg = { title: string; quantity: number; revenue: number }
        const productAgg = new Map<string, Agg>()
        const pushAgg = (productId: string, title: string | undefined, quantity: number, revenue: number) => {
            const current = productAgg.get(productId) || { title: title || '—', quantity: 0, revenue: 0 }
            current.quantity += quantity
            current.revenue = round2(current.revenue + revenue)
            productAgg.set(productId, current)
        }
        for (const item of orderItems) {
            const quantity = numberOrZero(item.quantity)
            const revenue = round2(numberOrZero(item.lineTotal) || quantity * numberOrZero(item.price))
            pushAgg(item.productId, item.product?.title, quantity, revenue)
        }
        for (const item of saleItems) {
            const quantity = numberOrZero(item.quantity)
            const revenue = round2(quantity * numberOrZero(item.price))
            pushAgg(item.productId, item.product?.title, quantity, revenue)
        }

        const ranked = Array.from(productAgg.entries()).map(([productId, row]) => ({ productId, ...row }))
        const topProducts = [...ranked].sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity).slice(0, 10)
        const flopProducts = [...ranked]
            .filter((row) => row.quantity > 0)
            .sort((a, b) => a.revenue - b.revenue || a.quantity - b.quantity)
            .slice(0, 10)

        const soldProductIds = new Set(ranked.map((r) => r.productId))
        const neverSoldProducts = allProducts.filter((p) => !soldProductIds.has(p.id) && p.isActive).length

        const stockRotation = allProducts
            .map((product) => {
                const sold = productAgg.get(product.id)?.quantity || 0
                const avgStock = numberOrZero(product.stock)
                const rotation = avgStock > 0 ? round2(sold / avgStock) : sold > 0 ? null : 0
                return { productId: product.id, title: product.title, stock: avgStock, soldQuantity: sold, rotation }
            })
            .sort((a, b) => (b.rotation ?? -1) - (a.rotation ?? -1))
            .slice(0, 15)

        const criticalStock = allProducts
            .filter((p) => numberOrZero(p.stock) <= numberOrZero(p.lowStockThreshold))
            .sort((a, b) => numberOrZero(a.stock) - numberOrZero(b.stock))
            .slice(0, 10)
            .map((p) => ({ productId: p.id, title: p.title, stock: numberOrZero(p.stock), lowStockThreshold: numberOrZero(p.lowStockThreshold) }))

        const clearanceDiscountTotal = round2(periodOrders.reduce((sum, o) => sum + numberOrZero(o.clearanceDiscountAmount), 0))

        return {
            period: { range: period.range, from: period.from, to: period.to, days: period.days },
            kpis: {
                activeProducts: allProducts.filter((p) => p.isActive).length,
                lowStockProducts: allProducts.filter((p) => numberOrZero(p.stock) > 0 && numberOrZero(p.stock) <= numberOrZero(p.lowStockThreshold)).length,
                outOfStockProducts: allProducts.filter((p) => numberOrZero(p.stock) <= 0).length,
                neverSoldProducts,
                clearanceDiscountTotal
            },
            topProducts,
            flopProducts,
            stockRotation,
            criticalStock
        }
    }

    async getCustomersStats(tenantId: string, query: StatsQuery): Promise<CustomersStats> {
        const period = resolvePeriodWithPrevious(query)

        const [periodOrders, previousPeriodOrders, allCustomerOrderCounts] = await Promise.all([
            prisma.order.findMany({
                where: this.buildOrderWhere(tenantId, period, query, { excludeCancelled: true }),
                select: {
                    customerId: true,
                    customerName: true,
                    customerPhone: true,
                    totalAmount: true,
                    shippingWilayaCode: true,
                    createdAt: true
                }
            }),
            prisma.order.findMany({
                where: this.buildOrderWhere(tenantId, period.previous, query, { excludeCancelled: true }),
                select: { customerId: true }
            }),
            prisma.order.groupBy({
                by: ['customerId'],
                where: { tenantId, customerId: { not: null }, status: { notIn: ORDER_REVENUE_EXCLUDED_STATUSES } },
                _count: { _all: true }
            })
        ])

        const ordersCountByCustomer = new Map(allCustomerOrderCounts.map((row) => [row.customerId, row._count._all]))

        const firstOrderDates = await prisma.order.groupBy({
            by: ['customerId'],
            where: { tenantId, customerId: { not: null } },
            _min: { createdAt: true }
        })
        const firstOrderByCustomer = new Map(firstOrderDates.map((row) => [row.customerId, row._min.createdAt]))

        const customersInPeriod = new Set(periodOrders.map((o) => o.customerId).filter(Boolean) as string[])
        let newCustomers = 0
        let returningCustomers = 0
        for (const customerId of customersInPeriod) {
            const firstOrderAt = firstOrderByCustomer.get(customerId)
            if (firstOrderAt && firstOrderAt >= period.fromAt && firstOrderAt <= period.toAt) newCustomers += 1
            else returningCustomers += 1
        }

        const prevCustomersInPeriod = new Set(previousPeriodOrders.map((o) => o.customerId).filter(Boolean) as string[])
        let prevNewCustomers = 0
        let prevReturningCustomers = 0
        for (const customerId of prevCustomersInPeriod) {
            const firstOrderAt = firstOrderByCustomer.get(customerId)
            if (firstOrderAt && firstOrderAt >= period.previous.fromAt && firstOrderAt <= period.previous.toAt) prevNewCustomers += 1
            else prevReturningCustomers += 1
        }

        const repeatCustomers = Array.from(ordersCountByCustomer.values()).filter((c) => c > 1).length
        const totalCustomersWithOrders = ordersCountByCustomer.size
        const repeatPurchaseRate = totalCustomersWithOrders > 0 ? round2((repeatCustomers / totalCustomersWithOrders) * 100) : 0
        const totalOrdersAllTime = Array.from(ordersCountByCustomer.values()).reduce((sum, c) => sum + c, 0)
        const avgOrdersPerCustomer = totalCustomersWithOrders > 0 ? round2(totalOrdersAllTime / totalCustomersWithOrders) : 0

        type CustomerAgg = { customerId: string | null; name: string; phone: string; ordersCount: number; revenue: number }
        const customerAgg = new Map<string, CustomerAgg>()
        const wilayaAgg = new Map<string, { customers: Set<string>; revenue: number }>()
        for (const order of periodOrders) {
            const key = order.customerId || `phone:${order.customerPhone}`
            const current = customerAgg.get(key) || {
                customerId: order.customerId,
                name: order.customerName,
                phone: order.customerPhone,
                ordersCount: 0,
                revenue: 0
            }
            current.ordersCount += 1
            current.revenue = round2(current.revenue + numberOrZero(order.totalAmount))
            customerAgg.set(key, current)

            if (order.shippingWilayaCode) {
                const wilaya = wilayaAgg.get(order.shippingWilayaCode) || { customers: new Set<string>(), revenue: 0 }
                wilaya.customers.add(key)
                wilaya.revenue = round2(wilaya.revenue + numberOrZero(order.totalAmount))
                wilayaAgg.set(order.shippingWilayaCode, wilaya)
            }
        }

        const topCustomers = Array.from(customerAgg.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10)

        const byWilaya = Array.from(wilayaAgg.entries())
            .map(([wilayaCode, row]) => ({ wilayaCode, customers: row.customers.size, revenue: row.revenue }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 20)

        return {
            period: { range: period.range, from: period.from, to: period.to, days: period.days },
            kpis: {
                newCustomers: comparable(newCustomers, prevNewCustomers),
                returningCustomers: comparable(returningCustomers, prevReturningCustomers),
                repeatPurchaseRate,
                avgOrdersPerCustomer
            },
            topCustomers,
            byWilaya
        }
    }

    async getProfitabilityStats(tenantId: string, query: StatsQuery): Promise<ProfitabilityStats> {
        const period = resolvePeriodWithPrevious(query)
        const channel = query.channel || 'all'
        const wantsOnline = channel !== 'pos'
        const wantsPos = channel !== 'online'

        const [orderItems, saleItems, periodOrders] = await Promise.all([
            wantsOnline
                ? prisma.orderItem.findMany({
                      where: { tenantId, order: this.buildOrderWhere(tenantId, period, query, { excludeCancelled: true }) },
                      select: {
                          productId: true,
                          variantId: true,
                          quantity: true,
                          price: true,
                          lineTotal: true,
                          product: { select: { title: true } },
                          variant: { select: { cost: true } }
                      }
                  })
                : Promise.resolve([]),
            wantsPos
                ? prisma.saleItem.findMany({
                      where: {
                          tenantId,
                          sale: { tenantId, source: 'POS', status: 'COMPLETED', createdAt: { gte: period.fromAt, lte: period.toAt } }
                      },
                      select: {
                          productId: true,
                          variantId: true,
                          quantity: true,
                          price: true,
                          product: { select: { title: true } },
                          variant: { select: { cost: true } }
                      }
                  })
                : Promise.resolve([]),
            prisma.order.findMany({
                where: this.buildOrderWhere(tenantId, period, query, { excludeCancelled: true }),
                select: { shippingAmount: true }
            })
        ])

        // Fallback average cost per product when a sold line has no variant-level cost recorded.
        const productIds = new Set<string>()
        for (const item of orderItems) productIds.add(item.productId)
        for (const item of saleItems) productIds.add(item.productId)

        const variantCostsByProduct = productIds.size
            ? await prisma.productVariant.findMany({
                  where: { tenantId, productId: { in: Array.from(productIds) } },
                  select: { productId: true, cost: true }
              })
            : []
        const avgCostByProduct = new Map<string, number>()
        const costSums = new Map<string, { sum: number; count: number }>()
        for (const v of variantCostsByProduct) {
            const cost = numberOrZero(v.cost)
            if (cost <= 0) continue
            const entry = costSums.get(v.productId) || { sum: 0, count: 0 }
            entry.sum += cost
            entry.count += 1
            costSums.set(v.productId, entry)
        }
        for (const [productId, entry] of costSums.entries()) {
            avgCostByProduct.set(productId, entry.count > 0 ? entry.sum / entry.count : 0)
        }

        type Agg = { title: string; revenue: number; cogs: number; quantity: number }
        const productAgg = new Map<string, Agg>()
        let itemsWithKnownCost = 0
        let itemsTotal = 0

        const applyItem = (
            productId: string,
            title: string | undefined,
            quantity: number,
            revenue: number,
            variantCost: number | null | undefined
        ) => {
            itemsTotal += 1
            const unitCost = numberOrZero(variantCost) > 0 ? numberOrZero(variantCost) : avgCostByProduct.get(productId) ?? 0
            if (unitCost > 0) itemsWithKnownCost += 1
            const cogs = round2(unitCost * quantity)
            const current = productAgg.get(productId) || { title: title || '—', revenue: 0, cogs: 0, quantity: 0 }
            current.revenue = round2(current.revenue + revenue)
            current.cogs = round2(current.cogs + cogs)
            current.quantity += quantity
            productAgg.set(productId, current)
        }

        for (const item of orderItems) {
            const quantity = numberOrZero(item.quantity)
            const revenue = round2(numberOrZero(item.lineTotal) || quantity * numberOrZero(item.price))
            applyItem(item.productId, item.product?.title, quantity, revenue, item.variant?.cost as any)
        }
        for (const item of saleItems) {
            const quantity = numberOrZero(item.quantity)
            const revenue = round2(quantity * numberOrZero(item.price))
            applyItem(item.productId, item.product?.title, quantity, revenue, item.variant?.cost as any)
        }

        const revenue = round2(Array.from(productAgg.values()).reduce((sum, r) => sum + r.revenue, 0))
        const cogs = round2(Array.from(productAgg.values()).reduce((sum, r) => sum + r.cogs, 0))
        const grossMargin = round2(revenue - cogs)
        const shippingCost = round2(periodOrders.reduce((sum, o) => sum + numberOrZero(o.shippingAmount), 0))
        const netMargin = round2(grossMargin - shippingCost)

        const byProduct = Array.from(productAgg.entries())
            .map(([productId, row]) => ({
                productId,
                title: row.title,
                revenue: row.revenue,
                cogs: row.cogs,
                margin: round2(row.revenue - row.cogs),
                marginPct: row.revenue > 0 ? round2(((row.revenue - row.cogs) / row.revenue) * 100) : null,
                quantity: row.quantity
            }))
            .sort((a, b) => b.margin - a.margin)
            .slice(0, 20)

        return {
            period: { range: period.range, from: period.from, to: period.to, days: period.days },
            kpis: {
                revenue,
                cogs,
                grossMargin,
                grossMarginPct: revenue > 0 ? round2((grossMargin / revenue) * 100) : null,
                shippingCost,
                netMargin,
                netMarginPct: revenue > 0 ? round2((netMargin / revenue) * 100) : null,
                costDataCoverage: itemsTotal > 0 ? round2((itemsWithKnownCost / itemsTotal) * 100) : 0
            },
            byProduct
        }
    }
}
