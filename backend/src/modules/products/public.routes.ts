import { Router } from 'express'
import prisma from '../../lib/prisma'

const router = Router()

// GET /products - Public product listing (active products only)
router.get('/', async (req, res) => {
    const tenant = req.tenant

    if (!tenant) {
        return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant not found' })
    }

    try {
        const products = await prisma.product.findMany({
            where: {
                tenantId: tenant.id,
                isActive: true
            },
            include: {
                category: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        res.json(products)
    } catch (error) {
        console.error('Public products list error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

// GET /products/:slug - Public product detail
router.get('/:slug', async (req, res) => {
    const tenant = req.tenant
    const { slug } = req.params

    if (!tenant) {
        return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant not found' })
    }

    try {
        const product = await prisma.product.findUnique({
            where: {
                tenantId_slug: {
                    tenantId: tenant.id,
                    slug
                }
            },
            include: {
                category: true,
                variants: true
            }
        })

        if (!product) {
            return res.status(404).json({ statusCode: 404, statusMessage: 'Product not found' })
        }

        res.json(product)
    } catch (error) {
        console.error('Public product detail error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

export default router
