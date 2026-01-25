import { Router } from 'express'
import prisma from '../../lib/prisma'

const router = Router()

// POST /orders - Create order (public, no auth required)
router.post('/', async (req, res) => {
    const tenant = req.tenant

    if (!tenant) {
        return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant not found' })
    }

    const { customerName, customerPhone, customerAddress, notes, items } = req.body

    // Validate required fields
    if (!customerName || !customerPhone || !customerAddress || !items || items.length === 0) {
        return res.status(400).json({
            statusCode: 400,
            statusMessage: 'Customer name, phone, address, and items are required'
        })
    }

    try {
        // Validate all products exist and belong to this tenant
        const productIds = items.map((item: any) => item.productId)
        const products = await prisma.product.findMany({
            where: {
                id: { in: productIds },
                tenantId: tenant.id,
                isActive: true
            }
        })

        if (products.length !== productIds.length) {
            return res.status(400).json({
                statusCode: 400,
                statusMessage: 'Some products are invalid or not available'
            })
        }

        // Calculate total server-side (don't trust client)
        let total = 0
        const validatedItems = items.map((item: any) => {
            const product = products.find(p => p.id === item.productId)
            if (!product) {
                throw new Error('Product not found')
            }

            // Check stock
            if (product.stock < item.quantity) {
                throw new Error(`Insufficient stock for ${product.title}`)
            }

            const price = Number(product.price)
            const itemTotal = price * item.quantity

            total += itemTotal

            return {
                productId: item.productId,
                quantity: item.quantity,
                price: price
            }
        })

        // Create order with order items in a transaction
        const order = await prisma.$transaction(async (tx) => {
            // Create the order
            const newOrder = await tx.order.create({
                data: {
                    tenantId: tenant.id,
                    customerName,
                    customerPhone,
                    customerAddress,
                    status: 'PENDING',
                    totalAmount: total
                }
            })

            // Create order items
            await tx.orderItem.createMany({
                data: validatedItems.map((item: { productId: string, quantity: number, price: number }) => ({
                    orderId: newOrder.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price
                }))
            })

            // Decrement product stock
            for (const item of validatedItems) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: {
                            decrement: item.quantity
                        }
                    }
                })
            }

            return newOrder
        })

        res.json({ success: true, orderId: order.id, order })
    } catch (error: any) {
        console.error('Create order error:', error)

        if (error.message.includes('Insufficient stock')) {
            return res.status(400).json({ statusCode: 400, statusMessage: error.message })
        }

        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

export default router
