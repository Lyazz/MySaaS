import request from 'supertest'
import bcrypt from 'bcryptjs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import app from '../../backend/src/app'
import prisma from '../../backend/src/lib/prisma'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Tenant admin session expiry and protected-route isolation', () => {
    const stamp = Date.now()
    const slugA = `session-a-${stamp}`
    const slugB = `session-b-${stamp}`
    const hostA = `${slugA}.localhost:3000`
    const hostB = `${slugB}.localhost:3000`
    const emailA = `session-admin-${stamp}@example.com`
    const password = 'Password123!'

    let tenantAId = ''
    let tenantBId = ''
    let userAId = ''

    const loginTenantA = async () => {
        const res = await request(app)
            .post('/api/login')
            .set('Host', hostA)
            .set('X-Forwarded-Host', hostA)
            .send({ email: emailA, password })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(typeof res.body.token).toBe('string')
        return res.body.token as string
    }

    beforeAll(async () => {
        const [tenantA, tenantB] = await Promise.all([
            prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Session Tenant A', slug: slugA } }),
            prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Session Tenant B', slug: slugB } })
        ])

        tenantAId = tenantA.id
        tenantBId = tenantB.id

        const userA = await prisma.user.create({
            data: {
                tenantId: tenantAId,
                email: emailA,
                role: 'admin',
                isActive: true,
                passwordHash: await bcrypt.hash(password, 10)
            }
        })

        userAId = userA.id
    })

    afterAll(async () => {
        await prisma.auditLog.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } })
    })

    it('allows a valid tenant admin session on protected admin routes', async () => {
        const token = await loginTenantA()

        const res = await request(app)
            .get('/api/admin/dashboard')
            .set('Host', hostA)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('counts')
    })

    it('rejects protected tenant admin routes without an authenticated session', async () => {
        const res = await request(app)
            .get('/api/admin/dashboard')
            .set('Host', hostA)
            .set('X-Forwarded-Host', hostA)

        expect(res.status).toBe(401)
        expect(String(res.body.statusMessage)).toContain('Unauthorized')
    })

    it('rejects expired tenant admin sessions on protected routes', async () => {
        const expiredToken = signAccessToken(
            {
                userId: userAId,
                email: emailA,
                role: 'admin',
                tenantId: tenantAId
            },
            { expiresIn: -10 }
        )

        const res = await request(app)
            .get('/api/admin/dashboard')
            .set('Host', hostA)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${expiredToken}`)

        expect(res.status).toBe(401)
    })

    it('enforces tenant isolation for protected admin routes', async () => {
        const token = await loginTenantA()

        const crossTenantRes = await request(app)
            .get('/api/admin/dashboard')
            .set('Host', hostB)
            .set('X-Forwarded-Host', hostB)
            .set('Authorization', `Bearer ${token}`)

        expect(crossTenantRes.status).toBe(403)
        expect(String(crossTenantRes.body.statusMessage)).toContain('different tenant')
    })

    it('rejects a previously valid session after logout invalidation', async () => {
        const token = await loginTenantA()

        const logoutRes = await request(app)
            .post('/api/logout')
            .set('Host', hostA)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${token}`)

        expect(logoutRes.status).toBe(200)
        expect(logoutRes.body.success).toBe(true)

        const afterLogout = await request(app)
            .get('/api/admin/dashboard')
            .set('Host', hostA)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${token}`)

        expect(afterLogout.status).toBe(401)
    })
})
