import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Subscription expiration enforcement', () => {
    const slug = `expired-${Date.now()}`
    const host = `${slug}.localhost:3000`

    let tenantId: string
    let userId: string
    let token: string

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({ data: { name: 'Expired Tenant', slug } })
        tenantId = tenant.id

        const user = await prisma.user.create({
            data: { tenantId, email: `expired-admin-${Date.now()}@example.com`, role: 'admin', passwordHash: 'x' }
        })
        userId = user.id
        token = signAccessToken({ userId: userId, email: user.email, role: user.role, tenantId: user.tenantId })

        const pastStart = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
        const pastEnd = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)

        await prisma.tenantSubscription.create({
            data: {
                tenantId,
                planCode: 'basic',
                interval: 'month',
                status: 'ACTIVE',
                currentPeriodStart: pastStart,
                currentPeriodEnd: pastEnd
            }
        })
    })

    afterAll(async () => {
        await prisma.orderItem.deleteMany({ where: { order: { tenantId } } })
        await prisma.order.deleteMany({ where: { tenantId } })
        await prisma.billingPayment.deleteMany({ where: { tenantId } })
        await prisma.tenantSubscription.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { id: userId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    it('blocks public storefront API when subscription is expired', async () => {
        const res = await request(app).get('/api/products').set('X-Forwarded-Host', host)
        expect(res.status).toBe(402)

        const sub = await prisma.tenantSubscription.findUnique({ where: { tenantId } })
        expect(sub?.status).toBe('PAST_DUE')
    })

    it('still allows billing endpoints when subscription is expired', async () => {
        const res = await request(app)
            .get('/api/admin/billing/subscription')
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(200)
    })

    it('allows renewing by changing plan, and unblocks storefront API', async () => {
        const renew = await request(app)
            .post('/api/admin/billing/payments/simulate')
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)
            .send({ planCode: 'merchant', interval: 'month' })
        expect(renew.status).toBe(200)
        expect(renew.body?.subscription?.planCode).toBe('merchant')

        const after = await request(app).get('/api/products').set('X-Forwarded-Host', host)
        expect(after.status).toBe(200)
    })
})
