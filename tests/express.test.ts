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
