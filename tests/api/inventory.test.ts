import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Inventory management + movements', () => {
    const slugA = `inv-a-${Date.now()}`
    const slugB = `inv-b-${Date.now()}`
    const hostA = `${slugA}.localhost:3000`
    const hostB = `${slugB}.localhost:3000`

    let tenantAId: string
    let tenantBId: string
    let userAId: string
    let userBId: string
    let tokenA: string
    let tokenB: string

    let productAId: string
    let variantAId: string
    let variantBId: string

    beforeAll(async () => {
        const [tenantA, tenantB] = await prisma.$transaction([
            prisma.tenant.create({ data: { name: 'Inventory Tenant A', slug: slugA } }),
            prisma.tenant.create({ data: { name: 'Inventory Tenant B', slug: slugB } })
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

        await prisma.$transaction([
            prisma.storeSettings.create({
                data: { tenantId: tenantAId, cartEnabled: true, codEnabled: true, minimumOrderAmountDzd: 0, hideOptionalAddress: true }
            }),
            prisma.storeSettings.create({
                data: { tenantId: tenantBId, cartEnabled: true, codEnabled: true, minimumOrderAmountDzd: 0, hideOptionalAddress: true }
            })
        ])

        const productA = await prisma.product.create({
            data: {
                tenantId: tenantAId,
                title: 'Inventory Product A',
                slug: `inv-prod-a-${Date.now()}`,
                price: 100,
                stock: 0,
                isActive: true
            }
        })
        productAId = productA.id

        const productB = await prisma.product.create({
            data: {
                tenantId: tenantBId,
                title: 'Inventory Product B',
                slug: `inv-prod-b-${Date.now()}`,
                price: 50,
                stock: 0,
                isActive: true
            }
        })

        const [variantA, variantB] = await prisma.$transaction([
            prisma.productVariant.create({
                data: {
                    tenantId: tenantAId,
                    productId: productAId,
                    sku: `INV-A-${Date.now()}`,
                    price: 120,
                    stock: 5,
                    reserved: 1,
                    safetyStock: 2,
                    trackInventory: true
                }
            }),
            prisma.productVariant.create({
                data: {
                    tenantId: tenantBId,
                    productId: productB.id,
                    sku: `INV-B-${Date.now()}`,
                    price: 55,
                    stock: 10,
                    reserved: 0,
                    safetyStock: 0,
                    trackInventory: true
                }
            })
        ])
        variantAId = variantA.id
        variantBId = variantB.id
    })

    afterAll(async () => {
        await prisma.orderItem.deleteMany({ where: { order: { tenantId: { in: [tenantAId, tenantBId] } } } })
        await prisma.order.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.productVariant.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.product.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.storeSettings.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } })
        await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } })
    })

    it('enforces safetyStock + reserved in checkout availability; reserves on CONFIRMED and decrements on SHIPPED', async () => {
        // stock=5, reserved=1, safety=2 => available=2
        const fail = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', hostA)
            .send({
                customerName: 'Buyer',
                customerPhone: '0550123456',
                items: [{ productId: productAId, variantId: variantAId, quantity: 3 }]
            })

        expect(fail.status).toBe(400)
        expect(String(fail.body?.statusMessage || '')).toMatch(/insufficient/i)

        const ok = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', hostA)
            .send({
                customerName: 'Buyer',
                customerPhone: '0550123456',
                items: [{ productId: productAId, variantId: variantAId, quantity: 2 }]
            })

        expect(ok.status).toBe(201)
        expect(ok.body?.orderId).toBeTruthy()
        const orderId = ok.body.orderId as string

        const variantAfter = await prisma.productVariant.findFirst({
            where: { id: variantAId, tenantId: tenantAId },
            select: { stock: true, reserved: true, safetyStock: true }
        })
        // PENDING is a no-op for inventory (COD: reserve on confirm).
        expect(variantAfter?.stock).toBe(5)
        expect(variantAfter?.reserved).toBe(1)
        expect(variantAfter?.safetyStock).toBe(2)

        const movement = await prisma.inventoryMovement.findFirst({
            where: { tenantId: tenantAId, variantId: variantAId, orderId },
            orderBy: { createdAt: 'desc' }
        })
        expect(movement).toBeNull()

        const confirm = await request(app)
            .patch(`/api/admin/orders/${orderId}`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ status: 'CONFIRMED' })

        expect(confirm.status).toBe(200)

        const afterConfirm = await prisma.productVariant.findFirst({
            where: { id: variantAId, tenantId: tenantAId },
            select: { stock: true, reserved: true, safetyStock: true }
        })
        expect(afterConfirm?.stock).toBe(5)
        expect(afterConfirm?.reserved).toBe(3)
        expect(afterConfirm?.safetyStock).toBe(2)

        const reserveMove = await prisma.inventoryMovement.findFirst({
            where: { tenantId: tenantAId, variantId: variantAId, orderId, type: 'RESERVED_ADJUSTMENT' },
            orderBy: { createdAt: 'desc' }
        })
        expect(reserveMove?.delta).toBe(0)
        expect(reserveMove?.reservedDelta).toBe(2)

        const ship = await request(app)
            .patch(`/api/admin/orders/${orderId}`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ status: 'SHIPPED' })

        expect(ship.status).toBe(200)

        const afterShip = await prisma.productVariant.findFirst({
            where: { id: variantAId, tenantId: tenantAId },
            select: { stock: true, reserved: true, safetyStock: true }
        })
        expect(afterShip?.stock).toBe(3)
        expect(afterShip?.reserved).toBe(1)
        expect(afterShip?.safetyStock).toBe(2)

        const shipMove = await prisma.inventoryMovement.findFirst({
            where: { tenantId: tenantAId, variantId: variantAId, orderId, type: 'ORDER_DECREMENT' },
            orderBy: { createdAt: 'desc' }
        })
        expect(shipMove?.delta).toBe(-2)
        expect(shipMove?.reservedDelta).toBe(-2)
    })

    it('lets tenant admin update variant inventory and records createdBy + deltas', async () => {
        const res = await request(app)
            .patch(`/api/admin/inventory/variants/${variantAId}`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                safetyStock: 1,
                reason: 'test',
                note: 'Lower safety stock'
            })

        expect(res.status).toBe(200)
        expect(res.body?.safetyStock).toBe(1)

        const move = await prisma.inventoryMovement.findFirst({
            where: { tenantId: tenantAId, variantId: variantAId, createdByUserId: userAId },
            orderBy: { createdAt: 'desc' }
        })

        expect(move?.type).toBe('SAFETY_STOCK_CHANGE')
        expect(move?.safetyStockDelta).toBe(-1)
        expect(move?.note).toBe('Lower safety stock')

        const variantNow = await prisma.productVariant.findFirst({
            where: { tenantId: tenantAId, id: variantAId },
            select: { stock: true, reserved: true, safetyStock: true, trackInventory: true }
        })
        const productAfter = await prisma.product.findFirst({
            where: { tenantId: tenantAId, id: productAId },
            select: { stock: true }
        })
        const expectedAvailable =
            variantNow?.trackInventory === false
                ? 999999
                : Math.max((variantNow?.stock ?? 0) - (variantNow?.reserved ?? 0) - (variantNow?.safetyStock ?? 0), 0)
        expect(productAfter?.stock).toBe(expectedAvailable)
    })

    it('blocks tenant admin from editing stock/reserved directly', async () => {
        const before = await prisma.productVariant.findFirst({
            where: { tenantId: tenantAId, id: variantAId },
            select: { stock: true, reserved: true, safetyStock: true }
        })

        const stockRes = await request(app)
            .patch(`/api/admin/inventory/variants/${variantAId}`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ stock: 999 })
        expect(stockRes.status).toBe(403)

        const reservedRes = await request(app)
            .patch(`/api/admin/inventory/variants/${variantAId}`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ reserved: 999 })
        expect(reservedRes.status).toBe(403)

        const after = await prisma.productVariant.findFirst({
            where: { tenantId: tenantAId, id: variantAId },
            select: { stock: true, reserved: true, safetyStock: true }
        })
        expect(after).toEqual(before)
    })

    it('lets tenant admin set and adjust stock via explicit endpoints and records movements', async () => {
        const beforeSet = await prisma.productVariant.findFirst({
            where: { tenantId: tenantAId, id: variantAId },
            select: { stock: true, reserved: true, safetyStock: true }
        })
        expect(beforeSet).toBeTruthy()

        const setRes = await request(app)
            .post(`/api/admin/inventory/variants/${variantAId}/stock/set`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ stock: 8, reason: 'stocktake', note: 'Counted on shelf' })

        expect(setRes.status).toBe(200)
        expect(setRes.body?.stock).toBe(8)

        const setMove = await prisma.inventoryMovement.findFirst({
            where: { tenantId: tenantAId, variantId: variantAId, type: 'MANUAL_SET', createdByUserId: userAId },
            orderBy: { createdAt: 'desc' }
        })
        expect(setMove?.delta).toBe(8 - (beforeSet?.stock ?? 0))
        expect(setMove?.note).toBe('Counted on shelf')
        expect(setMove?.stockAfter).toBe(8)

        const productAfterSet = await prisma.product.findFirst({
            where: { tenantId: tenantAId, id: productAId },
            select: { stock: true }
        })
        expect(productAfterSet?.stock).toBe(Math.max(8 - (beforeSet?.reserved ?? 0) - (beforeSet?.safetyStock ?? 0), 0))

        const adjustRes = await request(app)
            .post(`/api/admin/inventory/variants/${variantAId}/stock/adjust`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ delta: -2, reason: 'damage', note: 'Broken item' })

        expect(adjustRes.status).toBe(200)
        expect(adjustRes.body?.stock).toBe(6) // 8 - 2

        const adjustMove = await prisma.inventoryMovement.findFirst({
            where: { tenantId: tenantAId, variantId: variantAId, type: 'MANUAL_ADJUSTMENT', createdByUserId: userAId },
            orderBy: { createdAt: 'desc' }
        })
        expect(adjustMove?.delta).toBe(-2)
        expect(adjustMove?.note).toBe('Broken item')
        expect(adjustMove?.stockAfter).toBe(6)

        const productAfterAdjust = await prisma.product.findFirst({
            where: { tenantId: tenantAId, id: productAId },
            select: { stock: true }
        })
        expect(productAfterAdjust?.stock).toBe(Math.max(6 - (beforeSet?.reserved ?? 0) - (beforeSet?.safetyStock ?? 0), 0))
    })

    it('blocks stock set below reserved + safetyStock', async () => {
        const current = await prisma.productVariant.findFirst({
            where: { tenantId: tenantAId, id: variantAId },
            select: { reserved: true, safetyStock: true }
        })
        expect(current).toBeTruthy()
        const minAllowed = (current?.reserved ?? 0) + (current?.safetyStock ?? 0)
        expect(minAllowed).toBeGreaterThan(0)

        const res = await request(app)
            .post(`/api/admin/inventory/variants/${variantAId}/stock/set`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ stock: Math.max(minAllowed - 1, 0) })

        expect(res.status).toBe(400)
        expect(String(res.body?.statusMessage || '')).toMatch(/reserved \+ safetyStock/i)
    })

    it('blocks cross-tenant inventory access by scoping queries to tenantId', async () => {
        const listA = await request(app)
            .get('/api/admin/inventory/variants')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)

        expect(listA.status).toBe(200)
        expect(Array.isArray(listA.body)).toBe(true)
        expect(listA.body.some((v: any) => v.id === variantBId)).toBe(false)

        const movesBFromA = await request(app)
            .get(`/api/admin/inventory/variants/${variantBId}/movements`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)

        expect(movesBFromA.status).toBe(404)

        const movesAFromB = await request(app)
            .get(`/api/admin/inventory/variants/${variantAId}/movements`)
            .set('X-Forwarded-Host', hostB)
            .set('Authorization', `Bearer ${tokenB}`)

        // HostB resolves tenantB, tokenB ok, but variantA belongs to tenantA => 404
        expect(movesAFromB.status).toBe(404)

        const adjustCrossTenant = await request(app)
            .post(`/api/admin/inventory/variants/${variantBId}/stock/adjust`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ delta: 1 })

        expect(adjustCrossTenant.status).toBe(404)
    })
})
