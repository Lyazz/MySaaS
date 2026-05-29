import request from 'supertest'
import jwt from 'jsonwebtoken'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'

const JWT_SECRET = process.env.JWT_SECRET!

describe('Meta Pixel Script (tenant-scoped)', () => {
    let tenantA: any
    let tenantB: any
    let tokenA: string

    beforeAll(async () => {
        tenantA = await prisma.tenant.create({ data: { name: 'Tenant A', slug: `tenant-a-fb-${Date.now()}` } })
        tenantB = await prisma.tenant.create({ data: { name: 'Tenant B', slug: `tenant-b-fb-${Date.now()}` } })

        const userA = await prisma.user.create({
            data: { email: `fb-a-${Date.now()}@test.com`, role: 'owner', tenantId: tenantA.id }
        })

        tokenA = jwt.sign({ userId: userA.id, tenantId: tenantA.id }, JWT_SECRET)
    })

    afterAll(async () => {
        const tenantIds = [tenantA.id, tenantB.id]
        await prisma.productMetaPixel.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.tenantMetaPixel.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.tenantIntegration.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.user.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } })
    })

    it('serves a script that bootstraps fbq, and inits the global pixel when configured', async () => {
        await prisma.tenantMetaPixel.create({
            data: { tenantId: tenantA.id, pixelId: '999999', isActive: true, isGlobal: true, name: 'Global' }
        })

        const res = await request(app).get('/api/pixel/facebook.js').set('Host', `${tenantA.slug}.swekly.com`)
        expect(res.status).toBe(200)
        expect(String(res.headers['content-type'] || '')).toContain('application/javascript')
        expect(res.text).toContain('fbevents.js')
        expect(res.text).toContain("init','999999")
    })

    it('exposes pixelId via a tenant-scoped public endpoint', async () => {
        const res = await request(app).get('/api/pixel/facebook.json').set('Host', `${tenantA.slug}.swekly.com`)
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({ pixelId: '999999' })
    })

    it('does not leak script across tenants', async () => {
        const res = await request(app).get('/api/pixel/facebook.js').set('Host', `${tenantB.slug}.swekly.com`)
        expect(res.status).toBe(200)
        expect(res.text).toContain('fbevents.js')
        expect(res.text).not.toContain("init','999999")
    })

    it('does not leak config across tenants', async () => {
        const res = await request(app).get('/api/pixel/facebook.json').set('Host', `${tenantB.slug}.swekly.com`)
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({ pixelId: null })
    })
})
