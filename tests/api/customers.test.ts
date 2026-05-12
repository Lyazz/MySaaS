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
    let otherTenantCustomerId: string

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
                phoneRaw: '0550000100',
                phoneNormalized: '213550000100',
                address: 'Address 1',
                openingBalance: 100
            }
        })
        const c2 = await prisma.customer.create({
            data: {
                tenantId: tenantAId,
                name: 'Customer Two',
                phone: '0550000200',
                phoneRaw: '0550000200',
                phoneNormalized: '213550000200'
            }
        })

        const otherTenantCustomer = await prisma.customer.create({
            data: {
                tenantId: tenantBId,
                name: 'Other Tenant',
                phone: '0550000100',
                phoneRaw: '0550000100',
                phoneNormalized: '213550000100'
            }
        })
        otherTenantCustomerId = otherTenantCustomer.id

        await prisma.sale.createMany({
            data: [
                {
                    tenantId: tenantAId,
                    customerId: c1.id,
                    status: 'COMPLETED',
                    totalAmount: 1000,
                    customerName: 'Customer One',
                    customerPhone: '0550000100',
                    customerAddress: 'Address 1',
                    source: 'POS'
                },
                {
                    tenantId: tenantAId,
                    customerId: c1.id,
                    status: 'COMPLETED',
                    totalAmount: 250,
                    customerName: 'Customer One',
                    customerPhone: '0550000100',
                    customerAddress: 'Address 1',
                    source: 'POS'
                },
                {
                    tenantId: tenantAId,
                    customerId: c2.id,
                    status: 'COMPLETED',
                    totalAmount: 500,
                    customerName: 'Customer Two',
                    customerPhone: '0550000200',
                    source: 'POS'
                },
                {
                    tenantId: tenantBId,
                    customerId: otherTenantCustomer.id,
                    status: 'COMPLETED',
                    totalAmount: 999,
                    customerName: 'Other Tenant',
                    customerPhone: '0550000100',
                    source: 'POS'
                }
            ]
        })

        const cashbox = await prisma.cashbox.create({
            data: { tenantId: tenantAId, name: `CB-${Date.now()}`, isActive: true }
        })
        const session = await prisma.cashSession.create({
            data: { tenantId: tenantAId, cashboxId: cashbox.id, status: 'OPEN', openingFloat: 0 }
        })

        const cashTx = await prisma.cashTransaction.create({
            data: {
                tenantId: tenantAId,
                cashboxId: cashbox.id,
                sessionId: session.id,
                direction: 'IN',
                type: 'CUSTOMER_PAYMENT',
                amount: 500,
                currency: 'DZD',
                method: 'CASH',
                customerId: c1.id,
                reference: 'advance',
                note: null,
                createdByUserId: null
            }
        })

        await prisma.customerPayment.create({
            data: {
                tenantId: tenantAId,
                customerId: c1.id,
                cashTransactionId: cashTx.id,
                amount: cashTx.amount,
                currency: cashTx.currency,
                method: cashTx.method,
                reference: cashTx.reference,
                note: cashTx.note,
                createdByUserId: null
            }
        })
    })

    afterAll(async () => {
        await prisma.customerPayment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.cashTransaction.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.cashSession.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.cashbox.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.saleItem.deleteMany({ where: { sale: { tenantId: { in: [tenantAId, tenantBId] } } } })
        await prisma.sale.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.customer.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.tenantDomain.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.storeSettings.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } })
    })

    it('lists customer summaries derived from tenant sales only (and computes balances)', async () => {
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
        expect(c1.openingBalance).toBe(100)
        expect(c1.totalPaid).toBe(500)
        expect(c1.currentBalance).toBe(850)
    })

    it('returns a customer sales history scoped by tenant', async () => {
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
        expect(res.body.sales.length).toBe(2)
        expect(res.body.sales.every((s: any) => s.customerPhone === '0550000100')).toBe(true)
        expect(res.body.sales.every((s: any) => s.customerName !== 'Other Tenant')).toBe(true)
        expect(res.body.summary?.currentBalance).toBe(850)
    })

    it('creates a customer scoped to the tenant', async () => {
        const res = await request(app)
            .post('/api/admin/customers')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminTokenA}`)
            .send({ name: 'New Customer', phone: '0550000300', email: 'new@example.com', address: 'Address 3', openingBalance: 0 })

        expect(res.status).toBe(201)
        expect(res.body?.id).toBeTruthy()
        expect(res.body?.name).toBe('New Customer')
        expect(res.body?.phone).toBe('0550000300')

        const list = await request(app)
            .get('/api/admin/customers?search=0550000300')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminTokenA}`)

        expect(list.status).toBe(200)
        expect(list.body.some((c: any) => c.phone === '0550000300')).toBe(true)
        const created = list.body.find((c: any) => c.phone === '0550000300')
        expect(created.ordersCount).toBe(0)
        expect(created.currentBalance).toBe(0)
    })

    it('deduplicates customers by normalized Algerian phone number', async () => {
        const res = await request(app)
            .post('/api/admin/customers')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminTokenA}`)
            .send({ name: 'Duplicate Phone', phone: '+XX X XXX XXXX' })

        expect(res.status).toBe(409)
        expect(res.body.statusMessage).toContain('phone number already exists')
    })

    it('finds a customer by normalized phone even when the query format differs', async () => {
        const res = await request(app)
            .get('/api/admin/customers/by-phone/%2B213550000100')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminTokenA}`)

        expect(res.status).toBe(200)
        expect(res.body.summary?.phoneNormalized).toBe('213550000100')
        expect(res.body.summary?.phone).toBe('0550000100')
    })

    it('does not allow cross-tenant access by id', async () => {
        const res = await request(app)
            .get(`/api/admin/customers/${otherTenantCustomerId}`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminTokenA}`)

        expect(res.status).toBe(200)
        expect(res.body.summary).toBe(null)
        expect(Array.isArray(res.body.sales)).toBe(true)
        expect(res.body.sales.length).toBe(0)
        expect(Array.isArray(res.body.payments)).toBe(true)
        expect(res.body.payments.length).toBe(0)
    })
})
