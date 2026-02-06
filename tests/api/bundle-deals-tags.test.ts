import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Product bundle deal tags', () => {
    const slug = `bundletags-${Date.now()}`
    const hostHeader = `${slug}.localhost:3000`
    let tenantId: string
    let adminToken: string
    let productId: string
    let productSlug: string

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({
            data: { name: 'Bundle Tags Tenant', slug }
        })
        tenantId = tenant.id

        const admin = await prisma.user.create({
            data: {
                tenantId,
                email: `admin-${slug}@example.com`,
                role: 'admin',
                passwordHash: 'x'
            }
        })
        adminToken = signAccessToken({ userId: admin.id, email: admin.email, role: admin.role, tenantId: admin.tenantId })

        await prisma.storeSettings.create({
            data: { tenantId, cartEnabled: true, codEnabled: true }
        })

        productSlug = `bundle-tags-product-${Date.now()}`
        const product = await prisma.product.create({
            data: {
                tenantId,
                title: 'Tagged Bundle Product',
                slug: productSlug,
                price: 1000,
                stock: 100,
                isActive: true
            }
        })
        productId = product.id

        await prisma.productVariant.create({
            data: {
                tenantId,
                productId,
                price: 1000,
                stock: 100,
                isActive: true
            }
        })
    })

    afterAll(async () => {
        await prisma.productBundleDeal.deleteMany({ where: { tenantId } })
        await prisma.orderItem.deleteMany({ where: { tenantId } })
        await prisma.order.deleteMany({ where: { tenantId } })
        await prisma.productVariant.deleteMany({ where: { tenantId } })
        await prisma.product.deleteMany({ where: { tenantId } })
        await prisma.storeSettings.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    it('allows admin to set tag and exposes it publicly', async () => {
        const created = await request(app)
            .post(`/api/admin/products/${productId}/bundles`)
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ bundleQty: 2, bundlePrice: 1800, tag: 'MOST_POPULAR', isActive: true })

        expect(created.status).toBe(201)
        expect(created.body.tag).toBe('MOST_POPULAR')

        const publicRes = await request(app)
            .get(`/api/products/${encodeURIComponent(productSlug)}`)
            .set('X-Forwarded-Host', hostHeader)

        expect(publicRes.status).toBe(200)
        const deals = publicRes.body.bundleDeals || []
        expect(Array.isArray(deals)).toBe(true)
        expect(deals[0]?.tag).toBe('MOST_POPULAR')
    })

    it('rejects invalid tag', async () => {
        const res = await request(app)
            .post(`/api/admin/products/${productId}/bundles`)
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ bundleQty: 3, bundlePrice: 2400, tag: 'FREE_SHIPPING' })

        expect(res.status).toBe(400)
        expect(String(res.body?.statusMessage || '')).toMatch(/tag/i)
    })
})

