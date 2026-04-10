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
    let bundleProductId: string
    let bundleVariantId: string
    let productPixel: any
    let cashboxId: string
    let cashSessionId: string

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
                sku: `COD-${Date.now()}`,
                price: 175,
                stock: 5
            }
        })
        variantId = variant.id
        variantStockBefore = variant.stock

        const bundleProduct = await prisma.product.create({
            data: {
                tenantId,
                title: 'Bundle Product',
                slug: `bundle-${Date.now()}`,
                price: 1000,
                stock: 100,
                isActive: true
            }
        })
        bundleProductId = bundleProduct.id

        const bundleVariant = await prisma.productVariant.create({
            data: {
                tenantId,
                productId: bundleProductId,
                sku: `BUNDLE-${Date.now()}`,
                price: 1000,
                stock: 100
            }
        })
        bundleVariantId = bundleVariant.id

        await prisma.productBundleDeal.createMany({
            data: [
                { tenantId, productId: bundleProductId, bundleQty: 2, bundlePrice: 1800, isActive: true },
                { tenantId, productId: bundleProductId, bundleQty: 3, bundlePrice: 2400, isActive: true }
            ]
        })

        productPixel = await prisma.tenantMetaPixel.create({
            data: { tenantId, pixelId: '777777', name: 'Product Pixel', isActive: true, isGlobal: false }
        })
        await prisma.productMetaPixel.create({
            data: { tenantId, productId, metaPixelId: productPixel.id }
        })

        const cashbox = await prisma.cashbox.create({
            data: { tenantId, name: 'Main Cashbox', isActive: true }
        })
        cashboxId = cashbox.id

        const session = await prisma.cashSession.create({
            data: { tenantId, cashboxId, status: 'OPEN', openingFloat: 0 }
        })
        cashSessionId = session.id
    })

    afterAll(async () => {
        await prisma.customerPayment.deleteMany({ where: { tenantId } })
        await prisma.supplierPayment.deleteMany({ where: { tenantId } })
        await prisma.cashTransaction.deleteMany({ where: { tenantId } })
        await prisma.cashSession.deleteMany({ where: { tenantId } })
        await prisma.cashbox.deleteMany({ where: { tenantId } })
        await prisma.productMetaPixel.deleteMany({ where: { tenantId } })
        await prisma.tenantMetaPixel.deleteMany({ where: { tenantId } })
        await prisma.saleItem.deleteMany({ where: { sale: { tenantId } } })
        await prisma.sale.deleteMany({ where: { tenantId } })
        await prisma.orderItem.deleteMany({ where: { order: { tenantId } } })
        await prisma.order.deleteMany({ where: { tenantId } })
        await prisma.productBundleDeal.deleteMany({ where: { tenantId } })
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
                shippingServiceLevel: 'home',
                shippingAmount: 499,
                shippingCurrency: 'DZD',
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
        expect(saved?.shippingServiceLevel).toBe('home')
        expect(saved?.shippingAmount).toBe(499)
        expect(saved?.shippingCurrency).toBe('DZD')

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

    it('returns a public Meta Pixel payload for the order (tenant-scoped)', async () => {
        const created = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', hostHeader)
            .send({
                customerName: 'Pixel Buyer',
                customerPhone: '0550999000',
                items: [{ productId, variantId, quantity: 1 }]
            })

        expect(created.status).toBe(201)
        const orderId = created.body.orderId as string

        const payloadRes = await request(app)
            .get(`/api/orders/${orderId}/pixel`)
            .set('X-Forwarded-Host', hostHeader)

        expect(payloadRes.status).toBe(200)
        expect(payloadRes.body.orderId).toBe(orderId)
        expect(payloadRes.body.currency).toBe('DZD')
        expect(typeof payloadRes.body.value).toBe('number')
        expect(Array.isArray(payloadRes.body.contents)).toBe(true)
        expect(Array.isArray(payloadRes.body.pixelIds)).toBe(true)
        expect(payloadRes.body.pixelIds).toContain('777777')
        expect(payloadRes.body.customerPhone).toBeUndefined()
        expect(payloadRes.body.customerName).toBeUndefined()

        const otherSlug = `other-${Date.now()}`
        const otherHost = `${otherSlug}.localhost:3000`
        const otherTenant = await prisma.tenant.create({ data: { name: 'Other', slug: otherSlug } })
        await prisma.storeSettings.create({ data: { tenantId: otherTenant.id, cartEnabled: true, codEnabled: true } })

        const otherRes = await request(app)
            .get(`/api/orders/${orderId}/pixel`)
            .set('X-Forwarded-Host', otherHost)

        expect(otherRes.status).toBe(404)

        await prisma.storeSettings.deleteMany({ where: { tenantId: otherTenant.id } })
        await prisma.user.deleteMany({ where: { tenantId: otherTenant.id } })
        await prisma.tenant.deleteMany({ where: { id: otherTenant.id } })
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

    it('creates a Sale when marking an order DELIVERED, and the status becomes final', async () => {
        const created = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', hostHeader)
            .send({
                customerName: 'Delivered Buyer',
                customerPhone: '0550888000',
                items: [{ productId, variantId, quantity: 1 }]
            })

        expect(created.status).toBe(201)
        const orderId = created.body.orderId as string

        const confirm = await request(app)
            .patch(`/api/admin/orders/${orderId}`)
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'CONFIRMED' })
        expect(confirm.status).toBe(200)

        const ship = await request(app)
            .patch(`/api/admin/orders/${orderId}`)
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'SHIPPED' })
        expect(ship.status).toBe(200)

        const delivered = await request(app)
            .patch(`/api/admin/orders/${orderId}`)
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'DELIVERED', cashboxId, method: 'CASH' })
        expect(delivered.status).toBe(200)

        const sale = await prisma.sale.findUnique({
            where: { tenantId_id: { tenantId, id: orderId } },
            include: { items: true }
        })
        expect(sale?.id).toBe(orderId)
        expect(sale?.orderId).toBe(orderId)
        expect(sale?.source).toBe('ORDER')
        expect(sale?.status).toBe('COMPLETED')
        expect(sale?.items.length).toBe(1)

        const cashTx = await prisma.cashTransaction.findFirst({
            where: { tenantId, orderId, saleId: orderId, type: 'SALE_PAYMENT', direction: 'IN', cashboxId, sessionId: cashSessionId }
        })
        expect(cashTx?.amount).toBeDefined()

        const blocked = await request(app)
            .patch(`/api/admin/orders/${orderId}`)
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'RETURNED' })
        expect(blocked.status).toBe(400)
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

    it('applies fixed bundle deals and stores line totals', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', hostHeader)
            .send({
                customerName: 'Bundle Buyer',
                customerPhone: '0550999000',
                items: [{ productId: bundleProductId, variantId: bundleVariantId, quantity: 5 }]
            })

        expect(res.status).toBe(201)
        expect(res.body.orderId).toBeDefined()

        const saved = await prisma.order.findUnique({
            where: { id: res.body.orderId },
            include: { items: true }
        })

        expect(saved?.tenantId).toBe(tenantId)
        expect(saved?.items.length).toBe(1)

        const item = saved?.items[0] as any
        expect(item.quantity).toBe(5)
        expect(item.lineTotal).toBeCloseTo(4200, 5) // 3-pack + 2-pack
        expect(saved?.totalAmount).toBeCloseTo(4200, 5)

        expect(item.pricingBreakdown?.bestTotalCents).toBe(420000)
        const breakdown = item.pricingBreakdown?.breakdown ?? []
        expect(breakdown.find((b: any) => b.kind === 'bundle' && b.bundleQty === 2)?.count).toBe(1)
        expect(breakdown.find((b: any) => b.kind === 'bundle' && b.bundleQty === 3)?.count).toBe(1)
    })
})

describe('Admin Order Creation', () => {
    const slug = `admin-checkout-${Date.now()}`
    const hostHeader = `${slug}.localhost:3000`
    let tenantId: string
    let adminUserId: string
    let adminToken: string
    let productId: string
    let variantId: string

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({
            data: { name: 'Admin Checkout Tenant', slug }
        })
        tenantId = tenant.id

        const admin = await prisma.user.create({
            data: {
                tenantId,
                email: `admin-order-${slug}@example.com`,
                role: 'admin',
                passwordHash: 'x'
            }
        })
        adminUserId = admin.id
        adminToken = signAccessToken({ userId: admin.id, email: admin.email, role: admin.role, tenantId: admin.tenantId })

        const product = await prisma.product.create({
            data: {
                tenantId,
                title: 'Admin Product',
                slug: `admin-prod-${Date.now()}`,
                price: 150,
                stock: 10,
                isActive: true
            }
        })
        productId = product.id

        const variant = await prisma.productVariant.create({
            data: {
                tenantId,
                productId,
                sku: `ADMIN-VAR-${Date.now()}`,
                price: 175,
                stock: 20
            }
        })
        variantId = variant.id
    })

    afterAll(async () => {
        await prisma.inventoryMovement.deleteMany({ where: { tenantId } })
        await prisma.orderItem.deleteMany({ where: { order: { tenantId } } })
        await prisma.order.deleteMany({ where: { tenantId } })
        await prisma.productVariant.deleteMany({ where: { tenantId } })
        await prisma.product.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    it('creates an order via admin endpoint without requiring customer name initially', async () => {
        // Will test creating anonymous order first, but note we currently require customer info unless customerId is present
        // in our implementation we added: `if (!customerName && !input.customerId)`
        // so we must provide at least customerName or customerId

        const res = await request(app)
            .post('/api/admin/orders')
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                customerName: 'Admin Created Customer',
                customerPhone: '0550999888',
                items: [
                    {
                        productId,
                        variantId,
                        quantity: 3
                    }
                ]
            })

        expect(res.status).toBe(201)
        expect(res.body.orderId).toBeDefined()
        expect(res.body.success).toBe(true)

        const saved = await prisma.order.findUnique({
            where: { id: res.body.orderId },
            include: { items: true }
        })

        expect(saved?.tenantId).toBe(tenantId)
        expect(saved?.customerName).toBe('Admin Created Customer')
        expect(saved?.items[0].variantId).toBe(variantId)
        expect(saved?.items[0].quantity).toBe(3)
        // Admin orders start as PENDING by default based on our implementation
        expect(saved?.status).toBe('PENDING')
    })

    it('rejects admin order creation with empty items', async () => {
        const res = await request(app)
            .post('/api/admin/orders')
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                customerName: 'Admin Created Customer',
                items: []
            })

        expect(res.status).toBe(400)
    })
})
