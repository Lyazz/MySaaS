import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Purchases delete + status lifecycle policy', () => {
    const slug = `po-policy-${Date.now()}`
    const host = `${slug}.localhost:3000`

    let tenantId: string
    let userId: string
    let token: string
    let supplierId: string
    let variantId: string
    let cashboxId: string
    let cashSessionId: string

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({
            data: { name: 'Purchases Policy Tenant', slug }
        })
        tenantId = tenant.id

        const user = await prisma.user.create({
            data: { tenantId, email: `admin-${slug}@example.com`, role: 'admin', passwordHash: 'x' }
        })
        userId = user.id
        token = signAccessToken({ userId: user.id, email: user.email, role: user.role, tenantId: user.tenantId })

        const supplier = await prisma.supplier.create({
            data: { tenantId, name: `Supplier ${Date.now()}` }
        })
        supplierId = supplier.id

        const product = await prisma.product.create({
            data: {
                tenantId,
                title: 'Purchase Variant Product',
                slug: `purchase-var-${Date.now()}`,
                price: 100,
                stock: 0,
                isActive: true
            }
        })
        const variant = await prisma.productVariant.create({
            data: {
                tenantId,
                productId: product.id,
                sku: `PUR-${Date.now()}`,
                price: 100,
                cost: 0,
                stock: 0,
                reserved: 0,
                safetyStock: 0,
                trackInventory: true,
                isActive: true
            }
        })
        variantId = variant.id

        const cashbox = await prisma.cashbox.create({
            data: { tenantId, name: `Main ${Date.now()}`, isActive: true }
        })
        cashboxId = cashbox.id

        const cashSession = await prisma.cashSession.create({
            data: { tenantId, cashboxId, status: 'OPEN', openingFloat: 0, openedByUserId: userId }
        })
        cashSessionId = cashSession.id
    })

    afterAll(async () => {
        await prisma.supplierPayment.deleteMany({ where: { tenantId } })
        await prisma.cashTransaction.deleteMany({ where: { tenantId } })
        await prisma.cashSession.deleteMany({ where: { tenantId } })
        await prisma.cashbox.deleteMany({ where: { tenantId } })
        await prisma.purchaseOrderItem.deleteMany({ where: { tenantId } })
        await prisma.purchaseOrder.deleteMany({ where: { tenantId } })
        await prisma.inventoryMovement.deleteMany({ where: { tenantId } })
        await prisma.productVariant.deleteMany({ where: { tenantId } })
        await prisma.product.deleteMany({ where: { tenantId } })
        await prisma.supplier.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    it('deletes pre-posting purchase order with no received/payment records', async () => {
        const po = await prisma.purchaseOrder.create({
            data: {
                tenantId,
                supplierId,
                status: 'DRAFT',
                paymentStatus: 'UNPAID',
                currency: 'DZD'
            }
        })
        await prisma.purchaseOrderItem.create({
            data: {
                tenantId,
                purchaseOrderId: po.id,
                variantId,
                quantityOrdered: 2,
                quantityReceived: 0,
                unitCost: 10
            }
        })

        const res = await request(app)
            .delete(`/api/admin/purchases/${po.id}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(204)
        const missing = await prisma.purchaseOrder.findFirst({ where: { tenantId, id: po.id } })
        expect(missing).toBeNull()
    })

    it('blocks delete when purchase has received quantity', async () => {
        const po = await prisma.purchaseOrder.create({
            data: {
                tenantId,
                supplierId,
                status: 'ORDERED',
                paymentStatus: 'UNPAID',
                currency: 'DZD'
            }
        })
        await prisma.purchaseOrderItem.create({
            data: {
                tenantId,
                purchaseOrderId: po.id,
                variantId,
                quantityOrdered: 3,
                quantityReceived: 1,
                unitCost: 20
            }
        })

        const res = await request(app)
            .delete(`/api/admin/purchases/${po.id}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(409)
        expect(res.body?.code).toBe('PURCHASE_DELETE_HAS_RECEIVED_ITEMS')
    })

    it('blocks delete when purchase has linked ledger entries', async () => {
        const po = await prisma.purchaseOrder.create({
            data: {
                tenantId,
                supplierId,
                status: 'ORDERED',
                paymentStatus: 'PARTIALLY_PAID',
                currency: 'DZD'
            }
        })
        await prisma.purchaseOrderItem.create({
            data: {
                tenantId,
                purchaseOrderId: po.id,
                variantId,
                quantityOrdered: 1,
                quantityReceived: 0,
                unitCost: 10
            }
        })

        const tx = await prisma.cashTransaction.create({
            data: {
                tenantId,
                cashboxId,
                sessionId: cashSessionId,
                direction: 'OUT',
                type: 'SUPPLIER_PAYMENT',
                amount: 10,
                method: 'CASH',
                currency: 'DZD',
                supplierId,
                purchaseOrderId: po.id
            }
        })
        await prisma.supplierPayment.create({
            data: {
                tenantId,
                supplierId,
                purchaseOrderId: po.id,
                cashTransactionId: tx.id,
                amount: 10,
                currency: 'DZD',
                method: 'CASH',
                createdByUserId: userId
            }
        })

        const res = await request(app)
            .delete(`/api/admin/purchases/${po.id}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(409)
        expect(res.body?.code).toBe('PURCHASE_DELETE_HAS_LEDGER_ENTRIES')
    })

    it('supports status cancel for non-received purchase', async () => {
        const po = await prisma.purchaseOrder.create({
            data: {
                tenantId,
                supplierId,
                status: 'DRAFT',
                paymentStatus: 'UNPAID',
                currency: 'DZD'
            }
        })
        await prisma.purchaseOrderItem.create({
            data: {
                tenantId,
                purchaseOrderId: po.id,
                variantId,
                quantityOrdered: 2,
                quantityReceived: 0,
                unitCost: 10
            }
        })

        const res = await request(app)
            .patch(`/api/admin/purchases/${po.id}/status`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'CANCELLED' })

        expect(res.status).toBe(200)
        expect(res.body?.status).toBe('CANCELLED')
    })

    it('rejects cancel when any item was already received', async () => {
        const po = await prisma.purchaseOrder.create({
            data: {
                tenantId,
                supplierId,
                status: 'ORDERED',
                paymentStatus: 'UNPAID',
                currency: 'DZD'
            }
        })
        await prisma.purchaseOrderItem.create({
            data: {
                tenantId,
                purchaseOrderId: po.id,
                variantId,
                quantityOrdered: 4,
                quantityReceived: 1,
                unitCost: 10
            }
        })

        const res = await request(app)
            .patch(`/api/admin/purchases/${po.id}/status`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'CANCELLED' })

        expect(res.status).toBe(409)
        expect(res.body?.code).toBe('PURCHASE_CANCEL_HAS_RECEIVED_ITEMS')
    })
})
