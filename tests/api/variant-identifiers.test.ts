import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Variant identifiers (SKU + barcode)', () => {
    const slug = `ident-${Date.now()}`
    const host = `${slug}.localhost:3000`
    let tenantId: string
    let adminToken: string
    let adminUserId: string

    let productAId: string
    let variantAId: string

    let productBId: string
    let variantBId: string

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Identifiers Tenant', slug } })
        tenantId = tenant.id

        const admin = await prisma.user.create({
            data: {
                tenantId,
                email: `admin-${slug}@example.com`,
                role: 'admin',
                passwordHash: 'x'
            }
        })
        adminUserId = admin.id
        adminToken = signAccessToken({ userId: admin.id, email: admin.email, role: admin.role, tenantId: admin.tenantId })

        // Create 2 products via API to get default variants created by service.
        const createdA = await request(app)
            .post('/api/admin/products')
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: 'A', slug: `a-${Date.now()}`, price: 10, stock: 0, isActive: true })
        expect(createdA.status).toBe(200)
        productAId = createdA.body.id

        const createdB = await request(app)
            .post('/api/admin/products')
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: 'B', slug: `b-${Date.now()}`, price: 20, stock: 0, isActive: true })
        expect(createdB.status).toBe(200)
        productBId = createdB.body.id

        const prodA = await request(app)
            .get(`/api/admin/products/${productAId}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)
        expect(prodA.status).toBe(200)
        variantAId = prodA.body.variants?.[0]?.id
        expect(variantAId).toBeTruthy()

        const prodB = await request(app)
            .get(`/api/admin/products/${productBId}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)
        expect(prodB.status).toBe(200)
        variantBId = prodB.body.variants?.[0]?.id
        expect(variantBId).toBeTruthy()
    })

    afterAll(async () => {
        await prisma.productVariant.deleteMany({ where: { tenantId } })
        await prisma.product.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    it('allows updating SKU while unlocked, then blocks changes after lock', async () => {
        const setRes = await request(app)
            .put(`/api/admin/variants/${variantAId}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ sku: 'abc-1' })

        expect(setRes.status).toBe(200)
        expect(setRes.body?.sku).toBe('ABC-1')

        const lockRes = await request(app)
            .post(`/api/admin/variants/${variantAId}/sku/lock`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)

        expect(lockRes.status).toBe(200)
        expect(lockRes.body?.skuLocked).toBe(true)

        const changeRes = await request(app)
            .put(`/api/admin/variants/${variantAId}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ sku: 'DEF-2' })

        expect(changeRes.status).toBe(403)
    })

    it('enforces tenant-unique barcode and supports POS lookup by barcode', async () => {
        const setBarcode = await request(app)
            .put(`/api/admin/variants/${variantAId}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ barcode: '1234567890123' })

        expect(setBarcode.status).toBe(200)
        expect(setBarcode.body?.barcode).toBe('1234567890123')

        const conflict = await request(app)
            .put(`/api/admin/variants/${variantBId}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ barcode: '1234567890123' })

        expect(conflict.status).toBe(409)

        const lookup = await request(app)
            .get('/api/admin/pos/lookup')
            .query({ code: '1234567890123' })
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)

        expect(lookup.status).toBe(200)
        expect(lookup.body?.variantId).toBe(variantAId)
    })
})

