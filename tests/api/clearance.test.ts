import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Clearance (destockage) module', () => {
    const slug = `clearance-${Date.now()}`
    const hostHeader = `${slug}.localhost:3000`
    let tenantId: string
    let adminToken: string

    let productAId: string
    let variantAId: string
    let productBId: string
    let variantBId: string
    let productPromoId: string
    let variantPromoId: string
    let productBundleId: string
    let variantBundleId: string

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({
            data: { name: 'Clearance Tenant', slug }
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
            data: {
                tenantId,
                cartEnabled: true,
                codEnabled: true,
                minimumOrderAmountDzd: 0,
                hideOptionalAddress: true,
                clearanceEnabled: true,
                clearanceMultiple: 6,
                clearanceDivisor: 3
            }
        })

        const productA = await prisma.product.create({
            data: { tenantId, title: 'Clearance A', slug: `clearance-a-${Date.now()}`, price: 1000, stock: 100, isActive: true, isClearance: true }
        })
        productAId = productA.id
        const variantA = await prisma.productVariant.create({
            data: { tenantId, productId: productAId, sku: `CLR-A-${Date.now()}`, price: 1000, stock: 100 }
        })
        variantAId = variantA.id

        const productB = await prisma.product.create({
            data: { tenantId, title: 'Clearance B', slug: `clearance-b-${Date.now()}`, price: 2000, stock: 100, isActive: true, isClearance: true }
        })
        productBId = productB.id
        const variantB = await prisma.productVariant.create({
            data: { tenantId, productId: productBId, sku: `CLR-B-${Date.now()}`, price: 2000, stock: 100 }
        })
        variantBId = variantB.id

        const productPromo = await prisma.product.create({
            data: {
                tenantId,
                title: 'Clearance Promo',
                slug: `clearance-promo-${Date.now()}`,
                price: 500,
                stock: 100,
                isActive: true,
                isClearance: true,
                isPromotionActive: true,
                promotionalPrice: 400
            }
        })
        productPromoId = productPromo.id
        const variantPromo = await prisma.productVariant.create({
            data: { tenantId, productId: productPromoId, sku: `CLR-PROMO-${Date.now()}`, price: 500, stock: 100 }
        })
        variantPromoId = variantPromo.id

        const productBundle = await prisma.product.create({
            data: { tenantId, title: 'Clearance Bundle', slug: `clearance-bundle-${Date.now()}`, price: 300, stock: 100, isActive: true, isClearance: true }
        })
        productBundleId = productBundle.id
        const variantBundle = await prisma.productVariant.create({
            data: { tenantId, productId: productBundleId, sku: `CLR-BUNDLE-${Date.now()}`, price: 300, stock: 100 }
        })
        variantBundleId = variantBundle.id

        await prisma.productBundleDeal.create({
            data: { tenantId, productId: productBundleId, bundleQty: 2, bundlePrice: 500, isActive: true }
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

    it('applies a cross-product discount when the exact threshold is reached', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', hostHeader)
            .send({
                customerName: 'Clearance Buyer',
                customerPhone: '0550111222',
                items: [
                    { productId: productAId, variantId: variantAId, quantity: 4 },
                    { productId: productBId, variantId: variantBId, quantity: 2 }
                ]
            })

        expect(res.status).toBe(201)

        const saved = await prisma.order.findUnique({ where: { id: res.body.orderId } })
        expect(Number(saved?.clearanceDiscountAmount)).toBe(2000)
        expect(Number(saved?.totalAmount)).toBe(6000)
        const breakdown = saved?.clearanceBreakdown as any
        expect(breakdown?.freeCount).toBe(2)
    })

    it('rewards a partial threshold and ignores the remainder', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', hostHeader)
            .send({
                customerName: 'Partial Threshold Buyer',
                customerPhone: '0550111333',
                items: [{ productId: productAId, variantId: variantAId, quantity: 8 }]
            })

        expect(res.status).toBe(201)
        const saved = await prisma.order.findUnique({ where: { id: res.body.orderId } })
        expect(Number(saved?.clearanceDiscountAmount)).toBe(2000)
        expect(Number(saved?.totalAmount)).toBe(6000)
    })

    it('excludes lines with an active promotion from the clearance pool', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', hostHeader)
            .send({
                customerName: 'Promo Buyer',
                customerPhone: '0550111444',
                items: [{ productId: productPromoId, variantId: variantPromoId, quantity: 6 }]
            })

        expect(res.status).toBe(201)
        const saved = await prisma.order.findUnique({ where: { id: res.body.orderId } })
        expect(Number(saved?.clearanceDiscountAmount)).toBe(0)
        expect(Number(saved?.totalAmount)).toBe(2400)
    })

    it('excludes lines with an active bundle deal from the clearance pool', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', hostHeader)
            .send({
                customerName: 'Bundle Buyer',
                customerPhone: '0550111555',
                items: [{ productId: productBundleId, variantId: variantBundleId, quantity: 6 }]
            })

        expect(res.status).toBe(201)
        const saved = await prisma.order.findUnique({ where: { id: res.body.orderId } })
        expect(Number(saved?.clearanceDiscountAmount)).toBe(0)
        expect(Number(saved?.totalAmount)).toBe(1500)
    })

    it('rejects marking a product as clearance while a promotion is active', async () => {
        const res = await request(app)
            .put(`/api/admin/products/${productBId}`)
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ isPromotionActive: true, promotionalPrice: 1500, isClearance: true })

        expect(res.status).toBe(400)
        expect(String(res.body?.statusMessage || '')).toMatch(/clearance/i)
    })

    it('validates clearanceMultiple and clearanceDivisor on store settings', async () => {
        const res = await request(app)
            .patch('/api/admin/store-settings')
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ clearanceMultiple: 0 })

        expect(res.status).toBe(400)
        expect(String(res.body?.statusMessage || '')).toMatch(/clearanceMultiple/i)
    })
})

describe('Clearance module — applies to all products when none is tagged', () => {
    const slug = `clearance-all-${Date.now()}`
    const hostHeader = `${slug}.localhost:3000`
    let tenantId: string
    let productId: string
    let variantId: string

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({
            data: { name: 'Clearance All Tenant', slug }
        })
        tenantId = tenant.id

        await prisma.storeSettings.create({
            data: {
                tenantId,
                cartEnabled: true,
                codEnabled: true,
                minimumOrderAmountDzd: 0,
                hideOptionalAddress: true,
                clearanceEnabled: true,
                clearanceMultiple: 6,
                clearanceDivisor: 3
            }
        })

        const product = await prisma.product.create({
            data: { tenantId, title: 'Untagged Product', slug: `untagged-${Date.now()}`, price: 1000, stock: 100, isActive: true, isClearance: false }
        })
        productId = product.id
        const variant = await prisma.productVariant.create({
            data: { tenantId, productId, sku: `UNTAGGED-${Date.now()}`, price: 1000, stock: 100 }
        })
        variantId = variant.id
    })

    afterAll(async () => {
        await prisma.orderItem.deleteMany({ where: { tenantId } })
        await prisma.order.deleteMany({ where: { tenantId } })
        await prisma.productVariant.deleteMany({ where: { tenantId } })
        await prisma.product.deleteMany({ where: { tenantId } })
        await prisma.storeSettings.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    it('applies the discount to an untagged product when no product in the tenant is tagged', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', hostHeader)
            .send({
                customerName: 'Opt Out Buyer',
                customerPhone: '0550111666',
                items: [{ productId, variantId, quantity: 6 }]
            })

        expect(res.status).toBe(201)
        const saved = await prisma.order.findUnique({ where: { id: res.body.orderId } })
        expect(Number(saved?.clearanceDiscountAmount)).toBe(2000)
        expect(Number(saved?.totalAmount)).toBe(4000)
    })
})
