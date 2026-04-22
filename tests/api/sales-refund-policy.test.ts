import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Sales refund lifecycle policy', () => {
    const slug = `sales-refund-${Date.now()}`
    const host = `${slug}.localhost:3000`

    let tenantId: string
    let token: string
    let variantId: string
    let productId: string
    let cashboxId: string

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({
            data: { name: 'Sales Refund Tenant', slug }
        })
        tenantId = tenant.id

        const admin = await prisma.user.create({
            data: { tenantId, email: `admin-${slug}@example.com`, role: 'admin', passwordHash: 'x' }
        })
        token = signAccessToken({ userId: admin.id, email: admin.email, role: admin.role, tenantId: admin.tenantId })

        const product = await prisma.product.create({
            data: {
                tenantId,
                title: 'Refund Product',
                slug: `refund-product-${Date.now()}`,
                price: 100,
                stock: 3,
                isActive: true
            }
        })
        productId = product.id

        const variant = await prisma.productVariant.create({
            data: {
                tenantId,
                productId: product.id,
                sku: `REF-${Date.now()}`,
                price: 100,
                stock: 3,
                reserved: 0,
                safetyStock: 0,
                trackInventory: true,
                isActive: true
            }
        })
        variantId = variant.id

        const cashbox = await prisma.cashbox.create({
            data: {
                tenantId,
                name: `Refund Cashbox ${Date.now()}`,
                isActive: true
            }
        })
        cashboxId = cashbox.id

        await prisma.cashSession.create({
            data: {
                tenantId,
                cashboxId,
                status: 'OPEN',
                openingFloat: 500,
                openedByUserId: admin.id
            }
        })
    })

    afterAll(async () => {
        await prisma.customerPayment.deleteMany({ where: { tenantId } })
        await prisma.supplierPayment.deleteMany({ where: { tenantId } })
        await prisma.cashTransaction.deleteMany({ where: { tenantId } })
        await prisma.cashSession.deleteMany({ where: { tenantId } })
        await prisma.cashbox.deleteMany({ where: { tenantId } })
        await prisma.inventoryMovement.deleteMany({ where: { tenantId } })
        await prisma.saleItem.deleteMany({ where: { tenantId } })
        await prisma.sale.deleteMany({ where: { tenantId } })
        await prisma.orderItem.deleteMany({ where: { tenantId } })
        await prisma.order.deleteMany({ where: { tenantId } })
        await prisma.productVariant.deleteMany({ where: { tenantId } })
        await prisma.product.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    it('refunds POS sale by restocking inventory and keeping audit trail', async () => {
        const sale = await prisma.sale.create({
            data: {
                tenantId,
                source: 'POS',
                status: 'COMPLETED',
                totalAmount: 200,
                items: {
                    create: [
                        {
                            productId,
                            variantId,
                            quantity: 2,
                            price: 100
                        }
                    ]
                }
            }
        })

        const res = await request(app)
            .patch(`/api/admin/sales/${sale.id}/status`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)
            .send({
                status: 'REFUNDED',
                refund: {
                    cashboxId,
                    method: 'CASH',
                    note: 'Refund in test'
                }
            })

        expect(res.status).toBe(200)
        expect(res.body?.status).toBe('REFUNDED')

        const variant = await prisma.productVariant.findFirst({
            where: { tenantId, id: variantId },
            select: { stock: true }
        })
        expect(variant?.stock).toBe(5)

        const product = await prisma.product.findFirst({
            where: { tenantId, id: productId },
            select: { stock: true }
        })
        expect(product?.stock).toBe(5)

        const movement = await prisma.inventoryMovement.findFirst({
            where: { tenantId, saleId: sale.id, reason: 'sale_refund' },
            orderBy: { createdAt: 'desc' }
        })
        expect(movement?.delta).toBe(2)

        const cashTx = await prisma.cashTransaction.findFirst({
            where: { tenantId, saleId: sale.id, type: 'SALE_REFUND' },
            orderBy: { createdAt: 'desc' }
        })
        expect(cashTx).not.toBeNull()
        expect(cashTx?.cashboxId).toBe(cashboxId)
        expect(cashTx?.direction).toBe('OUT')
        expect(String(cashTx?.amount)).toBe('200')
    })

    it('rejects refund for order-linked sale', async () => {
        const order = await prisma.order.create({
            data: {
                tenantId,
                status: 'DELIVERED',
                totalAmount: 100,
                customerName: 'Order Buyer',
                customerPhone: '0550001234'
            }
        })
        const sale = await prisma.sale.create({
            data: {
                tenantId,
                source: 'ORDER',
                orderId: order.id,
                status: 'COMPLETED',
                totalAmount: 100
            }
        })

        const res = await request(app)
            .patch(`/api/admin/sales/${sale.id}/status`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'REFUNDED' })

        expect(res.status).toBe(409)
        expect(res.body?.code).toBe('SALE_REFUND_ORDER_LINKED_NOT_ALLOWED')
    })

    it('requires refund cashbox for POS refunds', async () => {
        const sale = await prisma.sale.create({
            data: {
                tenantId,
                source: 'POS',
                status: 'COMPLETED',
                totalAmount: 100
            }
        })

        const res = await request(app)
            .patch(`/api/admin/sales/${sale.id}/status`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'REFUNDED' })

        expect(res.status).toBe(400)
        expect(res.body?.code).toBe('SALE_REFUND_CASHBOX_REQUIRED')
    })

    it('returns cash session conflict code when selected cashbox has no open session', async () => {
        const closedCashbox = await prisma.cashbox.create({
            data: {
                tenantId,
                name: `Closed Refund Cashbox ${Date.now()}`,
                isActive: true
            }
        })

        const sale = await prisma.sale.create({
            data: {
                tenantId,
                source: 'POS',
                status: 'COMPLETED',
                totalAmount: 100
            }
        })

        const res = await request(app)
            .patch(`/api/admin/sales/${sale.id}/status`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)
            .send({
                status: 'REFUNDED',
                refund: {
                    cashboxId: closedCashbox.id,
                    method: 'CASH'
                }
            })

        expect(res.status).toBe(409)
        expect(res.body?.code).toBe('CASH_SESSION_REQUIRED')
    })
})
