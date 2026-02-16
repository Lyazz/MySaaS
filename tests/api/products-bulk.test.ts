import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Admin products bulk ops', () => {
    const slugA = `bulk-a-${Date.now()}`
    const hostA = `${slugA}.localhost:3000`
    let tenantAId: string
    let adminAToken: string
    let categoryAId: string
    let productAId: string

    const slugB = `bulk-b-${Date.now()}`
    const hostB = `${slugB}.localhost:3000`
    let tenantBId: string
    let adminBToken: string

    beforeAll(async () => {
        const tenantA = await prisma.tenant.create({ data: { name: 'Bulk A', slug: slugA } })
        tenantAId = tenantA.id
        const adminA = await prisma.user.create({
            data: { tenantId: tenantAId, email: `admin-${slugA}@example.com`, role: 'admin', passwordHash: 'x' }
        })
        adminAToken = signAccessToken({
            userId: adminA.id,
            email: adminA.email,
            role: adminA.role,
            tenantId: adminA.tenantId
        })

        const cat = await prisma.category.create({
            data: { tenantId: tenantAId, title: 'Cat A', slug: `cat-a-${Date.now()}` }
        })
        categoryAId = cat.id

        const product = await prisma.product.create({
            data: {
                tenantId: tenantAId,
                title: 'Bulk Product',
                slug: `bulk-product-${Date.now()}`,
                price: 100,
                stock: 1,
                isActive: true,
                categoryId: categoryAId
            }
        })
        productAId = product.id

        await prisma.productVariant.create({
            data: {
                tenantId: tenantAId,
                productId: productAId,
                sku: `BULK-${Date.now()}`,
                price: 100,
                stock: 1,
                reserved: 0,
                safetyStock: 0,
                trackInventory: true,
                isActive: true
            }
        })

        const tenantB = await prisma.tenant.create({ data: { name: 'Bulk B', slug: slugB } })
        tenantBId = tenantB.id
        const adminB = await prisma.user.create({
            data: { tenantId: tenantBId, email: `admin-${slugB}@example.com`, role: 'admin', passwordHash: 'x' }
        })
        adminBToken = signAccessToken({
            userId: adminB.id,
            email: adminB.email,
            role: adminB.role,
            tenantId: adminB.tenantId
        })
    })

    afterAll(async () => {
        await prisma.inventoryMovement.deleteMany({ where: { tenantId: tenantAId } })
        await prisma.productVariantImage.deleteMany({ where: { tenantId: tenantAId } })
        await prisma.productVariantOptionValue.deleteMany({ where: { tenantId: tenantAId } })
        await prisma.productVariant.deleteMany({ where: { tenantId: tenantAId } })
        await prisma.productOptionValue.deleteMany({ where: { tenantId: tenantAId } })
        await prisma.productOption.deleteMany({ where: { tenantId: tenantAId } })
        await prisma.productImage.deleteMany({ where: { tenantId: tenantAId } })
        await prisma.productBundleDeal.deleteMany({ where: { tenantId: tenantAId } })
        await prisma.product.deleteMany({ where: { tenantId: tenantAId } })
        await prisma.category.deleteMany({ where: { tenantId: tenantAId } })
        await prisma.user.deleteMany({ where: { tenantId: tenantAId } })
        await prisma.tenant.deleteMany({ where: { id: tenantAId } })

        await prisma.inventoryMovement.deleteMany({ where: { tenantId: tenantBId } })
        await prisma.productVariantImage.deleteMany({ where: { tenantId: tenantBId } })
        await prisma.productVariantOptionValue.deleteMany({ where: { tenantId: tenantBId } })
        await prisma.productVariant.deleteMany({ where: { tenantId: tenantBId } })
        await prisma.productOptionValue.deleteMany({ where: { tenantId: tenantBId } })
        await prisma.productOption.deleteMany({ where: { tenantId: tenantBId } })
        await prisma.productImage.deleteMany({ where: { tenantId: tenantBId } })
        await prisma.productBundleDeal.deleteMany({ where: { tenantId: tenantBId } })
        await prisma.product.deleteMany({ where: { tenantId: tenantBId } })
        await prisma.category.deleteMany({ where: { tenantId: tenantBId } })
        await prisma.user.deleteMany({ where: { tenantId: tenantBId } })
        await prisma.tenant.deleteMany({ where: { id: tenantBId } })
    })

    it('exports products CSV for tenant', async () => {
        const res = await request(app)
            .get('/api/admin/products/export.csv')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminAToken}`)

        expect(res.status).toBe(200)
        expect(String(res.headers['content-type'])).toContain('text/csv')
        expect(res.text).toContain('id,title,slug')
        expect(res.text).toContain('Bulk Product')
    })

    it('rejects cross-tenant admin token on tenant host', async () => {
        const res = await request(app)
            .get('/api/admin/products/export.csv')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminBToken}`)

        expect(res.status).toBe(403)
    })

    it('imports CSV but ignores stock updates after creation', async () => {
        const csv = [
            'id,slug,title,price,stock,isActive,categoryId',
            `${productAId},,Bulk Product Updated,150,7,true,${categoryAId}`
        ].join('\n')

        const res = await request(app)
            .post('/api/admin/products/import.csv')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminAToken}`)
            .attach('file', Buffer.from(csv, 'utf8'), { filename: 'products.csv', contentType: 'text/csv' })

        expect(res.status).toBe(200)
        expect(res.body.updated).toBe(1)
        expect(res.body.warnings?.[0]?.message).toMatch(/stock is system-managed/i)

        const refreshed = await prisma.product.findFirst({ where: { tenantId: tenantAId, id: productAId } })
        expect(refreshed?.title).toBe('Bulk Product Updated')
        expect(String(refreshed?.price)).toBe('150')

        const variant = await prisma.productVariant.findFirst({
            where: { tenantId: tenantAId, productId: productAId, optionValues: { none: {} } }
        })
        expect(variant?.stock).toBe(1)

        const move = await prisma.inventoryMovement.findFirst({
            where: { tenantId: tenantAId, variantId: variant!.id, reason: 'bulk_import' },
            orderBy: { createdAt: 'desc' }
        })
        expect(move).toBeNull()
    })

    it('bulk patches products and duplicates selected product', async () => {
        const patch = await request(app)
            .patch('/api/admin/products/bulk')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminAToken}`)
            .send({
                ids: [productAId],
                data: { isActive: false, price: '199' },
                options: { propagatePriceToVariants: true }
            })

        expect(patch.status).toBe(200)

        const dup = await request(app)
            .post(`/api/admin/products/${productAId}/duplicate`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminAToken}`)
            .send({})

        expect(dup.status).toBe(200)
        expect(dup.body.id).toBeDefined()
        expect(dup.body.id).not.toBe(productAId)
        expect(dup.body.isActive).toBe(false)
        expect(String(dup.body.slug)).toContain('copy')

        const newVariants = await prisma.productVariant.findMany({ where: { tenantId: tenantAId, productId: dup.body.id } })
        expect(newVariants.length).toBeGreaterThan(0)
    })

    it('blocks bulk patch stock updates', async () => {
        const res = await request(app)
            .patch('/api/admin/products/bulk')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminAToken}`)
            .send({
                ids: [productAId],
                data: { stock: 9 }
            })

        expect(res.status).toBe(400)
        expect(res.body?.statusMessage).toMatch(/system-managed/i)
    })
})
