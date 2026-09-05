import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Orders edit (unconfirmed only)', () => {
    const slugA = `orders-edit-a-${Date.now()}`
    const hostA = `${slugA}.localhost:3000`
    const slugB = `orders-edit-b-${Date.now()}`
    const hostB = `${slugB}.localhost:3000`

    let tenantAId: string
    let tenantBId: string
    let adminAToken: string
    let adminBToken: string
    let staffReadOnlyToken: string

    let product1Id: string
    let product2Id: string
    let promoProductId: string
    let inactivePromoProductId: string

    let pendingOrderId: string
    let confirmedOrderId: string

    beforeAll(async () => {
        const tenantA = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Tenant A', slug: slugA } })
        tenantAId = tenantA.id
        const tenantB = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Tenant B', slug: slugB } })
        tenantBId = tenantB.id

        const adminA = await prisma.user.create({
            data: { tenantId: tenantAId, email: `admin-a-${slugA}@example.com`, role: 'admin', passwordHash: 'x' }
        })
        adminAToken = signAccessToken({ userId: adminA.id, email: adminA.email, role: adminA.role, tenantId: adminA.tenantId })

        const adminB = await prisma.user.create({
            data: { tenantId: tenantBId, email: `admin-b-${slugB}@example.com`, role: 'admin', passwordHash: 'x' }
        })
        adminBToken = signAccessToken({ userId: adminB.id, email: adminB.email, role: adminB.role, tenantId: adminB.tenantId })

        const staffRole = await prisma.tenantStaffRole.create({
            data: { tenantId: tenantAId, name: 'Read only' }
        })
        await prisma.tenantStaffRolePermission.createMany({
            data: [{ tenantId: tenantAId, roleId: staffRole.id, resource: 'orders', action: 'read' }]
        })
        const staff = await prisma.user.create({
            data: {
                tenantId: tenantAId,
                email: `staff-${slugA}@example.com`,
                role: 'staff',
                passwordHash: 'x',
                staffRoleId: staffRole.id
            }
        })
        staffReadOnlyToken = signAccessToken({ userId: staff.id, email: staff.email, role: staff.role, tenantId: staff.tenantId })

        const p1 = await prisma.product.create({
            data: {
                tenantId: tenantAId,
                title: 'Edit Product 1',
                slug: `edit-p1-${Date.now()}`,
                price: 100,
                stock: 50,
                isActive: true
            }
        })
        product1Id = p1.id

        const p2 = await prisma.product.create({
            data: {
                tenantId: tenantAId,
                title: 'Edit Product 2',
                slug: `edit-p2-${Date.now()}`,
                price: 50,
                stock: 50,
                isActive: true
            }
        })
        product2Id = p2.id

        const promoProduct = await prisma.product.create({
            data: {
                tenantId: tenantAId,
                title: 'Promo Product',
                slug: `promo-p-${Date.now()}`,
                price: 100,
                promotionalPrice: 80,
                isPromotionActive: true,
                stock: 50,
                isActive: true
            }
        })
        promoProductId = promoProduct.id

        const inactivePromoProduct = await prisma.product.create({
            data: {
                tenantId: tenantAId,
                title: 'Inactive Promo Product',
                slug: `inactive-promo-p-${Date.now()}`,
                price: 150,
                promotionalPrice: 90,
                isPromotionActive: false,
                promotionStartDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                promotionEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                stock: 50,
                isActive: true
            }
        })
        inactivePromoProductId = inactivePromoProduct.id

        const pending = await prisma.order.create({
            data: {
                tenantId: tenantAId,
                status: 'PENDING',
                totalAmount: 100,
                customerName: 'Buyer',
                customerPhone: '0550000000',
                customerAddress: 'Old Address',
                items: { create: [{ productId: product1Id, quantity: 1, price: 100 }] }
            }
        })
        pendingOrderId = pending.id

        const confirmed = await prisma.order.create({
            data: {
                tenantId: tenantAId,
                status: 'CONFIRMED',
                totalAmount: 100,
                customerName: 'Buyer 2',
                customerPhone: '0550000001',
                items: { create: [{ productId: product1Id, quantity: 1, price: 100 }] }
            }
        })
        confirmedOrderId = confirmed.id
    })

    afterAll(async () => {
        await prisma.auditLog.deleteMany({ where: { tenantId: tenantAId } })
        await prisma.orderItem.deleteMany({ where: { tenantId: tenantAId } })
        await prisma.order.deleteMany({ where: { tenantId: tenantAId } })
        await prisma.productVariant.deleteMany({ where: { tenantId: tenantAId } })
        await prisma.product.deleteMany({ where: { tenantId: tenantAId } })
        await prisma.user.deleteMany({ where: { tenantId: tenantAId } })
        await prisma.tenantStaffRolePermission.deleteMany({ where: { tenantId: tenantAId } })
        await prisma.tenantStaffRole.deleteMany({ where: { tenantId: tenantAId } })

        await prisma.user.deleteMany({ where: { tenantId: tenantBId } })
        await prisma.tenant.deleteMany({ where: { id: tenantAId } })
        await prisma.tenant.deleteMany({ where: { id: tenantBId } })
    })

    it('edits a PENDING order: customer info + replaces items (tenant-scoped)', async () => {
        const res = await request(app)
            .put(`/api/admin/orders/${pendingOrderId}`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminAToken}`)
            .send({
                customerName: 'Buyer Updated',
                customerPhone: '0550123456',
                customerAddress: 'New Address',
                shippingAddressLine1: 'New Address',
                items: [{ productId: product2Id, variantId: null, quantity: 3 }]
            })

        expect(res.status).toBe(200)
        expect(res.body.id).toBe(pendingOrderId)
        expect(res.body.customerName).toBe('Buyer Updated')
        expect(res.body.customerPhone).toBe('0550123456')
        expect(res.body.items.length).toBe(1)
        expect(res.body.items[0].productId).toBe(product2Id)
        expect(res.body.items[0].quantity).toBe(3)
        expect(Number(res.body.totalAmount)).toBe(150)

        const itemsAfter = await prisma.orderItem.findMany({ where: { tenantId: tenantAId, orderId: pendingOrderId } })
        expect(itemsAfter.length).toBe(1)
        expect(itemsAfter[0].productId).toBe(product2Id)
        expect(itemsAfter[0].quantity).toBe(3)
    })

    it('updates wilaya and commune for a PENDING order', async () => {
        const res = await request(app)
            .put(`/api/admin/orders/${pendingOrderId}`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminAToken}`)
            .send({
                shippingWilayaCode: '16',
                shippingCommuneCode: '1605'
            })

        expect(res.status).toBe(200)
        expect(res.body.id).toBe(pendingOrderId)
        expect(res.body.shippingWilayaCode).toBe('16')
        expect(res.body.shippingCommuneCode).toBe('1605')

        const orderAfter = await prisma.order.findFirst({
            where: { tenantId: tenantAId, id: pendingOrderId },
            select: { shippingWilayaCode: true, shippingCommuneCode: true }
        })
        expect(orderAfter?.shippingWilayaCode).toBe('16')
        expect(orderAfter?.shippingCommuneCode).toBe('1605')
    })

    it('updates delivery choice and shipping pricing for a PENDING order', async () => {
        const res = await request(app)
            .put(`/api/admin/orders/${pendingOrderId}`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminAToken}`)
            .send({
                shippingProvider: 'MAYSTRO',
                deliveryMode: 'pickup',
                shippingServiceLevel: 'office',
                shippingAmount: 350,
                shippingCurrency: 'DZD',
                shippingWilayaCode: '16',
                shippingCommuneCode: '1605',
                shippingPickupPoint: '445'
            })

        expect(res.status).toBe(200)
        expect(res.body.shippingProvider).toBe('MAYSTRO')
        expect(res.body.deliveryMode).toBe('pickup')
        expect(res.body.shippingServiceLevel).toBe('office')
        expect(Number(res.body.shippingAmount)).toBe(350)
        expect(res.body.shippingCurrency).toBe('DZD')
        expect(res.body.shippingPickupPoint).toBe(445)
        expect(Number(res.body.totalWithShippingAmount)).toBe(Number(res.body.totalAmount) + 350)
    })

    it('uses promotional price when editing unconfirmed order items', async () => {
        const res = await request(app)
            .put(`/api/admin/orders/${pendingOrderId}`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminAToken}`)
            .send({
                customerName: 'Buyer Promo',
                customerPhone: '0550123456',
                items: [{ productId: promoProductId, variantId: null, quantity: 2 }]
            })

        expect(res.status).toBe(200)
        expect(Number(res.body.totalAmount)).toBe(160)
        expect(res.body.items).toHaveLength(1)
        expect(Number(res.body.items[0].price)).toBe(80)
        expect(res.body.items[0].productId).toBe(promoProductId)
    })

    it('ignores promotional price when the product-level promotion is inactive or out-of-window', async () => {
        const res = await request(app)
            .put(`/api/admin/orders/${pendingOrderId}`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminAToken}`)
            .send({
                customerName: 'Buyer Inactive Promo',
                customerPhone: '0550123456',
                items: [{ productId: inactivePromoProductId, variantId: null, quantity: 2 }]
            })

        expect(res.status).toBe(200)
        expect(Number(res.body.totalAmount)).toBe(300)
        expect(res.body.items).toHaveLength(1)
        expect(Number(res.body.items[0].price)).toBe(150)
        expect(res.body.items[0].productId).toBe(inactivePromoProductId)
    })

    it('rejects editing for non-PENDING orders', async () => {
        const res = await request(app)
            .put(`/api/admin/orders/${confirmedOrderId}`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminAToken}`)
            .send({
                customerName: 'Nope',
                customerPhone: '0550123456',
                items: [{ productId: product2Id, variantId: null, quantity: 1 }]
            })

        expect(res.status).toBe(409)
    })

    it('rejects wilaya/commune edit for non-PENDING orders', async () => {
        const res = await request(app)
            .put(`/api/admin/orders/${confirmedOrderId}`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminAToken}`)
            .send({
                shippingWilayaCode: '31',
                shippingCommuneCode: '3101'
            })

        expect(res.status).toBe(409)
    })

    it('does not allow cross-tenant edits via host resolution', async () => {
        const res = await request(app)
            .put(`/api/admin/orders/${pendingOrderId}`)
            .set('X-Forwarded-Host', hostB)
            .set('Authorization', `Bearer ${adminBToken}`)
            .send({
                customerName: 'Cross',
                customerPhone: '0550123456',
                items: [{ productId: product2Id, variantId: null, quantity: 1 }]
            })

        expect(res.status).toBe(404)
    })

    it('enforces staff RBAC for edit (PUT => update permission)', async () => {
        const res = await request(app)
            .put(`/api/admin/orders/${pendingOrderId}`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${staffReadOnlyToken}`)
            .send({
                customerName: 'Blocked',
                customerPhone: '0550123456',
                items: [{ productId: product2Id, variantId: null, quantity: 1 }]
            })

        expect(res.status).toBe(403)
    })
})
