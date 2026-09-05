import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

/**
 * A store that has never been published must be invisible over the API, not just
 * in the browser. Without the API half of the gate a draft storefront stays
 * readable -- and orderable -- by anyone who skips the HTML.
 */
describe('Draft storefront gate (public API)', () => {
    const stamp = Date.now()
    const draftSlug = `draft-gate-${stamp}`
    const liveSlug = `live-gate-${stamp}`
    const draftHost = `${draftSlug}.localhost:3000`
    const liveHost = `${liveSlug}.localhost:3000`

    let draftTenantId: string
    let liveTenantId: string
    let ownerId: string
    let outsiderId: string
    let ownerToken: string
    let outsiderToken: string

    beforeAll(async () => {
        const draftTenant = await prisma.tenant.create({
            data: { name: 'Draft Gate Tenant', slug: draftSlug, publishedAt: null }
        })
        draftTenantId = draftTenant.id

        const liveTenant = await prisma.tenant.create({
            data: { name: 'Live Gate Tenant', slug: liveSlug, publishedAt: new Date() }
        })
        liveTenantId = liveTenant.id

        const owner = await prisma.user.create({
            data: {
                tenantId: draftTenantId,
                email: `draft-owner-${stamp}@example.com`,
                role: 'owner',
                passwordHash: 'x'
            }
        })
        ownerId = owner.id
        ownerToken = signAccessToken({
            userId: owner.id,
            email: owner.email,
            role: owner.role,
            tenantId: owner.tenantId
        })

        // A member of a *different* tenant must not be able to peek at this draft.
        const outsider = await prisma.user.create({
            data: {
                tenantId: liveTenantId,
                email: `draft-outsider-${stamp}@example.com`,
                role: 'owner',
                passwordHash: 'x'
            }
        })
        outsiderId = outsider.id
        outsiderToken = signAccessToken({
            userId: outsider.id,
            email: outsider.email,
            role: outsider.role,
            tenantId: outsider.tenantId
        })
    })

    afterAll(async () => {
        await prisma.storeSettings.deleteMany({ where: { tenantId: { in: [draftTenantId, liveTenantId] } } })
        await prisma.user.deleteMany({ where: { id: { in: [ownerId, outsiderId] } } })
        await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [draftTenantId, liveTenantId] } } })
        await prisma.tenant.deleteMany({ where: { id: { in: [draftTenantId, liveTenantId] } } })
    })

    it('404s the public product list for a draft store', async () => {
        const res = await request(app).get('/api/products').set('X-Forwarded-Host', draftHost)
        expect(res.status).toBe(404)
    })

    it('404s public store settings for a draft store', async () => {
        const res = await request(app).get('/api/store/settings').set('X-Forwarded-Host', draftHost)
        expect(res.status).toBe(404)
    })

    it('refuses checkout against a draft store', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', draftHost)
            .send({ customerName: 'Test', customerPhone: '0555000000', items: [] })
        expect(res.status).toBe(404)
    })

    it('serves the public API to a signed-in member of that tenant', async () => {
        const res = await request(app)
            .get('/api/products')
            .set('X-Forwarded-Host', draftHost)
            .set('Authorization', `Bearer ${ownerToken}`)
        expect(res.status).toBe(200)
    })

    it('serves the public API to a browser carrying that tenant’s session cookie', async () => {
        // The path a real preview takes: the storefront runs in a browser, which
        // sends auth_token as a cookie. expressAuthMiddleware only reads the
        // Authorization header, so the gate has to check the cookie itself.
        const res = await request(app)
            .get('/api/products')
            .set('X-Forwarded-Host', draftHost)
            .set('Cookie', `auth_token=${ownerToken}`)
        expect(res.status).toBe(200)
    })

    it('404s for a cookie belonging to a different tenant', async () => {
        const res = await request(app)
            .get('/api/products')
            .set('X-Forwarded-Host', draftHost)
            .set('Cookie', `auth_token=${outsiderToken}`)
        expect(res.status).toBe(404)
    })

    it('404s for a forged auth_token cookie', async () => {
        const res = await request(app)
            .get('/api/products')
            .set('X-Forwarded-Host', draftHost)
            .set('Cookie', 'auth_token=not-a-real-token')
        expect(res.status).toBe(404)
    })

    it('still 404s for a signed-in member of a different tenant', async () => {
        const res = await request(app)
            .get('/api/products')
            .set('X-Forwarded-Host', draftHost)
            .set('Authorization', `Bearer ${outsiderToken}`)
        expect(res.status).toBe(404)
    })

    it('leaves the tenant admin API reachable so the store can be built', async () => {
        const res = await request(app)
            .get('/api/admin/store-settings')
            .set('X-Forwarded-Host', draftHost)
            .set('Authorization', `Bearer ${ownerToken}`)
        expect(res.status).toBe(200)
        expect(res.body.isPublished).toBe(false)
    })

    it('leaves a published store untouched', async () => {
        const res = await request(app).get('/api/products').set('X-Forwarded-Host', liveHost)
        expect(res.status).toBe(200)
    })

    it('opens the public API once the store is published', async () => {
        await prisma.tenant.update({ where: { id: draftTenantId }, data: { publishedAt: new Date() } })

        const res = await request(app).get('/api/products').set('X-Forwarded-Host', draftHost)
        expect(res.status).toBe(200)

        await prisma.tenant.update({ where: { id: draftTenantId }, data: { publishedAt: null } })
    })
})
