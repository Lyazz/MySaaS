import { Router } from 'express'
import prisma from '../../lib/prisma'

const router = Router()

// GET /categories - Public categories listing
router.get('/', async (req, res) => {
    const tenant = req.tenant

    if (!tenant) {
        return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant not found' })
    }

    try {
        const categories = await prisma.category.findMany({
            where: {
                tenantId: tenant.id
            },
            orderBy: {
                createdAt: 'desc'
            }
        })
        res.json(categories)
    } catch (error) {
        console.error('Public categories list error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

export default router
