import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

/**
 * Publishing used to be a no-op: it wrote isOffline = false, which was already
 * false, so the checklist showed "published" on a store that had never opened.
 * These cover the real gate -- a store may only open once it can take an order.
 */
describe('Store publish gate', () => {
    const stamp = Date.now()
    const slug = `publish-gate-${stamp}`
    const host = `${slug}.localhost:3000`
    const otherSlug = `publish-other-${stamp}`

    let tenantId: string
    let otherTenantId: string
    let userId: string
    let token: string

    const publish = () =>
        request(app)
            .patch('/api/admin/store-settings/publish')
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({
            data: { name: 'Publish Gate Tenant', slug, publishedAt: null }
        })
        tenantId = tenant.id

        const otherTenant = await prisma.tenant.create({
            data: { name: 'Publish Other Tenant', slug: otherSlug, publishedAt: null }
        })
        otherTenantId = otherTenant.id

        const user = await prisma.user.create({
            data: { tenantId, email: `publish-owner-${stamp}@example.com`, role: 'owner', passwordHash: 'x' }
        })
        userId = user.id
        token = signAccessToken({
            userId: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId
        })
    })

    beforeEach(async () => {
        await prisma.product.deleteMany({ where: { tenantId } })
        await prisma.tenant.update({ where: { id: tenantId }, data: { publishedAt: null } })
        await prisma.storeSettings.upsert({
            where: { tenantId },
            create: { tenantId, allowedDeliveryProviders: [], storePickupEnabled: false },
            update: { allowedDeliveryProviders: [], storePickupEnabled: false }
        })
    })

    afterAll(async () => {
        await prisma.product.deleteMany({ where: { tenantId } })
        await prisma.storeSettings.deleteMany({ where: { tenantId: { in: [tenantId, otherTenantId] } } })
        await prisma.user.deleteMany({ where: { id: userId } })
        await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantId, otherTenantId] } } })
        await prisma.tenant.deleteMany({ where: { id: { in: [tenantId, otherTenantId] } } })
    })

    const addProduct = () =>
        prisma.product.create({
            data: { tenantId, title: 'Publishable', slug: `publishable-${Date.now()}`, price: 100 }
        })

    const addDelivery = () =>
        prisma.storeSettings.update({ where: { tenantId }, data: { allowedDeliveryProviders: ['SELF'] } })

    it('refuses to publish a store with no product and no delivery', async () => {
        const res = await publish()
        expect(res.status).toBe(409)
        expect(res.body.missing).toEqual(expect.arrayContaining(['product', 'delivery']))

        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
        expect(tenant?.publishedAt).toBeNull()
    })

    it('refuses to publish a store with a product but no delivery', async () => {
        await addProduct()

        const res = await publish()
        expect(res.status).toBe(409)
        expect(res.body.missing).toEqual(['delivery'])
    })

    it('refuses to publish a store with delivery but no product', async () => {
        await addDelivery()

        const res = await publish()
        expect(res.status).toBe(409)
        expect(res.body.missing).toEqual(['product'])
    })

    it('accepts SELF as a delivery method', async () => {
        await addProduct()
        await addDelivery()

        const res = await publish()
        expect(res.status).toBe(200)

        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
        expect(tenant?.publishedAt).toBeInstanceOf(Date)
    })

    it('accepts store pickup on its own as a delivery method', async () => {
        await addProduct()
        await prisma.storeSettings.update({ where: { tenantId }, data: { storePickupEnabled: true } })

        const res = await publish()
        expect(res.status).toBe(200)
    })

    it('does not touch isOffline, which is the tier flag rather than the publish flag', async () => {
        await prisma.tenant.update({ where: { id: tenantId }, data: { isOffline: true } })
        await addProduct()
        await addDelivery()

        expect((await publish()).status).toBe(200)

        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
        expect(tenant?.isOffline).toBe(true)

        await prisma.tenant.update({ where: { id: tenantId }, data: { isOffline: false } })
    })

    it('keeps the original publishedAt when publishing twice', async () => {
        await addProduct()
        await addDelivery()

        expect((await publish()).status).toBe(200)
        const first = await prisma.tenant.findUnique({ where: { id: tenantId } })

        expect((await publish()).status).toBe(200)
        const second = await prisma.tenant.findUnique({ where: { id: tenantId } })

        expect(second?.publishedAt?.getTime()).toBe(first?.publishedAt?.getTime())
    })

    it('publishes only the caller’s own tenant', async () => {
        await addProduct()
        await addDelivery()

        expect((await publish()).status).toBe(200)

        const other = await prisma.tenant.findUnique({ where: { id: otherTenantId } })
        expect(other?.publishedAt).toBeNull()
    })

    it('reports what is missing on the onboarding checklist', async () => {
        const res = await request(app)
            .get('/api/admin/store-settings/onboarding-checklist')
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        expect(res.body.isPublished).toBe(false)
        expect(res.body.canPublish).toBe(false)
        expect(res.body.missingToPublish).toEqual(expect.arrayContaining(['product', 'delivery']))
    })

    it('counts SELF as configured delivery on the checklist', async () => {
        await addDelivery()

        const res = await request(app)
            .get('/api/admin/store-settings/onboarding-checklist')
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)

        expect(res.body.hasDelivery).toBe(true)
    })

    it('persists the store description the wizard collects', async () => {
        const res = await request(app)
            .patch('/api/admin/store-settings')
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)
            .send({ description: '  Handmade candles from Algiers  ' })

        expect(res.status).toBe(200)
        expect(res.body.description).toBe('Handmade candles from Algiers')
    })

    it('records the wizard resume point and the deliberate exit', async () => {
        const res = await request(app)
            .patch('/api/admin/store-settings')
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)
            .send({ onboardingStep: 3, onboardingExited: true })

        expect(res.status).toBe(200)
        expect(res.body.onboardingStep).toBe(3)
        expect(res.body.onboardingExitedAt).toBeTruthy()

        const back = await request(app)
            .patch('/api/admin/store-settings')
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)
            .send({ onboardingExited: false })

        expect(back.body.onboardingExitedAt).toBeNull()
    })
})
