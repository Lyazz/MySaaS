import request from 'supertest'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'
import prisma from '../../backend/src/lib/prisma'

describe('Admin sync pull API', () => {
    const slugA = `sync-a-${Date.now()}`
    const slugB = `sync-b-${Date.now()}`
    const hostA = `${slugA}.localhost:3000`
    const hostB = `${slugB}.localhost:3000`
    let tenantAId = ''
    let tenantBId = ''
    let tokenA = ''
    let tokenB = ''
    let productAId = ''
    let productBId = ''

    beforeAll(async () => {
        const tenantA = await prisma.tenant.create({ data: { name: 'Sync Tenant A', slug: slugA } })
        const tenantB = await prisma.tenant.create({ data: { name: 'Sync Tenant B', slug: slugB } })
        tenantAId = tenantA.id
        tenantBId = tenantB.id

        const adminA = await prisma.user.create({
            data: { tenantId: tenantAId, email: `sync-a-${Date.now()}@example.com`, role: 'admin', passwordHash: 'x' }
        })
        const adminB = await prisma.user.create({
            data: { tenantId: tenantBId, email: `sync-b-${Date.now()}@example.com`, role: 'admin', passwordHash: 'x' }
        })
        tokenA = signAccessToken({ userId: adminA.id, email: adminA.email, role: adminA.role, tenantId: tenantAId })
        tokenB = signAccessToken({ userId: adminB.id, email: adminB.email, role: adminB.role, tenantId: tenantBId })

        const categoryA = await prisma.category.create({ data: { tenantId: tenantAId, title: 'Sync Category A', slug: `cat-a-${Date.now()}` } })
        const productA = await prisma.product.create({
            data: {
                tenantId: tenantAId,
                categoryId: categoryA.id,
                title: 'Sync Product A',
                slug: `product-a-${Date.now()}`,
                price: 100,
                stock: 7,
                isActive: true
            }
        })
        productAId = productA.id
        await prisma.productVariant.create({
            data: {
                tenantId: tenantAId,
                productId: productAId,
                sku: `SYNC-A-${Date.now()}`,
                price: 100,
                stock: 7,
                isActive: true
            }
        })
        await prisma.customer.create({
            data: {
                tenantId: tenantAId,
                name: 'Sync Customer A',
                phone: '0551111000',
                phoneRaw: '0551111000',
                phoneNormalized: '213551111000'
            }
        })

        const productB = await prisma.product.create({
            data: {
                tenantId: tenantBId,
                title: 'Sync Product B',
                slug: `product-b-${Date.now()}`,
                price: 200,
                stock: 9,
                isActive: true
            }
        })
        productBId = productB.id
    })

    afterAll(async () => {
        for (const tenantId of [tenantAId, tenantBId]) {
            await prisma.saleItem.deleteMany({ where: { tenantId } })
            await prisma.sale.deleteMany({ where: { tenantId } })
            await prisma.orderItem.deleteMany({ where: { tenantId } })
            await prisma.order.deleteMany({ where: { tenantId } })
            await prisma.inventoryMovement.deleteMany({ where: { tenantId } })
            await prisma.productVariantOptionValue.deleteMany({ where: { tenantId } })
            await prisma.productVariant.deleteMany({ where: { tenantId } })
            await prisma.productOptionValue.deleteMany({ where: { tenantId } })
            await prisma.productOption.deleteMany({ where: { tenantId } })
            await prisma.productCategory.deleteMany({ where: { tenantId } })
            await prisma.product.deleteMany({ where: { tenantId } })
            await prisma.category.deleteMany({ where: { tenantId } })
            await prisma.customer.deleteMany({ where: { tenantId } })
            await prisma.user.deleteMany({ where: { tenantId } })
            await prisma.tenant.deleteMany({ where: { id: tenantId } })
        }
    })

    it('returns tenant-scoped changed records for the authenticated tenant', async () => {
        const res = await request(app)
            .get('/api/admin/sync/pull')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)

        expect(res.status).toBe(200)
        expect(res.body.serverTime).toBeTruthy()
        expect(res.body.changes.products.some((p: any) => p.id === productAId)).toBe(true)
        expect(res.body.changes.products.some((p: any) => p.id === productBId)).toBe(false)
        expect(res.body.changes.categories.length).toBeGreaterThan(0)
        expect(res.body.changes.customers.length).toBeGreaterThan(0)
    })

    it('respects since cursor', async () => {
        const future = new Date(Date.now() + 60_000).toISOString()
        const res = await request(app)
            .get('/api/admin/sync/pull')
            .query({ since: future })
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)

        expect(res.status).toBe(200)
        expect(res.body.changes.products).toHaveLength(0)
        expect(res.body.changes.categories).toHaveLength(0)
        expect(res.body.changes.customers).toHaveLength(0)
    })

    it('requires authentication', async () => {
        const res = await request(app)
            .get('/api/admin/sync/pull')
            .set('X-Forwarded-Host', hostB)

        expect(res.status).toBe(401)
    })

    it('accepts client-generated product ids so offline create retries are idempotent', async () => {
        const id = randomUUID()
        const payload = {
            id,
            title: 'Offline Product',
            slug: `offline-product-${Date.now()}`,
            price: 50,
            stock: 3,
            isActive: true
        }

        const first = await request(app)
            .post('/api/admin/products')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send(payload)
        const second = await request(app)
            .post('/api/admin/products')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send(payload)

        expect(first.status).toBe(200)
        expect(second.status).toBe(200)
        expect(first.body.id).toBe(id)
        expect(second.body.id).toBe(id)

        const rows = await prisma.product.findMany({ where: { tenantId: tenantAId, id } })
        expect(rows).toHaveLength(1)
    })

    it('accepts client-generated category ids so offline create retries are idempotent', async () => {
        const id = randomUUID()
        const payload = {
            id,
            title: 'Offline Category',
            slug: `offline-category-${Date.now()}`
        }

        const first = await request(app)
            .post('/api/admin/categories')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send(payload)
        const second = await request(app)
            .post('/api/admin/categories')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send(payload)

        expect(first.status).toBe(200)
        expect(second.status).toBe(200)
        expect(first.body.id).toBe(id)
        expect(second.body.id).toBe(id)

        const rows = await prisma.category.findMany({ where: { tenantId: tenantAId, id } })
        expect(rows).toHaveLength(1)
    })
})
