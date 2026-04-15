import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Admin sales API', () => {
    const slugA = `sales-a-${Date.now()}`
    const hostA = `${slugA}.localhost:3000`
    const slugB = `sales-b-${Date.now()}`
    let tenantAId: string
    let tenantBId: string
    let adminTokenA: string
    let deliveredOrderAId: string
    let posSaleAId: string

    beforeAll(async () => {
        const tenantA = await prisma.tenant.create({ data: { name: 'Sales Tenant A', slug: slugA } })
        tenantAId = tenantA.id
        const adminA = await prisma.user.create({
            data: { tenantId: tenantAId, email: `admin-${slugA}@example.com`, role: 'admin', passwordHash: 'x' }
        })
        adminTokenA = signAccessToken({
            userId: adminA.id,
            email: adminA.email,
            role: adminA.role,
            tenantId: adminA.tenantId
        })

        const tenantB = await prisma.tenant.create({ data: { name: 'Sales Tenant B', slug: slugB } })
        tenantBId = tenantB.id

        const deliveredA = await prisma.order.create({
            data: {
                tenantId: tenantAId,
                status: 'DELIVERED',
                totalAmount: 1234,
                customerName: 'Buyer A',
                customerPhone: '0550000001'
            }
        })
        deliveredOrderAId = deliveredA.id

        const posSale = await prisma.sale.create({
            data: {
                tenantId: tenantAId,
                status: 'COMPLETED',
                totalAmount: 777,
                customerId: null,
                customerName: null,
                customerPhone: null,
                notes: 'POS'
            }
        })
        posSaleAId = posSale.id

        await prisma.order.create({
            data: {
                tenantId: tenantAId,
                status: 'PENDING',
                totalAmount: 500,
                customerName: 'Not Completed',
                customerPhone: '0550000002'
            }
        })

        await prisma.order.create({
            data: {
                tenantId: tenantBId,
                status: 'DELIVERED',
                totalAmount: 999,
                customerName: 'Buyer B',
                customerPhone: '0550000003'
            }
        })
    })

    afterAll(async () => {
        await prisma.saleItem.deleteMany({ where: { sale: { tenantId: { in: [tenantAId, tenantBId] } } } })
        await prisma.sale.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.orderItem.deleteMany({ where: { order: { tenantId: { in: [tenantAId, tenantBId] } } } })
        await prisma.order.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.tenantDomain.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.storeSettings.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } })
    })

    it('lists completed sales (DELIVERED orders + POS sales) for the current tenant', async () => {
        const res = await request(app)
            .get('/api/admin/sales')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminTokenA}`)

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body.items)).toBe(true)
        const ids = res.body.items.map((o: any) => o.id)
        expect(ids).toContain(deliveredOrderAId)
        expect(ids).toContain(posSaleAId)
        expect(res.body.items.every((o: any) => o.status === 'DELIVERED' || o.status === 'COMPLETED')).toBe(true)
        expect(res.body.items.every((o: any) => o.customerName !== 'Buyer B')).toBe(true)
    })
})
