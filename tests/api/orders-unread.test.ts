import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Orders unread notifications', () => {
    const slugA = `orders-unread-a-${Date.now()}`
    const hostA = `${slugA}.localhost:3000`
    const slugB = `orders-unread-b-${Date.now()}`
    const hostB = `${slugB}.localhost:3000`

    let tenantAId: string
    let tenantBId: string
    let adminA1Token: string
    let adminA2Token: string
    let adminBToken: string
    let productAId: string
    let variantAId: string
    let productBId: string
    let variantBId: string

    beforeAll(async () => {
        const tenantA = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Unread Tenant A', slug: slugA } })
        tenantAId = tenantA.id
        const tenantB = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Unread Tenant B', slug: slugB } })
        tenantBId = tenantB.id

        const adminA1 = await prisma.user.create({
            data: { tenantId: tenantAId, email: `admin-a1-${slugA}@example.com`, role: 'admin', passwordHash: 'x' }
        })
        adminA1Token = signAccessToken({ userId: adminA1.id, email: adminA1.email, role: adminA1.role, tenantId: adminA1.tenantId })

        const adminA2 = await prisma.user.create({
            data: { tenantId: tenantAId, email: `admin-a2-${slugA}@example.com`, role: 'admin', passwordHash: 'x' }
        })
        adminA2Token = signAccessToken({ userId: adminA2.id, email: adminA2.email, role: adminA2.role, tenantId: adminA2.tenantId })

        const adminB = await prisma.user.create({
            data: { tenantId: tenantBId, email: `admin-b-${slugB}@example.com`, role: 'admin', passwordHash: 'x' }
        })
        adminBToken = signAccessToken({ userId: adminB.id, email: adminB.email, role: adminB.role, tenantId: adminB.tenantId })

        await prisma.storeSettings.create({
            data: { tenantId: tenantAId, cartEnabled: true, codEnabled: true, minimumOrderAmountDzd: 0 }
        })
        await prisma.storeSettings.create({
            data: { tenantId: tenantBId, cartEnabled: true, codEnabled: true, minimumOrderAmountDzd: 0 }
        })

        const productA = await prisma.product.create({
            data: {
                tenantId: tenantAId,
                title: 'Unread Product A',
                slug: `unread-product-a-${Date.now()}`,
                price: 100,
                stock: 50,
                isActive: true
            }
        })
        productAId = productA.id

        const variantA = await prisma.productVariant.create({
            data: {
                tenantId: tenantAId,
                productId: productAId,
                sku: `UNREAD-A-${Date.now()}`,
                price: 100,
                stock: 50
            }
        })
        variantAId = variantA.id

        const productB = await prisma.product.create({
            data: {
                tenantId: tenantBId,
                title: 'Unread Product B',
                slug: `unread-product-b-${Date.now()}`,
                price: 100,
                stock: 50,
                isActive: true
            }
        })
        productBId = productB.id

        const variantB = await prisma.productVariant.create({
            data: {
                tenantId: tenantBId,
                productId: productBId,
                sku: `UNREAD-B-${Date.now()}`,
                price: 100,
                stock: 50
            }
        })
        variantBId = variantB.id
    })

    afterAll(async () => {
        await prisma.orderItem.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.order.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.productVariant.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.product.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.storeSettings.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } })
    })

    it('creates public checkout orders as unread', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', hostA)
            .send({
                customerName: 'Unread Buyer',
                customerPhone: '0551000000',
                items: [{ productId: productAId, variantId: variantAId, quantity: 1 }]
            })

        expect(res.status).toBe(201)

        const saved = await prisma.order.findUnique({
            where: { id: res.body.orderId },
            select: { tenantId: true, readAt: true }
        })

        expect(saved?.tenantId).toBe(tenantAId)
        expect(saved?.readAt).toBeNull()
    })

    it('creates admin orders as already read', async () => {
        const res = await request(app)
            .post('/api/admin/orders')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminA1Token}`)
            .send({
                customerName: 'Admin Created Read',
                customerPhone: '0551000001',
                items: [{ productId: productAId, variantId: variantAId, quantity: 1 }]
            })

        expect(res.status).toBe(201)

        const saved = await prisma.order.findUnique({
            where: { id: res.body.orderId },
            select: { readAt: true }
        })

        expect(saved?.readAt).toBeInstanceOf(Date)
    })

    it('returns unread count only for the authenticated tenant', async () => {
        await prisma.order.create({
            data: {
                tenantId: tenantAId,
                status: 'PENDING',
                totalAmount: 100,
                customerName: 'Tenant A Unread',
                customerPhone: '0551000002',
                readAt: null
            }
        })

        await prisma.order.create({
            data: {
                tenantId: tenantAId,
                status: 'PENDING',
                totalAmount: 100,
                customerName: 'Tenant A Read',
                customerPhone: '0551000003',
                readAt: new Date()
            }
        })

        await prisma.order.create({
            data: {
                tenantId: tenantBId,
                status: 'PENDING',
                totalAmount: 100,
                customerName: 'Tenant B Unread',
                customerPhone: '0551000004',
                readAt: null
            }
        })

        const res = await request(app)
            .get('/api/admin/orders/unread-count')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminA1Token}`)

        expect(res.status).toBe(200)
        expect(res.body.unreadCount).toBeGreaterThanOrEqual(2)

        const tenantBRes = await request(app)
            .get('/api/admin/orders/unread-count')
            .set('X-Forwarded-Host', hostB)
            .set('Authorization', `Bearer ${adminBToken}`)

        expect(tenantBRes.status).toBe(200)
        expect(tenantBRes.body.unreadCount).toBe(1)
    })

    it('marks an order as read idempotently and rejects cross-tenant access', async () => {
        const order = await prisma.order.create({
            data: {
                tenantId: tenantAId,
                status: 'PENDING',
                totalAmount: 100,
                customerName: 'Mark Read',
                customerPhone: '0551000005',
                readAt: null
            }
        })

        const first = await request(app)
            .post(`/api/admin/orders/${order.id}/mark-read`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminA1Token}`)

        expect(first.status).toBe(200)
        expect(first.body.success).toBe(true)

        const afterFirst = await prisma.order.findFirst({
            where: { tenantId: tenantAId, id: order.id },
            select: { readAt: true }
        })
        expect(afterFirst?.readAt).toBeInstanceOf(Date)

        const second = await request(app)
            .post(`/api/admin/orders/${order.id}/mark-read`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminA1Token}`)

        expect(second.status).toBe(200)
        expect(second.body.success).toBe(true)

        const afterSecond = await prisma.order.findFirst({
            where: { tenantId: tenantAId, id: order.id },
            select: { readAt: true }
        })
        expect(afterSecond?.readAt?.toISOString()).toBe(afterFirst?.readAt?.toISOString())

        const crossTenant = await request(app)
            .post(`/api/admin/orders/${order.id}/mark-read`)
            .set('X-Forwarded-Host', hostB)
            .set('Authorization', `Bearer ${adminBToken}`)

        expect(crossTenant.status).toBe(404)
    })

    it('shares unread state across tenant admins', async () => {
        const order = await prisma.order.create({
            data: {
                tenantId: tenantAId,
                status: 'PENDING',
                totalAmount: 100,
                customerName: 'Shared Team',
                customerPhone: '0551000006',
                readAt: null
            }
        })

        const before = await request(app)
            .get('/api/admin/orders/unread-count')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminA1Token}`)

        expect(before.status).toBe(200)
        expect(before.body.unreadCount).toBeGreaterThanOrEqual(1)

        const markRead = await request(app)
            .post(`/api/admin/orders/${order.id}/mark-read`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminA2Token}`)

        expect(markRead.status).toBe(200)

        const after = await request(app)
            .get('/api/admin/orders/unread-count')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminA1Token}`)

        expect(after.status).toBe(200)
        expect(after.body.unreadCount).toBe(before.body.unreadCount - 1)
    })
})
