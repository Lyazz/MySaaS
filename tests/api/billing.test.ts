import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Billing API', () => {
    const slugA = `bill-a-${Date.now()}`
    const slugB = `bill-b-${Date.now()}`
    const hostA = `${slugA}.localhost:3000`
    const hostB = `${slugB}.localhost:3000`

    let tenantAId: string
    let tenantBId: string
    let userAId: string
    let userBId: string
    let tokenA: string
    let tokenB: string

    beforeAll(async () => {
        const [tenantA, tenantB] = await prisma.$transaction([
            prisma.tenant.create({ data: { name: 'Billing Tenant A', slug: slugA } }),
            prisma.tenant.create({ data: { name: 'Billing Tenant B', slug: slugB } })
        ])
        tenantAId = tenantA.id
        tenantBId = tenantB.id

        const [userA, userB] = await prisma.$transaction([
            prisma.user.create({
                data: { tenantId: tenantAId, email: `billing-a-${slugA}@example.com`, role: 'admin', passwordHash: 'x' }
            }),
            prisma.user.create({
                data: { tenantId: tenantBId, email: `billing-b-${slugB}@example.com`, role: 'admin', passwordHash: 'x' }
            })
        ])
        userAId = userA.id
        userBId = userB.id

        tokenA = signAccessToken({ userId: userAId, email: userA.email, role: userA.role, tenantId: userA.tenantId })
        tokenB = signAccessToken({ userId: userBId, email: userB.email, role: userB.role, tenantId: userB.tenantId })

        const now = new Date()
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
        const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0))

        await prisma.tenantSubscription.create({
            data: {
                tenantId: tenantAId,
                planCode: 'merchant',
                interval: 'month',
                status: 'ACTIVE',
                currentPeriodStart: start,
                currentPeriodEnd: end
            }
        })

        await prisma.$transaction([
            prisma.order.create({
                data: {
                    tenantId: tenantAId,
                    status: 'PENDING',
                    totalAmount: 100,
                    customerName: 'A1',
                    customerPhone: '0550000011',
                    createdAt: new Date(start.getTime() + 60_000)
                }
            }),
            prisma.order.create({
                data: {
                    tenantId: tenantAId,
                    status: 'PENDING',
                    totalAmount: 200,
                    customerName: 'A2',
                    customerPhone: '0550000012',
                    createdAt: new Date(start.getTime() + 120_000)
                }
            }),
            prisma.order.create({
                data: {
                    tenantId: tenantBId,
                    status: 'PENDING',
                    totalAmount: 300,
                    customerName: 'B1',
                    customerPhone: '0550000021',
                    createdAt: new Date(start.getTime() + 180_000)
                }
            })
        ])
    })

    afterAll(async () => {
        await prisma.orderItem.deleteMany({ where: { order: { tenantId: { in: [tenantAId, tenantBId] } } } })
        await prisma.order.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.billingPayment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } })
        await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } })
    })

    it('lists plans for tenant admin', async () => {
        const res = await request(app)
            .get('/api/admin/billing/plans')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body?.plans)).toBe(true)
        expect(res.body.plans.some((p: any) => p.code === 'merchant')).toBe(true)
    })

    it('returns tenant billing snapshot scoped to tenant', async () => {
        const res = await request(app)
            .get('/api/admin/billing/subscription')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)

        expect(res.status).toBe(200)
        expect(res.body?.subscription?.planCode).toBe('merchant')
        expect(res.body?.plan?.name).toBe('Merchant')
        expect(res.body?.usage?.ordersInPeriod).toBe(2)
    })

    it('allows tenant to change their own subscription plan', async () => {
        const res = await request(app)
            .post('/api/admin/billing/payments/simulate')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ planCode: 'professional', interval: 'month' })

        expect(res.status).toBe(200)
        expect(res.body?.subscription?.planCode).toBe('professional')
        expect(res.body?.plan?.name).toBe('Professional')

        const db = await prisma.tenantSubscription.findUnique({ where: { tenantId: tenantAId } })
        expect(db?.planCode).toBe('professional')

        const payment = await prisma.billingPayment.findFirst({
            where: { tenantId: tenantAId },
            orderBy: { createdAt: 'desc' }
        })
        expect(payment?.method).toBe('SIMULATED')
    })

    it('blocks cross-tenant access even with a valid token', async () => {
        const res = await request(app)
            .get('/api/admin/billing/subscription')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenB}`)

        expect(res.status).toBe(403)
    })

    it('blocks tenant A token on tenant B host', async () => {
        const res = await request(app)
            .get('/api/admin/billing/subscription')
            .set('X-Forwarded-Host', hostB)
            .set('Authorization', `Bearer ${tokenA}`)

        expect(res.status).toBe(403)
    })

    it('blocks cross-tenant plan changes', async () => {
        const res = await request(app)
            .post('/api/admin/billing/payments/simulate')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenB}`)
            .send({ planCode: 'basic', interval: 'month' })

        expect(res.status).toBe(403)
    })
})
