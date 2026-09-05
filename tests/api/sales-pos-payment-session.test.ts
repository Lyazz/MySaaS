import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('POS sale payment requires an open cash session', () => {
    const slug = `pos-pay-${Date.now()}`
    const hostHeader = `${slug}.localhost:3000`

    let tenantId: string
    let adminId: string
    let adminToken: string

    let productId: string
    let variantId: string
    let variantStockBefore = 0

    let cashboxId: string

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'POS Pay Tenant', slug } })
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

        const product = await prisma.product.create({
            data: {
                tenantId,
                title: 'POS Pay Product',
                slug: `pos-pay-product-${Date.now()}`,
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
                sku: `SKU-PAY-${Date.now()}`
            }
        })
        variantId = variant.id
        variantStockBefore = variant.stock

        const cashbox = await prisma.cashbox.create({
            data: { tenantId, name: `Pay Cashbox ${Date.now()}`, isActive: true }
        })
        cashboxId = cashbox.id
    })

    afterAll(async () => {
        await prisma.customerPayment.deleteMany({ where: { tenantId } })
        await prisma.supplierPayment.deleteMany({ where: { tenantId } })
        await prisma.cashTransaction.deleteMany({ where: { tenantId } })
        await prisma.cashSession.deleteMany({ where: { tenantId } })
        await prisma.cashbox.deleteMany({ where: { tenantId } })

        await prisma.saleItem.deleteMany({ where: { sale: { tenantId } } })
        await prisma.sale.deleteMany({ where: { tenantId } })
        await prisma.inventoryMovement.deleteMany({ where: { tenantId } })
        await prisma.orderItem.deleteMany({ where: { tenantId } })
        await prisma.order.deleteMany({ where: { tenantId } })
        await prisma.productVariant.deleteMany({ where: { tenantId } })
        await prisma.product.deleteMany({ where: { tenantId } })

        await prisma.storeSettings.deleteMany({ where: { tenantId } })
        await prisma.tenantSubscription.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    it('rolls back the sale when payment cannot be recorded (no open cash session)', async () => {
        const res = await request(app)
            .post('/api/admin/sales')
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                customerId: null,
                items: [{ productId, variantId, quantity: 1 }],
                cashboxId,
                payment: { method: 'CASH' }
            })

        expect(res.status).toBe(409)
        expect(res.body.code).toBe('CASH_SESSION_REQUIRED')
        expect(res.body.meta?.cashboxId).toBe(cashboxId)

        const saleCount = await prisma.sale.count({ where: { tenantId } })
        expect(saleCount).toBe(0)

        const variantAfter = await prisma.productVariant.findUnique({ where: { tenantId_id: { tenantId, id: variantId } } })
        expect(variantAfter?.stock).toBe(variantStockBefore)

        const move = await prisma.inventoryMovement.findFirst({
            where: { tenantId, variantId, createdByUserId: adminId },
            orderBy: { createdAt: 'desc' }
        })
        expect(move).toBeNull()
    })

    it('blocks delivered-order payment when the selected cashbox has no open session', async () => {
        const order = await prisma.order.create({
            data: {
                tenantId,
                status: 'SHIPPED',
                totalAmount: 120,
                customerName: 'Delivery Buyer',
                customerPhone: '0550123000',
                items: {
                    create: [{ productId, variantId, quantity: 1, price: 120 }]
                }
            }
        })

        const res = await request(app)
            .patch(`/api/admin/orders/${order.id}`)
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                status: 'DELIVERED',
                cashboxId,
                method: 'CASH'
            })

        expect(res.status).toBe(409)
        expect(res.body.code).toBe('CASH_SESSION_REQUIRED')
        expect(res.body.meta?.cashboxId).toBe(cashboxId)

        const sale = await prisma.sale.findFirst({ where: { tenantId, orderId: order.id } })
        expect(sale).toBeNull()

        const updatedOrder = await prisma.order.findUnique({ where: { tenantId_id: { tenantId, id: order.id } } })
        expect(updatedOrder?.status).toBe('SHIPPED')
    })
})
