import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Admin customers API', () => {
    const slugA = `customers-a-${Date.now()}`
    const hostA = `${slugA}.localhost:3000`
    const slugB = `customers-b-${Date.now()}`
    let tenantAId: string
    let tenantBId: string
    let adminTokenA: string

    beforeAll(async () => {
        const tenantA = await prisma.tenant.create({ data: { name: 'Customers Tenant A', slug: slugA } })
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

        const tenantB = await prisma.tenant.create({ data: { name: 'Customers Tenant B', slug: slugB } })
        tenantBId = tenantB.id

        const c1 = await prisma.customer.create({
            data: {
                tenantId: tenantAId,
                name: 'Customer One',
                phone: '0550000100',
                address: 'Address 1'
            }
        })
        const c2 = await prisma.customer.create({
            data: {
                tenantId: tenantAId,
                name: 'Customer Two',
                phone: '0550000200'
            }
        })

        const otherTenantCustomer = await prisma.customer.create({
            data: {
                tenantId: tenantBId,
                name: 'Other Tenant',
                phone: '0550000100'
            }
        })

        await prisma.order.createMany({
            data: [
                {
                    tenantId: tenantAId,
                    customerId: c1.id,
                    status: 'DELIVERED',
                    totalAmount: 1000,
                    customerName: 'Customer One',
                    customerPhone: '0550000100',
                    customerAddress: 'Address 1'
                },
                {
                    tenantId: tenantAId,
                    customerId: c1.id,
                    status: 'PENDING',
                    totalAmount: 250,
                    customerName: 'Customer One',
                    customerPhone: '0550000100',
                    customerAddress: 'Address 1'
                },
                {
                    tenantId: tenantAId,
                    customerId: c2.id,
                    status: 'DELIVERED',
                    totalAmount: 500,
                    customerName: 'Customer Two',
                    customerPhone: '0550000200'
                },
                {
                    tenantId: tenantBId,
                    customerId: otherTenantCustomer.id,
                    status: 'DELIVERED',
                    totalAmount: 999,
                    customerName: 'Other Tenant',
                    customerPhone: '0550000100'
                }
            ]
        })
    })

    afterAll(async () => {
        await prisma.orderItem.deleteMany({ where: { order: { tenantId: { in: [tenantAId, tenantBId] } } } })
        await prisma.order.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.customer.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.tenantDomain.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.storeSettings.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } })
    })

    it('lists customer summaries derived from tenant orders only', async () => {
        const res = await request(app)
            .get('/api/admin/customers')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminTokenA}`)

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        const phones = res.body.map((c: any) => c.phone)
        expect(phones).toContain('0550000100')
        expect(phones).toContain('0550000200')

        const c1 = res.body.find((c: any) => c.phone === '0550000100')
        expect(c1.ordersCount).toBe(2)
        expect(c1.totalSpent).toBe(1250)
    })

    it('returns a customer order history scoped by tenant and phone', async () => {
        const list = await request(app)
            .get('/api/admin/customers')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminTokenA}`)

        expect(list.status).toBe(200)
        const c1 = list.body.find((c: any) => c.phone === '0550000100')
        expect(c1?.id).toBeTruthy()

        const res = await request(app)
            .get(`/api/admin/customers/${c1.id}`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminTokenA}`)

        expect(res.status).toBe(200)
        expect(res.body.summary?.phone).toBe('0550000100')
        expect(res.body.orders.length).toBe(2)
        expect(res.body.orders.every((o: any) => o.customerPhone === '0550000100')).toBe(true)
        expect(res.body.orders.every((o: any) => o.customerName !== 'Other Tenant')).toBe(true)
    })
})
