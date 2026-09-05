import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

const isoDay = (date: Date) => date.toISOString().slice(0, 10)
const daysAgo = (days: number) => {
    const now = new Date()
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days, 12, 0, 0, 0))
}

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
            prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Dash Tenant A', slug: slugA } }),
            prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Dash Tenant B', slug: slugB } })
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

        const [catA1, catA2] = await prisma.$transaction([
            prisma.category.create({
                data: {
                    tenantId: tenantAId,
                    title: 'Phones',
                    slug: `phones-${slugA}`
                }
            }),
            prisma.category.create({
                data: {
                    tenantId: tenantAId,
                    title: 'Accessories',
                    slug: `acc-${slugA}`
                }
            })
        ])

        const [productA1, productA2] = await prisma.$transaction([
            prisma.product.create({
                data: {
                    tenantId: tenantAId,
                    categoryId: catA1.id,
                    title: 'Phone X',
                    slug: `phone-x-${slugA}`,
                    price: 50,
                    stock: 2,
                    lowStockThreshold: 5
                }
            }),
            prisma.product.create({
                data: {
                    tenantId: tenantAId,
                    categoryId: catA2.id,
                    title: 'Case Pro',
                    slug: `case-pro-${slugA}`,
                    price: 40,
                    stock: 30,
                    lowStockThreshold: 5
                }
            })
        ])

        const orderARecentIncluded = await prisma.order.create({
            data: {
                tenantId: tenantAId,
                status: 'PENDING',
                totalAmount: 150,
                customerName: 'Customer One',
                customerPhone: '0550000001',
                createdAt: daysAgo(2)
            }
        })

        const orderACancelled = await prisma.order.create({
            data: {
                tenantId: tenantAId,
                status: 'CANCELLED',
                totalAmount: 200,
                customerName: 'Customer Two',
                customerPhone: '0550000002',
                createdAt: daysAgo(1)
            }
        })

        const orderARecentIncluded2 = await prisma.order.create({
            data: {
                tenantId: tenantAId,
                status: 'CONFIRMED',
                totalAmount: 100,
                customerName: 'Customer Three',
                customerPhone: '0550000003',
                createdAt: daysAgo(0)
            }
        })

        const orderAReturned = await prisma.order.create({
            data: {
                tenantId: tenantAId,
                status: 'RETURNED',
                totalAmount: 90,
                customerName: 'Customer Four',
                customerPhone: '0550000004',
                createdAt: daysAgo(3)
            }
        })

        const orderAOldIncluded = await prisma.order.create({
            data: {
                tenantId: tenantAId,
                status: 'DELIVERED',
                totalAmount: 300,
                customerName: 'Customer Five',
                customerPhone: '0550000005',
                createdAt: daysAgo(40)
            }
        })

        await prisma.orderItem.createMany({
            data: [
                {
                    tenantId: tenantAId,
                    orderId: orderARecentIncluded.id,
                    productId: productA1.id,
                    quantity: 3,
                    price: 50,
                    lineTotal: 150
                },
                {
                    tenantId: tenantAId,
                    orderId: orderARecentIncluded2.id,
                    productId: productA1.id,
                    quantity: 1,
                    price: 100,
                    lineTotal: 100
                },
                {
                    tenantId: tenantAId,
                    orderId: orderAOldIncluded.id,
                    productId: productA2.id,
                    quantity: 5,
                    price: 60,
                    lineTotal: 300
                },
                {
                    tenantId: tenantAId,
                    orderId: orderACancelled.id,
                    productId: productA1.id,
                    quantity: 2,
                    price: 100,
                    lineTotal: 200
                },
                {
                    tenantId: tenantAId,
                    orderId: orderAReturned.id,
                    productId: productA2.id,
                    quantity: 1,
                    price: 90,
                    lineTotal: 90
                }
            ]
        })

        const saleARecent = await prisma.sale.create({
            data: {
                tenantId: tenantAId,
                source: 'POS',
                status: 'COMPLETED',
                totalAmount: 80,
                customerName: 'Walk-in A',
                customerPhone: '0660000001',
                createdAt: daysAgo(1)
            }
        })

        const saleAOld = await prisma.sale.create({
            data: {
                tenantId: tenantAId,
                source: 'POS',
                status: 'COMPLETED',
                totalAmount: 60,
                customerName: 'Walk-in B',
                customerPhone: '0660000002',
                createdAt: daysAgo(45)
            }
        })

        await prisma.saleItem.createMany({
            data: [
                {
                    tenantId: tenantAId,
                    saleId: saleARecent.id,
                    productId: productA2.id,
                    quantity: 2,
                    price: 40
                },
                {
                    tenantId: tenantAId,
                    saleId: saleAOld.id,
                    productId: productA2.id,
                    quantity: 2,
                    price: 30
                }
            ]
        })

        const tenantBCategory = await prisma.category.create({
            data: {
                tenantId: tenantBId,
                title: 'Tenant B Cat',
                slug: `cat-b-${slugB}`
            }
        })
        const tenantBProduct = await prisma.product.create({
            data: {
                tenantId: tenantBId,
                categoryId: tenantBCategory.id,
                title: 'Tenant B Product',
                slug: `prod-b-${slugB}`,
                price: 99,
                stock: 99,
                lowStockThreshold: 5
            }
        })
        await prisma.order.create({
            data: {
                tenantId: tenantBId,
                status: 'PENDING',
                totalAmount: 99,
                customerName: 'Tenant B Customer',
                customerPhone: '0770000000',
                items: {
                    create: [
                        {
                            productId: tenantBProduct.id,
                            quantity: 1,
                            price: 99,
                            lineTotal: 99
                        }
                    ]
                }
            }
        })
    })

    afterAll(async () => {
        await prisma.saleItem.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.sale.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.orderItem.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.order.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.productVariant.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.productCategory.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.product.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.category.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } })
        await prisma.storeSettings.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } })
    })

    it('returns tenant-scoped dashboard analytics for range=7d', async () => {
        const res = await request(app)
            .get('/api/admin/dashboard')
            .query({ range: '7d' })
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)

        expect(res.status).toBe(200)
        expect(res.body?.period?.range).toBe('7d')
        expect(res.body?.period?.days).toBe(7)
        expect(Array.isArray(res.body?.trends)).toBe(true)
        expect(res.body?.trends?.length).toBe(7)

        expect(res.body?.revenue?.orders).toBe(250)
        expect(res.body?.revenue?.pos).toBe(80)
        expect(res.body?.revenue?.total).toBe(330)

        const ordersCount = (res.body?.trends || []).reduce((sum: number, row: any) => sum + Number(row.ordersCount || 0), 0)
        expect(ordersCount).toBe(2)

        expect(Array.isArray(res.body?.topProducts)).toBe(true)
        expect(res.body.topProducts.length).toBeGreaterThan(0)
        expect(res.body.topProducts[0].title).toBe('Phone X')

        expect(Array.isArray(res.body?.topCategories)).toBe(true)
        expect(res.body.topCategories.length).toBeGreaterThan(0)

        expect(Array.isArray(res.body?.criticalStock)).toBe(true)
        expect(res.body.criticalStock.some((p: any) => p.title === 'Phone X')).toBe(true)

        expect(res.body?.ordersByStatus?.CANCELLED).toBe(1)
        expect(res.body?.ordersByStatus?.RETURNED).toBe(1)
        expect(Array.isArray(res.body?.recentOrders)).toBe(true)
    })

    it('supports 30d, 90d and custom ranges with correct period boundaries', async () => {
        const res30 = await request(app)
            .get('/api/admin/dashboard')
            .query({ range: '30d' })
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)

        expect(res30.status).toBe(200)
        expect(res30.body?.period?.range).toBe('30d')
        expect(res30.body?.period?.days).toBe(30)
        expect(res30.body?.revenue?.orders).toBe(250)
        expect(res30.body?.revenue?.pos).toBe(80)
        expect(res30.body?.revenue?.total).toBe(330)

        const resToday = await request(app)
            .get('/api/admin/dashboard')
            .query({ range: 'today' })
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)

        expect(resToday.status).toBe(200)
        expect(resToday.body?.period?.range).toBe('today')
        expect(resToday.body?.period?.days).toBe(1)
        expect(resToday.body?.trends?.length).toBe(1)

        const res90 = await request(app)
            .get('/api/admin/dashboard')
            .query({ range: '90d' })
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)

        expect(res90.status).toBe(200)
        expect(res90.body?.period?.range).toBe('90d')
        expect(res90.body?.period?.days).toBe(90)
        expect(res90.body?.revenue?.orders).toBe(550)
        expect(res90.body?.revenue?.pos).toBe(140)
        expect(res90.body?.revenue?.total).toBe(690)

        const from = isoDay(daysAgo(2))
        const to = isoDay(daysAgo(1))

        const resCustom = await request(app)
            .get('/api/admin/dashboard')
            .query({ range: 'custom', from, to })
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)

        expect(resCustom.status).toBe(200)
        expect(resCustom.body?.period?.range).toBe('custom')
        expect(resCustom.body?.period?.days).toBe(2)
        expect(resCustom.body?.period?.from).toBe(from)
        expect(resCustom.body?.period?.to).toBe(to)
        expect(resCustom.body?.revenue?.orders).toBe(150)
        expect(resCustom.body?.revenue?.pos).toBe(80)
        expect(resCustom.body?.revenue?.total).toBe(230)
        expect(resCustom.body?.trends?.length).toBe(2)
    })

    it('returns 400 for invalid custom-range payloads', async () => {
        const missingCustomDates = await request(app)
            .get('/api/admin/dashboard')
            .query({ range: 'custom', from: isoDay(daysAgo(1)) })
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
        expect(missingCustomDates.status).toBe(400)

        const invalidDate = await request(app)
            .get('/api/admin/dashboard')
            .query({ range: 'custom', from: 'not-a-date', to: isoDay(daysAgo(1)) })
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
        expect(invalidDate.status).toBe(400)

        const reversedDates = await request(app)
            .get('/api/admin/dashboard')
            .query({ range: 'custom', from: isoDay(daysAgo(0)), to: isoDay(daysAgo(2)) })
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
        expect(reversedDates.status).toBe(400)

        const tooLargeWindow = await request(app)
            .get('/api/admin/dashboard')
            .query({ range: 'custom', from: '2023-01-01', to: '2025-01-01' })
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
        expect(tooLargeWindow.status).toBe(400)
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
