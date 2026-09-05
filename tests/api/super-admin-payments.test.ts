import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Super-admin payment import API', () => {
    let tenantId: string
    let superAdminId: string
    let regularUserId: string
    let superAdminToken: string
    let regularToken: string

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Payments Tenant', slug: `pay-${Date.now()}` } })
        tenantId = tenant.id

        const [regularUser, superAdmin] = await prisma.$transaction([
            prisma.user.create({
                data: { email: `pay-regular-${Date.now()}@example.com`, passwordHash: 'x', role: 'owner', tenantId }
            }),
            prisma.user.create({
                data: {
                    email: `pay-super-${Date.now()}@example.com`,
                    passwordHash: 'x',
                    role: 'owner',
                    isSuperAdmin: true,
                    tenantId
                }
            })
        ])

        regularUserId = regularUser.id
        superAdminId = superAdmin.id
        regularToken = signAccessToken({ userId: regularUserId })
        superAdminToken = signAccessToken({ userId: superAdminId })
    })

    afterAll(async () => {
        await prisma.billingPayment.deleteMany({ where: { tenantId } })
        await prisma.tenantSubscription.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { id: { in: [regularUserId, superAdminId] } } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    it('denies access for non-super-admin users', async () => {
        const res = await request(app)
            .post(`/api/super-admin/billing/tenants/${tenantId}/payments/import`)
            .set('Authorization', `Bearer ${regularToken}`)
            .send({ planCode: 'basic', interval: 'month', proofUrl: 'https://example.com' })
        expect(res.status).toBe(403)
    })

    it('imports a proof and applies subscription when requested', async () => {
        const res = await request(app)
            .post(`/api/super-admin/billing/tenants/${tenantId}/payments/import`)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({
                planCode: 'merchant',
                interval: 'month',
                proofUrl: 'https://example.com/proof.png',
                externalReference: 'EXT-123',
                notes: 'Imported proof',
                applySubscription: true
            })

        expect(res.status).toBe(201)
        expect(res.body?.tenantId).toBe(tenantId)
        expect(res.body?.method).toBe('MANUAL_PROOF')

        const payments = await prisma.billingPayment.findMany({ where: { tenantId } })
        expect(payments.length).toBe(1)

        const sub = await prisma.tenantSubscription.findUnique({ where: { tenantId } })
        expect(sub?.planCode).toBe('merchant')
    })

    it('lists tenant payments', async () => {
        const res = await request(app)
            .get(`/api/super-admin/billing/tenants/${tenantId}/payments`)
            .set('Authorization', `Bearer ${superAdminToken}`)
        expect(res.status).toBe(200)
        expect(Array.isArray(res.body?.payments)).toBe(true)
        expect(res.body.payments.length).toBeGreaterThanOrEqual(1)
    })
})

