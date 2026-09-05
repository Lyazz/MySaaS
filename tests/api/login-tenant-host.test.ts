import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import bcrypt from 'bcryptjs'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'

describe('Login on tenant host (custom domain / subdomain)', () => {
    const email = `admin-${Date.now()}@maconfiserie.com`
    const slugA = `login-a-${Date.now()}`
    const slugB = `login-b-${Date.now()}`
    const hostA = `${slugA}.localhost:3000`
    const hostB = `${slugB}.localhost:3000`
    let tenantAId = ''
    let tenantBId = ''

    beforeAll(async () => {
        const [tenantA, tenantB] = await Promise.all([
            prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Login A', slug: slugA } }),
            prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Login B', slug: slugB } })
        ])
        tenantAId = tenantA.id
        tenantBId = tenantB.id

        await prisma.user.create({
            data: {
                tenantId: tenantAId,
                email,
                role: 'admin',
                passwordHash: await bcrypt.hash('password', 10)
            }
        })

        await prisma.user.create({
            data: {
                tenantId: tenantBId,
                email,
                role: 'admin',
                passwordHash: await bcrypt.hash('other-password', 10)
            }
        })
    })

    afterAll(async () => {
        await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } })
    })

    it('logs in successfully when Host resolves a tenant', async () => {
        const res = await request(app)
            .post('/api/login')
            .set('X-Forwarded-Host', hostA)
            .send({ email, password: 'password' })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(typeof res.body.token).toBe('string')
        expect(res.body.user?.tenantId).toBe(tenantAId)
        expect(res.body.user?.email).toBe(email)
    })

    it('does not allow logging into another tenant from the wrong Host', async () => {
        const res = await request(app)
            .post('/api/login')
            .set('X-Forwarded-Host', hostA)
            .send({ email, password: 'other-password' })

        expect(res.status).toBe(401)
    })

    it('returns 409 on SaaS host when email exists on multiple tenants', async () => {
        const res = await request(app)
            .post('/api/login')
            .set('X-Forwarded-Host', 'localhost:3000')
            .send({ email, password: 'password' })

        expect(res.status).toBe(409)
    })

    it('logs in to tenant B when Host resolves tenant B', async () => {
        const res = await request(app)
            .post('/api/login')
            .set('X-Forwarded-Host', hostB)
            .send({ email, password: 'other-password' })

        expect(res.status).toBe(200)
        expect(res.body.user?.tenantId).toBe(tenantBId)
    })
})

