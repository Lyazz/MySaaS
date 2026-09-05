import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Super-admin billing API', () => {
    let tenantId: string
    let superAdminId: string
    let regularUserId: string
    let superAdminToken: string
    let regularToken: string

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Billing Admin Tenant', slug: `bill-admin-${Date.now()}` } })
        tenantId = tenant.id

        const [regularUser, superAdmin] = await prisma.$transaction([
            prisma.user.create({
                data: { email: `billing-regular-${Date.now()}@example.com`, passwordHash: 'x', role: 'owner', tenantId }
            }),
            prisma.user.create({
                data: {
                    email: `billing-super-${Date.now()}@example.com`,
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
        await prisma.tenantSubscription.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { id: { in: [regularUserId, superAdminId] } } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    it('denies access without token', async () => {
        const res = await request(app).put(`/api/super-admin/billing/tenants/${tenantId}/subscription`).send({
            planCode: 'professional',
            interval: 'month'
        })
        expect(res.status).toBe(401)
    })

    it('denies access for non-super-admin users', async () => {
        const res = await request(app)
            .put(`/api/super-admin/billing/tenants/${tenantId}/subscription`)
            .set('Authorization', `Bearer ${regularToken}`)
            .send({ planCode: 'professional', interval: 'month' })
        expect(res.status).toBe(403)
    })

    it('sets tenant subscription as super-admin', async () => {
        const res = await request(app)
            .put(`/api/super-admin/billing/tenants/${tenantId}/subscription`)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({ planCode: 'professional', interval: 'month' })

        expect(res.status).toBe(200)
        expect(res.body?.tenantId).toBe(tenantId)
        expect(res.body?.planCode).toBe('professional')

        const db = await prisma.tenantSubscription.findUnique({ where: { tenantId } })
        expect(db?.planCode).toBe('professional')
    })
})

