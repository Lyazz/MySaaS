import { Router } from 'express'
import prisma from '../../lib/prisma'
import { requireSuperAdmin } from '../../middleware/superadmin.middleware'

const router = Router()

router.use(requireSuperAdmin)

// GET /audit-logs
router.get('/audit-logs', async (req, res) => {
    try {
        const logs = await prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100
        })
        res.json(logs)
    } catch (error) {
        console.error('Audit logs error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

// GET /stats/revenue
router.get('/stats/revenue', async (req, res) => {
    try {
        const revenue = await prisma.order.aggregate({
            _sum: {
                totalAmount: true
            },
            where: {
                status: {
                    in: ['CONFIRMED', 'SHIPPED', 'DELIVERED']
                }
            }
        })

        // Get revenue by tenant
        const revenueByTenant = await prisma.order.groupBy({
            by: ['tenantId'],
            _sum: {
                totalAmount: true
            },
            where: {
                status: {
                    in: ['CONFIRMED', 'SHIPPED', 'DELIVERED']
                }
            }
        })

        const totalRevenue = revenue._sum.totalAmount || 0
        res.json({
            totalRevenue,
            byTenant: revenueByTenant.map(r => ({
                tenantId: r.tenantId,
                revenue: r._sum.totalAmount || 0
            }))
        })
    } catch (error) {
        console.error('Revenue stats error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

// GET /stats/platform
router.get('/stats/platform', async (req, res) => {
    try {
        const [tenantCount, userCount, orderCount, productCount] = await Promise.all([
            prisma.tenant.count(),
            prisma.user.count(),
            prisma.order.count(),
            prisma.product.count()
        ])

        res.json({
            tenants: tenantCount,
            users: userCount,
            orders: orderCount,
            products: productCount
        })
    } catch (error) {
        console.error('Platform stats error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

export default router
