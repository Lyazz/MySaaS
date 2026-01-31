import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Admin dashboard API', () => {
    const slugA = `dash-a-${Date.now()}`
    const slugB = `dash-b-${Date.now()}`
    const hostA = `${slugA}.localhost:3000`
    const hostB = `${slugB}.localhost:3000`

    let tenantAId: string
    let tenantBId: string
    let userAId: string
    let userBId: string
    let tokenA: string
    let tokenB: string

    beforeAll(async () => {
        const [tenantA, tenantB] = await prisma.$transaction([
            prisma.tenant.create({ data: { name: 'Dash Tenant A', slug: slugA } }),
            prisma.tenant.create({ data: { name: 'Dash Tenant B', slug: slugB } })
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
            prisma.category.createMany({
                data: [
                    { tenantId: tenantAId, title: 'A Cat 1', slug: `a-cat-1-${Date.now()}` },
                    { tenantId: tenantAId, title: 'A Cat 2', slug: `a-cat-2-${Date.now()}` }
                ]
            }),
            prisma.product.createMany({
                data: [
                    { tenantId: tenantAId, title: 'A Prod 1', slug: `a-prod-1-${Date.now()}`, price: 10, stock: 0 },
                    { tenantId: tenantAId, title: 'A Prod 2', slug: `a-prod-2-${Date.now()}`, price: 10, stock: 3 },
                    { tenantId: tenantAId, title: 'A Prod 3', slug: `a-prod-3-${Date.now()}`, price: 10, stock: 12 }
                ]
            }),
            prisma.order.createMany({
                data: [
                    {
                        tenantId: tenantAId,
                        status: 'PENDING',
                        totalAmount: 150,
                        customerName: 'Customer One',
                        customerPhone: '0550000001'
                    },
                    {
                        tenantId: tenantAId,
                        status: 'CONFIRMED',
                        totalAmount: 200,
                        customerName: 'Customer Two',
                        customerPhone: '0550000002'
                    }
                ]
            })
        ])
    })

    afterAll(async () => {
        await prisma.orderItem.deleteMany({ where: { order: { tenantId: { in: [tenantAId, tenantBId] } } } })
        await prisma.order.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.productVariant.deleteMany({ where: { product: { tenantId: { in: [tenantAId, tenantBId] } } } })
        await prisma.product.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.category.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } })
        await prisma.storeSettings.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } })
    })

    it('returns dashboard data scoped to tenant', async () => {
        const res = await request(app)
            .get('/api/admin/dashboard')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)

        expect(res.status).toBe(200)
        expect(res.body?.counts?.products).toBe(3)
        expect(res.body?.counts?.categories).toBe(2)
        expect(res.body?.counts?.orders).toBe(2)
        expect(res.body?.inventory?.lowStockProducts).toBe(2)
        expect(res.body?.inventory?.outOfStockProducts).toBe(1)
        expect(res.body?.ordersByStatus?.PENDING).toBe(1)
        expect(res.body?.ordersByStatus?.CONFIRMED).toBe(1)
        expect(Array.isArray(res.body?.recentOrders)).toBe(true)
        expect(res.body.recentOrders.length).toBeGreaterThan(0)
    })

    it('blocks cross-tenant access even with a valid token', async () => {
        const res = await request(app)
            .get('/api/admin/dashboard')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenB}`)

        expect(res.status).toBe(403)
    })

    it('blocks tenant A token on tenant B host', async () => {
        const res = await request(app)
            .get('/api/admin/dashboard')
            .set('X-Forwarded-Host', hostB)
            .set('Authorization', `Bearer ${tokenA}`)

        expect(res.status).toBe(403)
    })
})

