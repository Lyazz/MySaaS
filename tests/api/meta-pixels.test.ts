import request from 'supertest'
import jwt from 'jsonwebtoken'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'

const JWT_SECRET = process.env.JWT_SECRET!

describe('Meta Pixels Admin + Product Assignment', () => {
    let tenantA: any
    let tenantB: any
    let tokenA: string
    let tokenB: string
    let productA: any

    beforeAll(async () => {
        tenantA = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Tenant A', slug: `tenant-a-mp-${Date.now()}` } })
        tenantB = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Tenant B', slug: `tenant-b-mp-${Date.now()}` } })

        const userA = await prisma.user.create({
            data: { email: `mp-a-${Date.now()}@test.com`, role: 'owner', tenantId: tenantA.id }
        })
        const userB = await prisma.user.create({
            data: { email: `mp-b-${Date.now()}@test.com`, role: 'owner', tenantId: tenantB.id }
        })

        tokenA = jwt.sign({ userId: userA.id, tenantId: tenantA.id }, JWT_SECRET)
        tokenB = jwt.sign({ userId: userB.id, tenantId: tenantB.id }, JWT_SECRET)

        productA = await prisma.product.create({
            data: { tenantId: tenantA.id, title: 'Prod A', slug: `prod-a-${Date.now()}`, price: 100, stock: 10, isActive: true }
        })
    })

    afterAll(async () => {
        const tenantIds = [tenantA.id, tenantB.id]
        await prisma.productMetaPixel.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.tenantMetaPixel.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.product.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.user.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } })
    })

    it('creates pixels and enforces single global per tenant', async () => {
        const hostA = `${tenantA.slug}.swekly.com`

        const p1 = await request(app)
            .post('/api/admin/meta-pixels')
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', hostA)
            .send({ name: 'Pixel 1', pixelId: '111111', isActive: true, isGlobal: true })
        expect(p1.status).toBe(201)
        expect(p1.body.isGlobal).toBe(true)

        const p2 = await request(app)
            .post('/api/admin/meta-pixels')
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', hostA)
            .send({ name: 'Pixel 2', pixelId: '222222', isActive: true, isGlobal: true })
        expect(p2.status).toBe(201)
        expect(p2.body.isGlobal).toBe(true)

        const list = await request(app)
            .get('/api/admin/meta-pixels')
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', hostA)
        expect(list.status).toBe(200)

        const globals = (list.body as any[]).filter((p) => p.isGlobal)
        expect(globals.length).toBe(1)
        expect(globals[0].pixelId).toBe('222222')
    })

    it('assigns pixels to a product and exposes pixelIds in public product response', async () => {
        const hostA = `${tenantA.slug}.swekly.com`

        const created = await request(app)
            .post('/api/admin/meta-pixels')
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', hostA)
            .send({ name: 'Product Pixel', pixelId: '333333', isActive: true, isGlobal: false })
        expect(created.status).toBe(201)

        const assign = await request(app)
            .put(`/api/admin/meta-pixels/products/${productA.id}`)
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', hostA)
            .send({ metaPixelIds: [created.body.id] })
        expect(assign.status).toBe(200)
        expect(assign.body.metaPixelIds).toContain(created.body.id)

        const publicRes = await request(app).get(`/api/products/${productA.slug}`).set('Host', hostA)
        expect(publicRes.status).toBe(200)
        expect(Array.isArray(publicRes.body.metaPixelIds)).toBe(true)
        expect(publicRes.body.metaPixelIds).toContain('333333')
    })

    it('prevents cross-tenant admin access via Host mismatch', async () => {
        const res = await request(app)
            .get('/api/admin/meta-pixels')
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', `${tenantB.slug}.swekly.com`)
        expect(res.status).toBe(403)

        const ok = await request(app)
            .get('/api/admin/meta-pixels')
            .set('Authorization', `Bearer ${tokenB}`)
            .set('Host', `${tenantB.slug}.swekly.com`)
        expect(ok.status).toBe(200)
    })
})

