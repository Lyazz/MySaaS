import { Router } from 'express'
import prisma from '../../lib/prisma'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'

const router = Router()

router.use(requireTenantAdmin)

// GET /orders - List orders with optional filters
router.get('/', async (req, res) => {
    const tenant = req.tenant!
    const { status, search } = req.query as { status?: string; search?: string }

    try {
        const where: any = {
            tenantId: tenant.id
        }

        // Filter by status if provided
        if (status && status !== '') {
            where.status = status
        }

        // Search by customer name or phone
        if (search) {
            where.OR = [
                { customerName: { contains: search, mode: 'insensitive' } },
                { customerPhone: { contains: search } }
            ]
        }

        const orders = await prisma.order.findMany({
            where,
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        res.json(orders)
    } catch (error) {
        console.error('List orders error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

// GET /orders/:id - Get order detail
router.get('/:id', async (req, res) => {
    const tenant = req.tenant!
    const { id } = req.params

    if (!id) return res.status(400).json({ statusCode: 400, statusMessage: 'Order ID is required' })

    try {
        const order = await prisma.order.findFirst({
            where: {
                id,
                tenantId: tenant.id
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            }
        })

        if (!order) {
            return res.status(404).json({ statusCode: 404, statusMessage: 'Order not found' })
        }

        res.json(order)
    } catch (error) {
        console.error('Get order error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

// PATCH /orders/:id
router.patch('/:id', async (req, res) => {
    const tenant = req.tenant!
    const { id } = req.params
    const body = req.body

    if (!id) return res.status(400).json({ statusCode: 400, statusMessage: 'Order ID is required' })
    if (!body.status) return res.status(400).json({ statusCode: 400, statusMessage: 'Status is required' })

    try {
        const order = await prisma.order.findFirst({
            where: {
                id,
                tenantId: tenant.id
            }
        })

        if (!order) {
            return res.status(404).json({ statusCode: 404, statusMessage: 'Order not found' })
        }

        const updatedOrder = await prisma.order.update({
            where: { id },
            data: {
                status: body.status
            }
        })

        res.json(updatedOrder)
    } catch (error) {
        console.error('Update order error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

export default router
