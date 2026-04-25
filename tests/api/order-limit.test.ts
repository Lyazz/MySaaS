import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { getPlanByCode } from '../../shared/pricing/plans'

describe('Order limit enforcement', () => {
    const slug = `limit-${Date.now()}`
    const host = `${slug}.localhost:3000`

    let tenantId: string
    let productId: string
    const basicPlanLimit = getPlanByCode('basic')?.ordersPerMonth ?? 0

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({ data: { name: 'Limit Tenant', slug } })
        tenantId = tenant.id

        const now = new Date()
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
        const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0))

        await prisma.tenantSubscription.create({
            data: {
                tenantId,
                planCode: 'basic',
                interval: 'month',
                status: 'ACTIVE',
                currentPeriodStart: start,
                currentPeriodEnd: end
            }
        })

        await prisma.storeSettings.create({
            data: {
                tenantId,
                cartEnabled: true,
                codEnabled: true,
                minimumOrderAmountDzd: 0,
                hideOptionalAddress: true
            }
        })

        const product = await prisma.product.create({
            data: { tenantId, title: 'Limit Product', slug: `limit-prod-${Date.now()}`, price: 10, stock: 999, isActive: true }
        })
        productId = product.id

        // Seed orders in current period to reach Basic limit.
        const baseOrder = {
            tenantId,
            status: 'PENDING',
            totalAmount: 10,
            customerName: 'Seed',
            customerPhone: '0550000000',
            createdAt: new Date(start.getTime() + 60_000)
        }

        if (basicPlanLimit <= 0) {
            throw new Error('basic plan must have a positive ordersPerMonth limit for this test')
        }

        await prisma.order.createMany({
            data: Array.from({ length: basicPlanLimit }).map((_, idx) => ({
                ...baseOrder,
                customerPhone: `05500000${idx.toString().padStart(2, '0')}`,
                createdAt: new Date(start.getTime() + (idx + 1) * 60_000)
            }))
        })
    })

    afterAll(async () => {
        await prisma.orderItem.deleteMany({ where: { order: { tenantId } } })
        await prisma.order.deleteMany({ where: { tenantId } })
        await prisma.product.deleteMany({ where: { tenantId } })
        await prisma.storeSettings.deleteMany({ where: { tenantId } })
        await prisma.billingPayment.deleteMany({ where: { tenantId } })
        await prisma.tenantSubscription.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    it('blocks creating additional orders after reaching monthly limit, without disabling storefront browsing', async () => {
        const browse = await request(app).get('/api/products').set('X-Forwarded-Host', host)
        expect(browse.status).toBe(200)

        const res = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', host)
            .send({
                customerName: 'Customer',
                customerPhone: '0559999999',
                deliveryMode: 'home',
                items: [{ productId, quantity: 1 }]
            })

        expect(res.status).toBe(429)
        expect(res.body?.statusMessage || '').toContain('Monthly order limit reached')
    })
})
