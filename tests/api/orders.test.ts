import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Public checkout order flow', () => {
    const slug = `checkout-${Date.now()}`
    const hostHeader = `${slug}.localhost:3000`
    let tenantId: string
    let adminUserId: string
    let adminToken: string
    let productId: string
    let variantId: string
    let variantStockBefore = 0
    let simpleProductId: string
    let simpleVariantId: string | null = null

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({
            data: { name: 'Checkout Tenant', slug }
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
        adminUserId = admin.id
        adminToken = signAccessToken({ userId: admin.id, email: admin.email, role: admin.role, tenantId: admin.tenantId })

        await prisma.storeSettings.create({
            data: { tenantId, cartEnabled: true, codEnabled: true }
        })

        const product = await prisma.product.create({
            data: {
                tenantId,
                title: 'COD Product',
                slug: `cod-${Date.now()}`,
                price: 150,
                stock: 10,
                isActive: true
            }
        })
        productId = product.id

        const simple = await prisma.product.create({
            data: {
                tenantId,
                title: 'Simple Product',
                slug: `simple-${Date.now()}`,
                price: 99,
                stock: 4,
                isActive: true
            }
        })
        simpleProductId = simple.id

        const variant = await prisma.productVariant.create({
            data: {
                tenantId,
                productId,
                price: 175,
                stock: 5
            }
        })
        variantId = variant.id
        variantStockBefore = variant.stock
    })

    afterAll(async () => {
        await prisma.orderItem.deleteMany({ where: { order: { tenantId } } })
        await prisma.order.deleteMany({ where: { tenantId } })
        await prisma.productVariant.deleteMany({ where: { tenantId } })
        await prisma.product.deleteMany({ where: { tenantId } })
        await prisma.storeSettings.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    it('creates a PENDING order and does not change inventory', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', hostHeader)
            .send({
                customerName: 'Quick Buyer',
                customerPhone: '0550123456',
                shippingWilayaCode: '16',
                shippingCommuneCode: 'Algiers',
                items: [
                    {
                        productId,
                        variantId,
                        quantity: 2
                    }
                ]
            })

        expect(res.status).toBe(201)
        expect(res.body.orderId).toBeDefined()

        const saved = await prisma.order.findUnique({
            where: { id: res.body.orderId },
            include: { items: true }
        })

        expect(saved?.tenantId).toBe(tenantId)
        expect(saved?.items[0].variantId).toBe(variantId)
        expect(saved?.items[0].quantity).toBe(2)

        expect(saved?.customerId).toBeNull()

        const variantAfter = await prisma.productVariant.findUnique({ where: { id: variantId } })
        expect(variantAfter?.stock).toBe(variantStockBefore)
        expect(variantAfter?.reserved).toBe(0)

        const move = await prisma.inventoryMovement.findFirst({
            where: { tenantId, variantId, orderId: res.body.orderId },
            orderBy: { createdAt: 'desc' }
        })
        expect(move).toBeNull()

        // Cleanup: cancel should be a no-op for inventory.
        const cancel = await request(app)
            .patch(`/api/admin/orders/${res.body.orderId}`)
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'CANCELLED' })
        expect(cancel.status).toBe(200)

        const afterCancel = await prisma.productVariant.findUnique({ where: { id: variantId } })
        expect(afterCancel?.stock).toBe(variantStockBefore)
        expect(afterCancel?.reserved).toBe(0)
    })

    it('reserves on CONFIRMED, decrements on SHIPPED, and restocks on RETURNED', async () => {
        const created = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', hostHeader)
            .send({
                customerName: 'Confirm Buyer',
                customerPhone: '0550120000',
                items: [{ productId, variantId, quantity: 2 }]
            })

        expect(created.status).toBe(201)
        const orderId = created.body.orderId as string

        const confirm = await request(app)
            .patch(`/api/admin/orders/${orderId}`)
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'CONFIRMED' })

        expect(confirm.status).toBe(200)

        const afterConfirm = await prisma.productVariant.findUnique({ where: { id: variantId } })
        expect(afterConfirm?.stock).toBe(variantStockBefore)
        expect(afterConfirm?.reserved).toBe(2)

        const confirmMove = await prisma.inventoryMovement.findFirst({
            where: { tenantId, variantId, orderId, type: 'RESERVED_ADJUSTMENT' },
            orderBy: { createdAt: 'desc' }
        })
        expect(confirmMove?.delta).toBe(0)
        expect(confirmMove?.reservedDelta).toBe(2)

        const ship = await request(app)
            .patch(`/api/admin/orders/${orderId}`)
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'SHIPPED' })

        expect(ship.status).toBe(200)

        const afterShip = await prisma.productVariant.findUnique({ where: { id: variantId } })
        expect(afterShip?.stock).toBe(variantStockBefore - 2)
        expect(afterShip?.reserved).toBe(0)

        const shipMove = await prisma.inventoryMovement.findFirst({
            where: { tenantId, variantId, orderId, type: 'ORDER_DECREMENT' },
            orderBy: { createdAt: 'desc' }
        })
        expect(shipMove?.delta).toBe(-2)
        expect(shipMove?.reservedDelta).toBe(-2)

        const returned = await request(app)
            .patch(`/api/admin/orders/${orderId}`)
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'RETURNED' })

        expect(returned.status).toBe(200)

        const afterReturn = await prisma.productVariant.findUnique({ where: { id: variantId } })
        expect(afterReturn?.stock).toBe(variantStockBefore)
        expect(afterReturn?.reserved).toBe(0)

        const returnMove = await prisma.inventoryMovement.findFirst({
            where: { tenantId, variantId, orderId, reason: 'order_return' },
            orderBy: { createdAt: 'desc' }
        })
        expect(returnMove?.delta).toBe(2)
    })

    it('rejects checkout when phone is missing', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', hostHeader)
            .send({
                customerName: 'No Phone',
                items: [
                    {
                        productId,
                        quantity: 1
                    }
                ]
            })

        expect(res.status).toBe(400)
        expect(res.body.statusMessage).toMatch(/phone/i)
    })

    it('supports products without variants via an auto-created default variant', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', hostHeader)
            .send({
                customerName: 'Simple Buyer',
                customerPhone: '0550123000',
                items: [{ productId: simpleProductId, quantity: 2 }]
            })

        expect(res.status).toBe(201)
        expect(res.body.orderId).toBeDefined()

        const saved = await prisma.order.findUnique({
            where: { id: res.body.orderId },
            include: { items: true }
        })

        expect(saved?.items[0].productId).toBe(simpleProductId)
        expect(saved?.items[0].variantId).toBeTruthy()

        simpleVariantId = saved?.items[0].variantId ?? null
        expect(simpleVariantId).toBeTruthy()

        const variantAfter = await prisma.productVariant.findFirst({
            where: { tenantId, productId: simpleProductId, optionValues: { none: {} } }
        })
        expect(variantAfter?.id).toBe(simpleVariantId)
        expect(variantAfter?.stock).toBe(4)
        expect(variantAfter?.reserved).toBe(0)

        const movement = await prisma.inventoryMovement.findFirst({
            where: { tenantId, variantId: simpleVariantId as string, orderId: res.body.orderId }
        })
        expect(movement).toBeNull()

        const cancel = await request(app)
            .patch(`/api/admin/orders/${res.body.orderId}`)
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'CANCELLED' })
        expect(cancel.status).toBe(200)

        const afterCancel = await prisma.productVariant.findFirst({
            where: { tenantId, productId: simpleProductId, optionValues: { none: {} } }
        })
        expect(afterCancel?.reserved).toBe(0)
    })
})
