import request from 'supertest'
import { describe, it, expect, afterAll } from 'vitest'
import prisma from '../backend/src/lib/prisma'
import app from '../backend/src/app'

describe('Express Backend Migration', async () => {
    const createdSlugs: string[] = []

    it('responds to /api/hello', async () => {
        const res = await request(app).get('/api/hello')
        expect(res.status).toBe(200)
        expect(res.body).toEqual({ hello: 'world' })
    })

    it('handles /api/register via Express', async () => {
        const slug = `test-tenant-${Date.now()}`
        createdSlugs.push(slug)
        const email = `owner-${slug}@example.com`

        const res = await request(app)
            .post('/api/register')
            .set('X-Forwarded-Host', 'localhost:3000')
            .send({
                name: 'Test Tenant',
                slug,
                email,
                password: 'password123'
            })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.tenant.slug).toBe(slug)
        expect(typeof res.body.token).toBe('string')
        expect(res.body.user?.tenantId).toBe(res.body.tenant?.id)

        const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } })
        expect(tenant?.id).toBeTruthy()

        const settings = tenant?.id
            ? await prisma.storeSettings.findUnique({ where: { tenantId: tenant.id }, select: { defaultCashboxId: true } })
            : null
        expect(settings?.defaultCashboxId).toBeTruthy()

        const cashboxes = tenant?.id ? await prisma.cashbox.findMany({ where: { tenantId: tenant.id } }) : []
        expect(cashboxes.length).toBeGreaterThan(0)
        expect(cashboxes.some((c) => c.id === settings?.defaultCashboxId)).toBe(true)

        const meRes = await request(app)
            .get('/api/me')
            .set('Host', 'localhost:3000')
            .set('X-Forwarded-Host', 'localhost:3000')
            .set('Authorization', `Bearer ${res.body.token}`)

        expect(meRes.status).toBe(200)
        expect(meRes.body.success).toBe(true)
        expect(meRes.body.user?.tenantId).toBe(res.body.tenant?.id)
        expect(meRes.body.tenant?.id).toBe(res.body.tenant?.id)

        // Cleanup
        await prisma.user.deleteMany({ where: { tenant: { slug } } })
        await prisma.tenant.deleteMany({ where: { slug } })
    })

    afterAll(async () => {
        if (createdSlugs.length === 0) return
        await prisma.user.deleteMany({ where: { tenant: { slug: { in: createdSlugs } } } })
        await prisma.tenant.deleteMany({ where: { slug: { in: createdSlugs } } })
    })
})
