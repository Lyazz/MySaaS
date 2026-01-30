import prisma from '../../lib/prisma'

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

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const

export class OrdersService {
    async list(tenantId: string, filters: { status?: string; search?: string }) {
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

    async updateStatus(tenantId: string, id: string, status: string) {
        if (!status || !ORDER_STATUSES.includes(status as any)) {
            throw new OrderValidationError(400, 'Invalid status value')
        }

        const updated = await prisma.order.updateMany({
            where: { id, tenantId },
            data: { status }
        })

        if (updated.count === 0) {
            throw new OrderValidationError(404, 'Order not found')
        }

        return prisma.order.findFirst({ where: { id, tenantId } })
    }

    async createPublicOrder(input: PublicOrderInput) {
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
            new Set(normalizedItems.map((item) => item.variantId).filter(Boolean)) as string[]
        )

        const products = await prisma.product.findMany({
            where: { id: { in: productIds }, tenantId: input.tenantId, isActive: true },
            select: { id: true, price: true, stock: true, title: true }
        })

        if (products.length !== productIds.length) {
            throw new OrderValidationError(400, 'Some products are invalid or unavailable')
        }

        const productMap = new Map(products.map((p) => [p.id, p]))

        const variants = variantIds.length
            ? await prisma.productVariant.findMany({
                where: { id: { in: variantIds }, product: { tenantId: input.tenantId }, isActive: true },
                select: { id: true, productId: true, price: true, stock: true, trackInventory: true }
            })
            : []

        if (variants.length !== variantIds.length) {
            throw new OrderValidationError(400, 'Some variants are invalid or unavailable')
        }

        const variantMap = new Map(variants.map((v) => [v.id, v]))

        let total = 0
        const validatedItems = normalizedItems.map((item) => {
            const product = productMap.get(item.productId)!
            let price = Number(product.price)
            let availableStock = product.stock
            let trackInventory = true

            if (item.variantId) {
                const variant = variantMap.get(item.variantId)
                if (!variant || variant.productId !== product.id) {
                    throw new OrderValidationError(400, 'Variant does not belong to product')
                }
                price = Number(variant.price ?? product.price)
                availableStock = variant.trackInventory ? variant.stock : Number.POSITIVE_INFINITY
                trackInventory = variant.trackInventory
            }

            if (trackInventory && item.quantity > availableStock) {
                throw new OrderValidationError(400, `Insufficient stock for ${product.title}`)
            }

            total += price * item.quantity

            return {
                productId: product.id,
                variantId: item.variantId,
                quantity: item.quantity,
                price,
                trackInventory
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
                    customerName,
                    customerPhone,
                    customerAddress: input.customerAddress || null,
                    deliveryMode,
                    shippingProvider,
                    shippingWilayaCode: input.shippingWilayaCode || null,
                    shippingCommuneCode: input.shippingCommuneCode || null,
                    shippingAddressLine1: input.shippingAddressLine1 || input.customerAddress || null,
                    shippingNotes: input.shippingNotes || null,
                    totalAmount: total,
                    status: 'PENDING'
                }
            })

            await tx.orderItem.createMany({
                data: validatedItems.map((item) => ({
                    orderId: createdOrder.id,
                    productId: item.productId,
                    variantId: item.variantId ?? undefined,
                    quantity: item.quantity,
                    price: item.price
                }))
            })

            for (const item of validatedItems) {
                if (item.variantId) {
                    if (item.trackInventory !== false) {
                        const result = await tx.productVariant.updateMany({
                            where: {
                                id: item.variantId,
                                product: { tenantId: input.tenantId },
                                stock: { gte: item.quantity }
                            },
                            data: { stock: { decrement: item.quantity } }
                        })
                        if (result.count !== 1) {
                            throw new OrderValidationError(409, 'Insufficient stock')
                        }
                    }
                } else {
                    const result = await tx.product.updateMany({
                        where: {
                            id: item.productId,
                            tenantId: input.tenantId,
                            stock: { gte: item.quantity }
                        },
                        data: { stock: { decrement: item.quantity } }
                    })
                    if (result.count !== 1) {
                        throw new OrderValidationError(409, 'Insufficient stock')
                    }
                }
            }

            return createdOrder
        })

        return prisma.order.findFirst({
            where: { id: order.id, tenantId: input.tenantId },
            include: {
                items: {
                    include: { product: true, variant: true }
                }
            }
        })
    }
}
