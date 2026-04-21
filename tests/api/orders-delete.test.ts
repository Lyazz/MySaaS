import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Orders delete (unconfirmed only)', () => {
    const slugA = `orders-del-a-${Date.now()}`
    const hostA = `${slugA}.localhost:3000`
    const slugB = `orders-del-b-${Date.now()}`
    const hostB = `${slugB}.localhost:3000`

    let tenantAId: string
    let tenantBId: string
    let adminAToken: string
    let adminBToken: string
    let productAId: string
    let pendingOrderId: string
    let confirmedOrderId: string
    let staffNoDeleteToken: string

    beforeAll(async () => {
        const tenantA = await prisma.tenant.create({ data: { name: 'Tenant A', slug: slugA } })
        tenantAId = tenantA.id
        const tenantB = await prisma.tenant.create({ data: { name: 'Tenant B', slug: slugB } })
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
            data: { tenantId: tenantAId, name: 'No delete' }
        })
        await prisma.tenantStaffRolePermission.createMany({
            data: [
                { tenantId: tenantAId, roleId: staffRole.id, resource: 'orders', action: 'read' },
                { tenantId: tenantAId, roleId: staffRole.id, resource: 'orders', action: 'update' }
            ]
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
        staffNoDeleteToken = signAccessToken({ userId: staff.id, email: staff.email, role: staff.role, tenantId: staff.tenantId })

        const product = await prisma.product.create({
            data: {
                tenantId: tenantAId,
                title: 'Test Product',
                slug: `test-${Date.now()}`,
                price: 100,
                stock: 10,
                isActive: true
            }
        })
        productAId = product.id

        const pending = await prisma.order.create({
            data: {
                tenantId: tenantAId,
                status: 'PENDING',
                totalAmount: 100,
                customerName: 'Buyer',
                customerPhone: '0550000000',
                items: {
                    create: [{ productId: productAId, quantity: 1, price: 100 }]
                }
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
                items: {
                    create: [{ productId: productAId, quantity: 1, price: 100 }]
                }
            }
        })
        confirmedOrderId = confirmed.id
    })

    afterAll(async () => {
        await prisma.orderItem.deleteMany({ where: { tenantId: tenantAId } })
        await prisma.order.deleteMany({ where: { tenantId: tenantAId } })
        await prisma.product.deleteMany({ where: { tenantId: tenantAId } })
        await prisma.user.deleteMany({ where: { tenantId: tenantAId } })
        await prisma.tenantStaffRolePermission.deleteMany({ where: { tenantId: tenantAId } })
        await prisma.tenantStaffRole.deleteMany({ where: { tenantId: tenantAId } })
        await prisma.user.deleteMany({ where: { tenantId: tenantBId } })
        await prisma.tenant.deleteMany({ where: { id: tenantAId } })
        await prisma.tenant.deleteMany({ where: { id: tenantBId } })
    })

    it('requires auth', async () => {
        const res = await request(app)
            .delete(`/api/admin/orders/${pendingOrderId}`)
            .set('X-Forwarded-Host', hostA)

        expect(res.status).toBe(401)
    })

    it('deletes a PENDING order (tenant-scoped) and removes order items', async () => {
        const res = await request(app)
            .delete(`/api/admin/orders/${pendingOrderId}`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminAToken}`)

        expect(res.status).toBe(200)

        const orderAfter = await prisma.order.findFirst({ where: { tenantId: tenantAId, id: pendingOrderId } })
        expect(orderAfter).toBeNull()

        const itemsAfter = await prisma.orderItem.findMany({ where: { tenantId: tenantAId, orderId: pendingOrderId } })
        expect(itemsAfter.length).toBe(0)
    })

    it('rejects deletion for CONFIRMED orders', async () => {
        const res = await request(app)
            .delete(`/api/admin/orders/${confirmedOrderId}`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminAToken}`)

        expect(res.status).toBe(409)
        expect(res.body?.code).toBe('ORDER_DELETE_STATUS_NOT_ALLOWED')

        const stillThere = await prisma.order.findFirst({ where: { tenantId: tenantAId, id: confirmedOrderId } })
        expect(stillThere).not.toBeNull()
    })

    it('does not allow cross-tenant deletion via host resolution', async () => {
        const res = await request(app)
            .delete(`/api/admin/orders/${confirmedOrderId}`)
            .set('X-Forwarded-Host', hostB)
            .set('Authorization', `Bearer ${adminBToken}`)

        expect(res.status).toBe(404)
    })

    it('enforces staff RBAC for delete', async () => {
        const order = await prisma.order.create({
            data: {
                tenantId: tenantAId,
                status: 'PENDING',
                totalAmount: 100,
                customerName: 'Staff Buyer',
                customerPhone: '0550000002',
                items: {
                    create: [{ productId: productAId, quantity: 1, price: 100 }]
                }
            }
        })

        const res = await request(app)
            .delete(`/api/admin/orders/${order.id}`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${staffNoDeleteToken}`)

        expect(res.status).toBe(403)
    })

    it('bulk deletes multiple PENDING orders', async () => {
        const a = await prisma.order.create({
            data: {
                tenantId: tenantAId,
                status: 'PENDING',
                totalAmount: 100,
                customerName: 'Bulk A',
                customerPhone: '0550000010',
                items: { create: [{ productId: productAId, quantity: 1, price: 100 }] }
            }
        })
        const b = await prisma.order.create({
            data: {
                tenantId: tenantAId,
                status: 'PENDING',
                totalAmount: 100,
                customerName: 'Bulk B',
                customerPhone: '0550000011',
                items: { create: [{ productId: productAId, quantity: 1, price: 100 }] }
            }
        })

        const res = await request(app)
            .post('/api/admin/orders/bulk-delete')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminAToken}`)
            .send({ ids: [a.id, b.id] })

        expect(res.status).toBe(200)
        expect(res.body.deletedCount).toBe(2)

        const remaining = await prisma.order.findMany({ where: { tenantId: tenantAId, id: { in: [a.id, b.id] } } })
        expect(remaining.length).toBe(0)
    })

    it('bulk delete rejects if any order is not deletable', async () => {
        const pending = await prisma.order.create({
            data: {
                tenantId: tenantAId,
                status: 'PENDING',
                totalAmount: 100,
                customerName: 'Bulk Pending',
                customerPhone: '0550000020',
                items: { create: [{ productId: productAId, quantity: 1, price: 100 }] }
            }
        })

        const res = await request(app)
            .post('/api/admin/orders/bulk-delete')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminAToken}`)
            .send({ ids: [pending.id, confirmedOrderId] })

        expect(res.status).toBe(409)
        expect(res.body?.code).toBe('ORDER_BULK_DELETE_HAS_LINKED_OR_NON_PENDING')

        const stillPending = await prisma.order.findFirst({ where: { tenantId: tenantAId, id: pending.id } })
        expect(stillPending).not.toBeNull()
    })
})
