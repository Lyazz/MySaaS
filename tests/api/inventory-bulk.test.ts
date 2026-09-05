import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Admin inventory bulk ops', () => {
    const slug = `inv-bulk-${Date.now()}`
    const host = `${slug}.localhost:3000`
    let tenantId: string
    let adminToken: string
    let productId: string
    let variantId: string

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Inv Bulk', slug } })
        tenantId = tenant.id

        const admin = await prisma.user.create({
            data: { tenantId, email: `admin-${slug}@example.com`, role: 'admin', passwordHash: 'x' }
        })
        adminToken = signAccessToken({ userId: admin.id, email: admin.email, role: admin.role, tenantId: admin.tenantId })

        const product = await prisma.product.create({
            data: { tenantId, title: 'Inv Product', slug: `inv-p-${Date.now()}`, price: 10, stock: 0, isActive: true }
        })
        productId = product.id

        const variant = await prisma.productVariant.create({
            data: { tenantId, productId, sku: `INV-${Date.now()}`, price: 10, stock: 5, reserved: 0, safetyStock: 0, trackInventory: true }
        })
        variantId = variant.id
    })

    afterAll(async () => {
        await prisma.inventoryMovement.deleteMany({ where: { tenantId } })
        await prisma.productVariantImage.deleteMany({ where: { tenantId } })
        await prisma.productVariantOptionValue.deleteMany({ where: { tenantId } })
        await prisma.productVariant.deleteMany({ where: { tenantId } })
        await prisma.productImage.deleteMany({ where: { tenantId } })
        await prisma.product.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    it('exports variants CSV', async () => {
        const res = await request(app)
            .get('/api/admin/inventory/variants/export.csv')
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)

        expect(res.status).toBe(200)
        expect(String(res.headers['content-type'])).toContain('text/csv')
        expect(res.text).toContain('id,productId,productTitle')
        expect(res.text).toContain(variantId)
    })

    it('imports variants CSV and creates inventory movement', async () => {
        const csv = [
            'id,stock,reserved,safetyStock,trackInventory,price,sku',
            `${variantId},8,1,2,true,12.5,SKU-001`
        ].join('\n')

        const res = await request(app)
            .post('/api/admin/inventory/variants/import.csv')
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)
            .attach('file', Buffer.from(csv, 'utf8'), { filename: 'variants.csv', contentType: 'text/csv' })

        expect(res.status).toBe(200)
        expect(res.body.updated).toBe(1)

        const refreshed = await prisma.productVariant.findFirst({ where: { tenantId, id: variantId } })
        expect(refreshed?.stock).toBe(5)
        expect(refreshed?.reserved).toBe(0)
        expect(refreshed?.safetyStock).toBe(2)
        expect(String(refreshed?.price)).toBe('12.5')
        expect(refreshed?.sku).toBe('SKU-001')

        const move = await prisma.inventoryMovement.findFirst({
            where: { tenantId, variantId, reason: 'bulk_import' },
            orderBy: { createdAt: 'desc' }
        })
        expect(move).toBeTruthy()
    })

    it('blocks bulk patch updates to stock/reserved', async () => {
        const res = await request(app)
            .patch('/api/admin/inventory/variants/bulk')
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                updates: [{ id: variantId, stock: 9, reserved: 0 }],
                reason: 'test_bulk'
            })

        expect(res.status).toBe(200)
        expect(res.body.updated).toBe(0)
        expect(res.body.errors?.[0]?.message).toMatch(/system-managed/i)
    })
})
