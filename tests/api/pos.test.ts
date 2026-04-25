import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Admin POS (direct sale) flow', () => {
    const slug = `pos-${Date.now()}`
    const hostHeader = `${slug}.localhost:3000`
    let tenantId: string
    let adminId: string
    let adminToken: string
    let productId: string
    let variantId: string
    let variantStockBefore = 0
    let customerId: string
    let sku: string

    let otherTenantId: string
    let otherCustomerId: string
    let otherSku: string

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({ data: { name: 'POS Tenant', slug } })
        tenantId = tenant.id

        const admin = await prisma.user.create({
            data: {
                tenantId,
                email: `admin-${slug}@example.com`,
                role: 'admin',
                passwordHash: 'x'
            }
        })
        adminId = admin.id
        adminToken = signAccessToken({ userId: admin.id, email: admin.email, role: admin.role, tenantId: admin.tenantId })

        await prisma.storeSettings.create({ data: { tenantId, cartEnabled: false, codEnabled: false } })

        const product = await prisma.product.create({
            data: {
                tenantId,
                title: 'POS Product',
                slug: `pos-product-${Date.now()}`,
                price: 100,
                stock: 10,
                isActive: true
            }
        })
        productId = product.id

        const variant = await prisma.productVariant.create({
            data: {
                tenantId,
                productId,
                price: 120,
                stock: 5,
                reserved: 0,
                safetyStock: 0,
                trackInventory: true,
                isActive: true,
                sku: `SKU-${Date.now()}`
            }
        })
        variantId = variant.id
        variantStockBefore = variant.stock
        sku = variant.sku as string

        const customer = await prisma.customer.create({
            data: {
                tenantId,
                name: 'POS Customer',
                phone: '0550000001',
                phoneRaw: '0550000001',
                phoneNormalized: '213550000001',
                email: `pos-${slug}@example.com`,
                address: 'Algiers'
            }
        })
        customerId = customer.id

        const other = await prisma.tenant.create({ data: { name: 'Other Tenant', slug: `other-${slug}` } })
        otherTenantId = other.id

        const otherCustomer = await prisma.customer.create({
            data: {
                tenantId: otherTenantId,
                name: 'Other Customer',
                phone: '0550000002',
                phoneRaw: '0550000002',
                phoneNormalized: '213550000002',
                email: `other-${slug}@example.com`,
                address: 'Oran'
            }
        })
        otherCustomerId = otherCustomer.id

        const otherProduct = await prisma.product.create({
            data: {
                tenantId: otherTenantId,
                title: 'Other POS Product',
                slug: `other-pos-product-${Date.now()}`,
                price: 50,
                stock: 10,
                isActive: true
            }
        })
        await prisma.productVariant.create({
            data: {
                tenantId: otherTenantId,
                productId: otherProduct.id,
                price: 55,
                stock: 5,
                reserved: 0,
                safetyStock: 0,
                trackInventory: true,
                isActive: true,
                sku: `OTHER-SKU-${Date.now()}`
            }
        })
        otherSku = (await prisma.productVariant.findFirst({ where: { tenantId: otherTenantId, productId: otherProduct.id } }))?.sku as string
    })

    afterAll(async () => {
        await prisma.saleItem.deleteMany({ where: { sale: { tenantId } } })
        await prisma.sale.deleteMany({ where: { tenantId } })
        await prisma.inventoryMovement.deleteMany({ where: { tenantId } })
        await prisma.productVariant.deleteMany({ where: { tenantId } })
        await prisma.product.deleteMany({ where: { tenantId } })
        await prisma.storeSettings.deleteMany({ where: { tenantId } })
        await prisma.customer.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })

        await prisma.orderItem.deleteMany({ where: { order: { tenantId: otherTenantId } } })
        await prisma.order.deleteMany({ where: { tenantId: otherTenantId } })
        await prisma.inventoryMovement.deleteMany({ where: { tenantId: otherTenantId } })
        await prisma.customer.deleteMany({ where: { tenantId: otherTenantId } })
        await prisma.user.deleteMany({ where: { tenantId: otherTenantId } })
        await prisma.productVariant.deleteMany({ where: { tenantId: otherTenantId } })
        await prisma.product.deleteMany({ where: { tenantId: otherTenantId } })
        await prisma.storeSettings.deleteMany({ where: { tenantId: otherTenantId } })
        await prisma.tenant.deleteMany({ where: { id: otherTenantId } })
    })

    it('requires authentication', async () => {
        const res = await request(app)
            .post('/api/admin/pos/sales')
            .set('X-Forwarded-Host', hostHeader)
            .send({
                items: [{ productId, variantId, quantity: 1 }]
            })

        expect(res.status).toBe(401)
    })

    it('looks up product variant by SKU (tenant-scoped)', async () => {
        const res = await request(app)
            .get('/api/admin/pos/lookup')
            .query({ code: sku })
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)

        expect(res.status).toBe(200)
        expect(res.body.variantId).toBe(variantId)
        expect(res.body.productId).toBe(productId)

        const cross = await request(app)
            .get('/api/admin/pos/lookup')
            .query({ code: otherSku })
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)

        expect(cross.status).toBe(404)
    })

    it('creates a COMPLETED sale and decrements inventory immediately (even if cart/COD disabled)', async () => {
        const res = await request(app)
            .post('/api/admin/pos/sales')
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                customerId,
                items: [{ productId, variantId, quantity: 2 }]
            })

        expect(res.status).toBe(201)
        expect(res.body.saleId).toBeDefined()

        const saleId = res.body.saleId as string
        const saved = await prisma.sale.findUnique({
            where: { id: saleId },
            include: { items: true }
        })

        expect(saved?.tenantId).toBe(tenantId)
        expect(saved?.status).toBe('COMPLETED')
        expect(saved?.customerId).toBe(customerId)
        expect(saved?.items.length).toBe(1)
        expect(saved?.items[0].variantId).toBe(variantId)
        expect(saved?.items[0].quantity).toBe(2)

        const variantAfter = await prisma.productVariant.findUnique({ where: { tenantId_id: { tenantId, id: variantId } } })
        expect(variantAfter?.stock).toBe(variantStockBefore - 2)
        expect(variantAfter?.reserved).toBe(0)

        const move = await prisma.inventoryMovement.findFirst({
            where: { tenantId, variantId, saleId, type: 'ORDER_DECREMENT', reason: 'pos_sale' },
            orderBy: { createdAt: 'desc' }
        })
        expect(move?.delta).toBe(-2)
        expect(move?.reservedDelta).toBe(0)
        expect(move?.createdByUserId).toBe(adminId)
        expect(move?.orderId).toBeNull()
    })

    it('rejects cross-tenant customerId', async () => {
        const res = await request(app)
            .post('/api/admin/pos/sales')
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                customerId: otherCustomerId,
                items: [{ productId, variantId, quantity: 1 }]
            })

        expect(res.status).toBe(400)
        expect(String(res.body?.statusMessage || '')).toMatch(/customer/i)
    })
})
