import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Admin order previous orders history', () => {
    const slugA = `orders-history-a-${Date.now()}`
    const slugB = `orders-history-b-${Date.now()}`
    const hostA = `${slugA}.localhost:3000`

    let tenantAId: string
    let tenantBId: string
    let adminAToken: string
    let productAId: string
    let productBId: string
    let customerAId: string
    let currentCustomerOrderId: string
    let previousCustomerOrderId: string
    let currentPhoneOrderId: string
    let previousPhoneOrderId: string
    let invalidPhoneOrderId: string

    beforeAll(async () => {
        const tenantA = await prisma.tenant.create({ data: { name: 'Orders History A', slug: slugA } })
        tenantAId = tenantA.id
        const tenantB = await prisma.tenant.create({ data: { name: 'Orders History B', slug: slugB } })
        tenantBId = tenantB.id

        const adminA = await prisma.user.create({
            data: { tenantId: tenantAId, email: `admin-${slugA}@example.com`, role: 'admin', passwordHash: 'x' }
        })
        adminAToken = signAccessToken({ userId: adminA.id, email: adminA.email, role: adminA.role, tenantId: adminA.tenantId })

        const productA = await prisma.product.create({
            data: {
                tenantId: tenantAId,
                title: 'History Product A',
                slug: `history-product-a-${Date.now()}`,
                price: 100,
                stock: 10,
                isActive: true
            }
        })
        productAId = productA.id

        const productB = await prisma.product.create({
            data: {
                tenantId: tenantBId,
                title: 'History Product B',
                slug: `history-product-b-${Date.now()}`,
                price: 100,
                stock: 10,
                isActive: true
            }
        })
        productBId = productB.id

        const customerA = await prisma.customer.create({
            data: {
                tenantId: tenantAId,
                name: 'Linked History Customer',
                phone: '0550000111',
                phoneRaw: '0550000111',
                phoneNormalized: '213550000111'
            }
        })
        customerAId = customerA.id

        const previousCustomerOrder = await prisma.order.create({
            data: {
                tenantId: tenantAId,
                publicId: 'HIST-CUST-1',
                status: 'CANCELLED',
                callStatus: 'no_answer',
                totalAmount: 100,
                totalWithShippingAmount: 150,
                shippingAmount: 50,
                customerId: customerAId,
                customerName: 'Linked History Customer',
                customerPhone: '0550000111',
                customerPhoneNormalized: '213550000111',
                createdAt: new Date('2026-01-01T10:00:00.000Z')
            }
        })
        previousCustomerOrderId = previousCustomerOrder.id
        await prisma.orderItem.create({
            data: { tenantId: tenantAId, orderId: previousCustomerOrder.id, productId: productAId, quantity: 1, price: 100, lineTotal: 100 }
        })

        const currentCustomerOrder = await prisma.order.create({
            data: {
                tenantId: tenantAId,
                publicId: 'HIST-CUST-2',
                status: 'PENDING',
                totalAmount: 200,
                customerId: customerAId,
                customerName: 'Linked History Customer',
                customerPhone: '0550000111',
                customerPhoneNormalized: '213550000111',
                createdAt: new Date('2026-01-02T10:00:00.000Z')
            }
        })
        currentCustomerOrderId = currentCustomerOrder.id
        await prisma.orderItem.create({
            data: { tenantId: tenantAId, orderId: currentCustomerOrder.id, productId: productAId, quantity: 2, price: 100, lineTotal: 200 }
        })

        const previousPhoneOrder = await prisma.order.create({
            data: {
                tenantId: tenantAId,
                publicId: 'HIST-PHONE-1',
                status: 'RETURNED',
                callStatus: 'called',
                totalAmount: 300,
                customerName: 'Phone History Buyer',
                customerPhone: '0550000222',
                customerPhoneNormalized: '213550000222',
                createdAt: new Date('2026-01-03T10:00:00.000Z')
            }
        })
        previousPhoneOrderId = previousPhoneOrder.id
        await prisma.orderItem.create({
            data: { tenantId: tenantAId, orderId: previousPhoneOrder.id, productId: productAId, quantity: 3, price: 100, lineTotal: 300 }
        })

        const currentPhoneOrder = await prisma.order.create({
            data: {
                tenantId: tenantAId,
                publicId: 'HIST-PHONE-2',
                status: 'PENDING',
                totalAmount: 400,
                customerName: 'Phone History Buyer',
                customerPhone: '+213 550 000 222',
                customerPhoneNormalized: null,
                createdAt: new Date('2026-01-04T10:00:00.000Z')
            }
        })
        currentPhoneOrderId = currentPhoneOrder.id
        await prisma.orderItem.create({
            data: { tenantId: tenantAId, orderId: currentPhoneOrder.id, productId: productAId, quantity: 4, price: 100, lineTotal: 400 }
        })

        await prisma.order.create({
            data: {
                tenantId: tenantBId,
                publicId: 'HIST-OTHER-TENANT',
                status: 'DELIVERED',
                totalAmount: 999,
                customerName: 'Other Tenant Buyer',
                customerPhone: '0550000222',
                customerPhoneNormalized: '213550000222',
                items: {
                    create: [{ productId: productBId, quantity: 1, price: 999, lineTotal: 999 }]
                }
            }
        })

        const invalidPhoneOrder = await prisma.order.create({
            data: {
                tenantId: tenantAId,
                publicId: 'HIST-BAD-PHONE',
                status: 'PENDING',
                totalAmount: 50,
                customerName: 'Invalid Phone Buyer',
                customerPhone: 'not-a-phone',
                customerPhoneNormalized: null
            }
        })
        invalidPhoneOrderId = invalidPhoneOrder.id
        await prisma.orderItem.create({
            data: { tenantId: tenantAId, orderId: invalidPhoneOrder.id, productId: productAId, quantity: 1, price: 50, lineTotal: 50 }
        })
    })

    afterAll(async () => {
        const tenantIds = [tenantAId, tenantBId].filter((id): id is string => typeof id === 'string' && id.length > 0)
        if (tenantIds.length === 0) return

        await prisma.orderItem.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.order.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.product.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.customer.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.user.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } })
    })

    it('returns previous orders for the linked customer and excludes the current order', async () => {
        const res = await request(app)
            .get(`/api/admin/orders/${currentCustomerOrderId}`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminAToken}`)

        expect(res.status).toBe(200)
        expect(res.body.previousOrdersMatch).toMatchObject({ type: 'customer', customerId: customerAId })
        expect(res.body.previousOrders.map((order: any) => order.id)).toEqual([previousCustomerOrderId])
        expect(res.body.previousOrders[0].status).toBe('CANCELLED')
        expect(res.body.previousOrders[0].items[0].product.title).toBe('History Product A')
    })

    it('falls back to normalized phone history when the order has no customer', async () => {
        const res = await request(app)
            .get(`/api/admin/orders/${currentPhoneOrderId}`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminAToken}`)

        expect(res.status).toBe(200)
        expect(res.body.previousOrdersMatch).toMatchObject({ type: 'phone', phoneNormalized: '213550000222' })
        expect(res.body.previousOrders.map((order: any) => order.id)).toEqual([previousPhoneOrderId])
        expect(res.body.previousOrders.every((order: any) => order.publicId !== 'HIST-OTHER-TENANT')).toBe(true)
    })

    it('does not include cross-tenant orders with the same normalized phone', async () => {
        const res = await request(app)
            .get(`/api/admin/orders/${currentPhoneOrderId}`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminAToken}`)

        expect(res.status).toBe(200)
        expect(res.body.previousOrders).toHaveLength(1)
        expect(res.body.previousOrders[0].tenantId).toBeUndefined()
        expect(res.body.previousOrders[0].publicId).toBe('HIST-PHONE-1')
    })

    it('returns empty history without error when the phone cannot be normalized', async () => {
        const res = await request(app)
            .get(`/api/admin/orders/${invalidPhoneOrderId}`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminAToken}`)

        expect(res.status).toBe(200)
        expect(res.body.previousOrdersMatch).toMatchObject({ type: 'none', phoneNormalized: null })
        expect(res.body.previousOrders).toEqual([])
    })
})
