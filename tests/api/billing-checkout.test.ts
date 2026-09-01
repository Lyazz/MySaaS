import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'
import { quotePlan, getPlanByCode } from '../../shared/pricing/plans'

/**
 * Covers the checkout path the billing screen drives: what the server charges,
 * what it refuses, and where a new term begins.
 */
describe('Billing checkout API', () => {
    const slug = `bill-checkout-${Date.now()}`
    const host = `${slug}.localhost:3000`

    let tenantId: string
    let userId: string
    let token: string

    const merchantYear = quotePlan(getPlanByCode('merchant')!, 'year')
    const merchantMonth = quotePlan(getPlanByCode('merchant')!, 'month')

    const submit = (body: Record<string, unknown>) =>
        request(app)
            .post('/api/admin/billing/payments/submit')
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)
            .send(body)

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({ data: { name: 'Billing Checkout', slug } })
        tenantId = tenant.id

        const user = await prisma.user.create({
            data: { tenantId, email: `checkout-${slug}@example.com`, role: 'admin', passwordHash: 'x' }
        })
        userId = user.id
        token = signAccessToken({ userId, email: user.email, role: user.role, tenantId })
    })

    beforeEach(async () => {
        await prisma.billingPayment.deleteMany({ where: { tenantId } })
        await prisma.tenantSubscription.deleteMany({ where: { tenantId } })
        await prisma.tenantSubscription.create({
            data: {
                tenantId,
                planCode: 'beginner',
                interval: 'month',
                status: 'ACTIVE',
                currentPeriodStart: new Date('2026-01-01T00:00:00.000Z'),
                // Deliberately far in the future so the "keep what you paid for"
                // behaviour is observable.
                currentPeriodEnd: new Date('2099-01-01T00:00:00.000Z')
            }
        })
    })

    afterAll(async () => {
        await prisma.billingPayment.deleteMany({ where: { tenantId } })
        await prisma.tenantSubscription.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { id: userId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    it('charges a full year for a yearly term', async () => {
        const res = await submit({ planCode: 'merchant', interval: 'year', method: 'CCP', proofUrl: 'local:tenants/x/p.png' })

        expect(res.status).toBe(200)
        expect(res.body.amountDzd).toBe(merchantYear.totalDzd)
        expect(res.body.amountDzd).toBe(28680)
        expect(res.body.interval).toBe('year')
        expect(res.body.status).toBe('PENDING')
    })

    it('ignores an amount sent by the client', async () => {
        // The client used to name its own price and the server wrote it straight
        // to the ledger.
        const res = await submit({
            planCode: 'merchant',
            interval: 'month',
            method: 'CCP',
            proofUrl: 'local:tenants/x/p.png',
            amountDzd: 1
        })

        expect(res.status).toBe(200)
        expect(res.body.amountDzd).toBe(merchantMonth.totalDzd)
    })

    it('starts the new term when the paid one runs out', async () => {
        const res = await submit({ planCode: 'merchant', interval: 'month', method: 'CCP', proofUrl: 'local:tenants/x/p.png' })

        expect(res.status).toBe(200)
        expect(new Date(res.body.periodStart).toISOString()).toBe('2099-01-01T00:00:00.000Z')
        expect(new Date(res.body.periodEnd).toISOString()).toBe('2099-02-01T00:00:00.000Z')
    })

    it('rejects an unknown payment method', async () => {
        const res = await submit({ planCode: 'merchant', interval: 'month', method: 'BITCOIN', proofUrl: 'local:tenants/x/p.png' })
        expect(res.status).toBe(400)
    })

    it('rejects a method that is not live yet', async () => {
        const res = await submit({ planCode: 'merchant', interval: 'month', method: 'CHARGILY' })
        expect(res.status).toBe(400)
    })

    it('rejects a manual transfer with no receipt', async () => {
        const res = await submit({ planCode: 'merchant', interval: 'month', method: 'CCP' })
        expect(res.status).toBe(400)
    })

    it('rejects paying for the free plan', async () => {
        const res = await submit({ planCode: 'basic', interval: 'month', method: 'CCP', proofUrl: 'local:tenants/x/p.png' })
        expect(res.status).toBe(400)
    })

    it('rejects an unknown plan code', async () => {
        const res = await submit({ planCode: 'premium', interval: 'month', method: 'CCP', proofUrl: 'local:tenants/x/p.png' })
        expect(res.status).toBe(400)
    })

    it('refuses a second submission while one is under review', async () => {
        const first = await submit({ planCode: 'merchant', interval: 'month', method: 'CCP', proofUrl: 'local:tenants/x/p.png' })
        expect(first.status).toBe(200)

        const second = await submit({ planCode: 'professional', interval: 'month', method: 'CCP', proofUrl: 'local:tenants/x/p.png' })
        expect(second.status).toBe(409)
    })

    it('turns automatic renewal off and back on', async () => {
        const off = await request(app)
            .post('/api/admin/billing/subscription/cancel-at-period-end')
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)
            .send({ cancelAtPeriodEnd: true })

        expect(off.status).toBe(200)
        expect(off.body.subscription.cancelAtPeriodEnd).toBe(true)

        const on = await request(app)
            .post('/api/admin/billing/subscription/cancel-at-period-end')
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)
            .send({ cancelAtPeriodEnd: false })

        expect(on.status).toBe(200)
        expect(on.body.subscription.cancelAtPeriodEnd).toBe(false)
    })

    it('reports a monthly quota window on an annual subscription', async () => {
        await prisma.tenantSubscription.update({
            where: { tenantId },
            data: {
                planCode: 'merchant',
                interval: 'year',
                currentPeriodStart: new Date('2026-01-10T00:00:00.000Z'),
                currentPeriodEnd: new Date('2027-01-10T00:00:00.000Z')
            }
        })

        const res = await request(app)
            .get('/api/admin/billing/subscription')
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)

        // A month wide, not the twelve-month billing term.
        const start = new Date(res.body.usage.periodStart)
        const end = new Date(res.body.usage.periodEnd)
        const spanDays = (end.getTime() - start.getTime()) / 86_400_000
        expect(spanDays).toBeGreaterThanOrEqual(28)
        expect(spanDays).toBeLessThanOrEqual(31)

        expect(res.body.usage.orders.limit).toBe(getPlanByCode('merchant')!.ordersPerMonth)
        expect(res.body.renewalQuote.totalDzd).toBe(merchantYear.totalDzd)
        expect(res.body.subscription.interval).toBe('year')
    })
})
