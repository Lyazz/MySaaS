import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Suppliers + Purchases', () => {
    const slugA = `po-a-${Date.now()}`
    const slugB = `po-b-${Date.now()}`
    const hostA = `${slugA}.localhost:3000`
    const hostB = `${slugB}.localhost:3000`

    let tenantAId: string
    let tenantBId: string
    let userAId: string
    let userBId: string
    let tokenA: string
    let tokenB: string

    let productAId: string
    let defaultVariantAId: string
    let supplierAId: string
    let purchaseOrderId: string
    let purchaseItemId: string

    beforeAll(async () => {
        const [tenantA, tenantB] = await prisma.$transaction([
            prisma.tenant.create({ data: { name: 'PO Tenant A', slug: slugA } }),
            prisma.tenant.create({ data: { name: 'PO Tenant B', slug: slugB } })
        ])
        tenantAId = tenantA.id
        tenantBId = tenantB.id

        const [userA, userB] = await prisma.$transaction([
            prisma.user.create({
                data: {
                    tenantId: tenantAId,
                    email: `admin-a-${slugA}@example.com`,
                    role: 'admin',
                    passwordHash: 'x'
                }
            }),
            prisma.user.create({
                data: {
                    tenantId: tenantBId,
                    email: `admin-b-${slugB}@example.com`,
                    role: 'admin',
                    passwordHash: 'x'
                }
            })
        ])
        userAId = userA.id
        userBId = userB.id

        tokenA = signAccessToken({ userId: userAId, email: userA.email, role: userA.role, tenantId: userA.tenantId })
        tokenB = signAccessToken({ userId: userBId, email: userB.email, role: userB.role, tenantId: userB.tenantId })

        const product = await prisma.product.create({
            data: {
                tenantId: tenantAId,
                title: 'PO Product A',
                slug: `po-prod-${Date.now()}`,
                price: 100,
                stock: 0,
                isActive: true
            }
        })
        productAId = product.id

        const defVar = await prisma.productVariant.create({
            data: {
                tenantId: tenantAId,
                productId: productAId,
                price: 100,
                cost: 0,
                stock: 0,
                trackInventory: false, // always sellable policy, but purchases still update stock (decision A)
                reserved: 0,
                safetyStock: 0,
                isActive: true
            }
        })
        defaultVariantAId = defVar.id
    })

    afterAll(async () => {
        await prisma.inventoryMovement.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.purchaseOrderItem.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.purchaseOrder.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.supplier.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.productVariant.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.product.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } })
        await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } })
    })

    it('creates supplier and purchase, receives stock, updates cost/sale price, and writes movement', async () => {
        const supplierRes = await request(app)
            .post('/api/admin/suppliers')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ name: 'Main Supplier', phone: '0550000000' })

        expect(supplierRes.status).toBe(201)
        supplierAId = supplierRes.body.id

        const poRes = await request(app)
            .post('/api/admin/purchases')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ supplierId: supplierAId, currency: 'DZD' })

        expect(poRes.status).toBe(201)
        purchaseOrderId = poRes.body.id

        const itemRes = await request(app)
            .post(`/api/admin/purchases/${purchaseOrderId}/items`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                variantId: defaultVariantAId,
                quantityOrdered: 10,
                unitCost: '50',
                salePrice: '120'
            })

        expect(itemRes.status).toBe(201)
        purchaseItemId = itemRes.body.id

        const receiveRes = await request(app)
            .post(`/api/admin/purchases/${purchaseOrderId}/receive`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ items: [{ itemId: purchaseItemId, quantityReceived: 7 }] })

        expect(receiveRes.status).toBe(200)

        const variantAfter = await prisma.productVariant.findFirst({
            where: { tenantId: tenantAId, id: defaultVariantAId },
            select: { stock: true, cost: true, price: true }
        })
        expect(variantAfter?.stock).toBe(7)
        expect(String(variantAfter?.cost)).toBe('50')
        expect(String(variantAfter?.price)).toBe('120')

        const productAfter = await prisma.product.findFirst({
            where: { tenantId: tenantAId, id: productAId },
            select: { stock: true, price: true }
        })
        // When trackInventory=false, product is treated as always sellable.
        expect(productAfter?.stock).toBe(999999)
        expect(String(productAfter?.price)).toBe('120')

        const movement = await prisma.inventoryMovement.findFirst({
            where: {
                tenantId: tenantAId,
                variantId: defaultVariantAId,
                type: 'PURCHASE_RECEIPT'
            },
            orderBy: { createdAt: 'desc' }
        })
        expect(movement?.delta).toBe(7)
        expect(movement?.createdByUserId).toBe(userAId)
        expect(String(movement?.note || '')).toContain(`purchaseOrder:${purchaseOrderId}`)
    })

    it('can update sale price using weighted average when chosen', async () => {
        const poRes = await request(app)
            .post('/api/admin/purchases')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ supplierId: supplierAId, currency: 'DZD' })

        expect(poRes.status).toBe(201)
        const po2Id = poRes.body.id

        const itemRes = await request(app)
            .post(`/api/admin/purchases/${po2Id}/items`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                variantId: defaultVariantAId,
                quantityOrdered: 3,
                unitCost: '60',
                salePrice: '200'
            })

        expect(itemRes.status).toBe(201)
        const item2Id = itemRes.body.id

        // After previous test: stock=7, price=120. Weighted with newQty=3, newPrice=200 => (120*7 + 200*3) / 10 = 144
        const receiveRes = await request(app)
            .post(`/api/admin/purchases/${po2Id}/receive`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                salePriceMode: 'weighted',
                items: [{ itemId: item2Id, quantityReceived: 3 }]
            })

        expect(receiveRes.status).toBe(200)

        const variantAfter = await prisma.productVariant.findFirst({
            where: { tenantId: tenantAId, id: defaultVariantAId },
            select: { stock: true, cost: true, price: true }
        })
        expect(variantAfter?.stock).toBe(10)
        expect(String(variantAfter?.cost)).toBe('60')
        expect(Number(variantAfter?.price)).toBeCloseTo(144, 2)

        const movement = await prisma.inventoryMovement.findFirst({
            where: {
                tenantId: tenantAId,
                variantId: defaultVariantAId,
                type: 'PURCHASE_RECEIPT'
            },
            orderBy: { createdAt: 'desc' }
        })
        expect(String(movement?.note || '')).toContain('salePriceMode:weighted')
    })

    it('blocks cross-tenant access with mismatched host/token', async () => {
        const res = await request(app)
            .get('/api/admin/purchases')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenB}`)

        expect(res.status).toBe(403)
    })

    it('blocks tenant A token on tenant B host', async () => {
        const res = await request(app)
            .get('/api/admin/suppliers')
            .set('X-Forwarded-Host', hostB)
            .set('Authorization', `Bearer ${tokenA}`)

        expect(res.status).toBe(403)
    })
})
