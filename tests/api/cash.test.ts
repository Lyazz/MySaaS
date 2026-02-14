import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Cashboxes + Cash Sessions + Transactions', () => {
    const slugA = `cash-a-${Date.now()}`
    const slugB = `cash-b-${Date.now()}`
    const hostA = `${slugA}.localhost:3000`
    const hostB = `${slugB}.localhost:3000`

    let tenantAId: string
    let tenantBId: string
    let userAId: string
    let userBId: string
    let tokenA: string
    let tokenB: string

    let cashboxAId: string
    let cashboxBId: string
    let sessionAId: string

    let customerAId: string
    let supplierAId: string

    beforeAll(async () => {
        const [tenantA, tenantB] = await prisma.$transaction([
            prisma.tenant.create({ data: { name: 'Cash Tenant A', slug: slugA } }),
            prisma.tenant.create({ data: { name: 'Cash Tenant B', slug: slugB } })
        ])
        tenantAId = tenantA.id
        tenantBId = tenantB.id

        const [userA, userB] = await prisma.$transaction([
            prisma.user.create({
                data: { tenantId: tenantAId, email: `admin-a-${slugA}@example.com`, role: 'admin', passwordHash: 'x' }
            }),
            prisma.user.create({
                data: { tenantId: tenantBId, email: `admin-b-${slugB}@example.com`, role: 'admin', passwordHash: 'x' }
            })
        ])
        userAId = userA.id
        userBId = userB.id

        tokenA = signAccessToken({ userId: userAId, email: userA.email, role: userA.role, tenantId: userA.tenantId })
        tokenB = signAccessToken({ userId: userBId, email: userB.email, role: userB.role, tenantId: userB.tenantId })

        const [customerA, supplierA] = await prisma.$transaction([
            prisma.customer.create({
                data: { tenantId: tenantAId, name: 'Cash Customer', phone: `0551${Date.now()}` }
            }),
            prisma.supplier.create({
                data: { tenantId: tenantAId, name: `Cash Supplier ${Date.now()}` }
            })
        ])
        customerAId = customerA.id
        supplierAId = supplierA.id
    })

    afterAll(async () => {
        await prisma.cashTransaction.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.cashSession.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.cashbox.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.supplier.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.customer.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } })
        await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } })
    })

    it('creates cashbox, opens session, records transactions, and closes with expectedClosing', async () => {
        const cashboxRes = await request(app)
            .post('/api/admin/cashboxes')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ name: 'Main Cashbox' })

        expect(cashboxRes.status).toBe(201)
        cashboxAId = cashboxRes.body.id

        const openRes = await request(app)
            .post(`/api/admin/cashboxes/${cashboxAId}/sessions/open`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ openingFloat: '1000', note: 'Start day' })

        expect(openRes.status).toBe(201)
        sessionAId = openRes.body.id

        const customerPayRes = await request(app)
            .post('/api/admin/cash-transactions')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                cashboxId: cashboxAId,
                type: 'CUSTOMER_PAYMENT',
                direction: 'IN',
                amount: '500',
                customerId: customerAId,
                note: 'Acompte'
            })

        expect(customerPayRes.status).toBe(201)
        expect(customerPayRes.body.customerId).toBe(customerAId)

        const supplierPayRes = await request(app)
            .post('/api/admin/cash-transactions')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                cashboxId: cashboxAId,
                type: 'SUPPLIER_PAYMENT',
                direction: 'OUT',
                amount: '200',
                supplierId: supplierAId,
                note: 'Avance'
            })

        expect(supplierPayRes.status).toBe(201)
        expect(supplierPayRes.body.supplierId).toBe(supplierAId)

        const expenseRes = await request(app)
            .post('/api/admin/cash-transactions')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                cashboxId: cashboxAId,
                type: 'EXPENSE',
                direction: 'OUT',
                amount: '50',
                expenseCategory: 'Transport'
            })

        expect(expenseRes.status).toBe(201)
        expect(expenseRes.body.expenseCategory).toBe('Transport')

        // expectedClosing = openingFloat (1000) + IN (500) - OUT (200+50) = 1250
        const closeRes = await request(app)
            .post(`/api/admin/cash-sessions/${sessionAId}/close`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ closingCount: '1250', note: 'End day' })

        expect(closeRes.status).toBe(200)
        expect(closeRes.body.status).toBe('CLOSED')
        expect(String(closeRes.body.expectedClosing)).toBe('1250')
        expect(String(closeRes.body.difference)).toBe('0')
    })

    it('blocks creating transactions without an open session', async () => {
        const cashboxRes = await request(app)
            .post('/api/admin/cashboxes')
            .set('X-Forwarded-Host', hostB)
            .set('Authorization', `Bearer ${tokenB}`)
            .send({ name: 'B Cashbox' })

        expect(cashboxRes.status).toBe(201)
        cashboxBId = cashboxRes.body.id

        const txRes = await request(app)
            .post('/api/admin/cash-transactions')
            .set('X-Forwarded-Host', hostB)
            .set('Authorization', `Bearer ${tokenB}`)
            .send({
                cashboxId: cashboxBId,
                type: 'EXPENSE',
                direction: 'OUT',
                amount: '10',
                expenseCategory: 'Test'
            })

        expect(txRes.status).toBe(409)
    })

    it('blocks cross-tenant access with mismatched host/token', async () => {
        const res = await request(app)
            .get('/api/admin/cashboxes')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenB}`)

        expect(res.status).toBe(403)
    })

    it('returns 404 when updating a cashbox from another tenant', async () => {
        const res = await request(app)
            .patch(`/api/admin/cashboxes/${cashboxBId}`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ name: 'Should not work' })

        expect(res.status).toBe(404)
    })
})

