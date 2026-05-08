import type { User } from '@prisma/client'
import prisma from '../../lib/prisma'

type SyncResource = 'products' | 'categories' | 'customers' | 'orders' | 'sales'

const SUPPORTED_RESOURCES: SyncResource[] = ['products', 'categories', 'customers', 'orders', 'sales']

export class SyncValidationError extends Error {
    statusCode: number
    statusMessage: string

    constructor(statusCode: number, statusMessage: string) {
        super(statusMessage)
        this.statusCode = statusCode
        this.statusMessage = statusMessage
    }
}

const parseSince = (raw: unknown): Date | null => {
    if (raw === undefined || raw === null || raw === '') return null
    if (typeof raw !== 'string') throw new SyncValidationError(400, 'Invalid since value')
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) throw new SyncValidationError(400, 'Invalid since value')
    return date
}

const allowedResourcesForUser = async (tenantId: string, user?: User): Promise<Set<SyncResource>> => {
    if (!user) return new Set()
    if (user.role !== 'staff') return new Set(SUPPORTED_RESOURCES)
    if (!user.staffRoleId) return new Set()

    const perms = await prisma.tenantStaffRolePermission.findMany({
        where: {
            tenantId,
            roleId: user.staffRoleId,
            action: 'read',
            resource: { in: SUPPORTED_RESOURCES }
        },
        select: { resource: true }
    })

    return new Set(perms.map((p) => p.resource as SyncResource))
}

const changedWhere = (tenantId: string, since: Date | null) => ({
    tenantId,
    ...(since ? { updatedAt: { gt: since } } : {})
})

export class SyncService {
    async pull(tenantId: string, user: User | undefined, rawSince: unknown) {
        const since = parseSince(rawSince)
        const allowed = await allowedResourcesForUser(tenantId, user)

        const [products, categories, customers, orders, sales] = await Promise.all([
            allowed.has('products')
                ? prisma.product.findMany({
                    where: changedWhere(tenantId, since),
                    orderBy: { updatedAt: 'asc' },
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        miniDescription: true,
                        description: true,
                        price: true,
                        stock: true,
                        lowStockThreshold: true,
                        isActive: true,
                        categoryId: true,
                        images: true,
                        updatedAt: true,
                        productImages: {
                            orderBy: [{ isMain: 'desc' }, { position: 'asc' }],
                            select: { id: true, url: true, isMain: true, position: true }
                        },
                        options: {
                            orderBy: { position: 'asc' },
                            select: {
                                id: true,
                                name: true,
                                displayType: true,
                                position: true,
                                values: {
                                    orderBy: { position: 'asc' },
                                    select: { id: true, label: true, position: true, meta: true }
                                }
                            }
                        },
                        variants: {
                            where: { isActive: true },
                            select: {
                                id: true,
                                price: true,
                                compareAtPrice: true,
                                cost: true,
                                stock: true,
                                sku: true,
                                skuLocked: true,
                                barcode: true,
                                isActive: true,
                                trackInventory: true,
                                safetyStock: true,
                                reserved: true,
                                optionValues: {
                                    select: {
                                        optionValueId: true,
                                        optionValue: {
                                            select: {
                                                id: true,
                                                label: true,
                                                optionId: true,
                                                option: { select: { id: true, name: true } }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                })
                : [],
            allowed.has('categories')
                ? prisma.category.findMany({
                    where: changedWhere(tenantId, since),
                    orderBy: { updatedAt: 'asc' },
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        imageUrl: true,
                        createdAt: true,
                        updatedAt: true,
                        _count: { select: { products: true, productLinks: true } }
                    }
                })
                : [],
            allowed.has('customers')
                ? prisma.customer.findMany({
                    where: changedWhere(tenantId, since),
                    orderBy: { updatedAt: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                        address: true,
                        updatedAt: true,
                        _count: { select: { sales: true } }
                    }
                })
                : [],
            allowed.has('orders')
                ? prisma.order.findMany({
                    where: changedWhere(tenantId, since),
                    orderBy: { updatedAt: 'asc' },
                    select: {
                        id: true,
                        status: true,
                        totalAmount: true,
                        customerId: true,
                        customerName: true,
                        customerPhone: true,
                        customerAddress: true,
                        createdAt: true,
                        updatedAt: true,
                        items: { select: { id: true, productId: true, quantity: true, price: true } }
                    }
                })
                : [],
            allowed.has('sales')
                ? prisma.sale.findMany({
                    where: changedWhere(tenantId, since),
                    orderBy: { updatedAt: 'asc' },
                    select: {
                        id: true,
                        customerId: true,
                        customerName: true,
                        customerPhone: true,
                        totalAmount: true,
                        status: true,
                        source: true,
                        createdAt: true,
                        updatedAt: true,
                        items: { select: { id: true, productId: true, variantId: true, quantity: true, price: true } }
                    }
                })
                : []
        ])

        return {
            serverTime: new Date().toISOString(),
            since: since?.toISOString() ?? null,
            allowedResources: Array.from(allowed.values()),
            changes: {
                products: products.map((p) => ({
                    ...p,
                    price: Number(p.price),
                    images: p.productImages.length > 0 ? p.productImages.map((img) => img.url) : p.images,
                    variants: p.variants.map((v) => ({
                        ...v,
                        price: Number(v.price),
                        compareAtPrice: v.compareAtPrice == null ? null : Number(v.compareAtPrice),
                        cost: v.cost == null ? null : Number(v.cost),
                        images: [],
                        optionValues: v.optionValues.map((entry) => ({
                            optionId: entry.optionValue.optionId,
                            optionValueId: entry.optionValueId,
                            option: entry.optionValue.option,
                            optionValue: {
                                id: entry.optionValue.id,
                                label: entry.optionValue.label
                            }
                        }))
                    }))
                })),
                categories: categories.map((c) => ({
                    ...c,
                    _count: {
                        products: Math.max(c._count.products, c._count.productLinks)
                    }
                })),
                customers: customers.map((c) => ({
                    ...c,
                    totalSpent: 0,
                    ordersCount: c._count.sales
                })),
                orders,
                sales: sales.map((s) => ({
                    ...s,
                    type: s.source === 'ORDER' ? 'ORDER' : 'POS'
                }))
            }
        }
    }
}
