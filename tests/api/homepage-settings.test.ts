import { describe, it, expect } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils'
import prisma from '../../backend/src/lib/prisma'
import jwt from 'jsonwebtoken'

describe('Homepage Settings (Tenant Admin + Public)', async () => {
    await setup({ setupTimeout: 900_000, teardownTimeout: 900_000 })

    const slugA = `home-a-${Date.now()}`
    const emailA = `owner-${slugA}@example.com`
    const slugB = `home-b-${Date.now()}`
    const emailB = `owner-${slugB}@example.com`

    let tokenA = ''
    let tenantAId = ''
    let tenantBId = ''

    it('allows tenant admin to read/update homepage settings', async () => {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Store A',
                slug: slugA,
                email: emailA,
                password: 'password123'
            })
        })

        expect(res.status).toBe(200)
        const userA = await prisma.user.findFirst({ where: { email: emailA }, include: { tenant: true } })
        expect(userA).toBeTruthy()
        tenantAId = userA!.tenantId

        const secret = process.env.JWT_SECRET!
        tokenA = jwt.sign({ userId: userA!.id }, secret, { expiresIn: '1h' })

        const getRes = await fetch('/api/admin/homepage-settings', {
            headers: { Authorization: `Bearer ${tokenA}` }
        })
        const getBody = await getRes.json()
        expect(getRes.status).toBe(200)
        expect(getBody).toHaveProperty('homeConfig')
        expect(getBody.homeConfig).toHaveProperty('carousel')
        expect(getBody.homeConfig).toHaveProperty('sections')

        const patchRes = await fetch('/api/admin/homepage-settings', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${tokenA}`
            },
            body: JSON.stringify({
                homeConfig: {
                    ...getBody.homeConfig,
                    carousel: [
                        {
                            title: 'Welcome',
                            subtitle: 'Start shopping',
                            buttonText: 'Shop Now',
                            buttonHref: '/products',
                            imageUrl: 'https://placehold.co/1920x800/0f172a/ffffff?text=Welcome'
                        }
                    ],
                    sections: {
                        ...getBody.homeConfig.sections,
                        bestSellers: {
                            ...getBody.homeConfig.sections.bestSellers,
                            enabled: true,
                            limit: 2
                        }
                    }
                }
            })
        })
        const patchBody = await patchRes.json()
        expect(patchRes.status).toBe(200)
        expect(patchBody.homeConfig.sections.bestSellers.enabled).toBe(true)
        expect(patchBody.homeConfig.sections.bestSellers.limit).toBe(2)

        const settings = await prisma.storeSettings.findUnique({ where: { tenantId: tenantAId } })
        expect(settings?.homeConfig).toBeTruthy()
    })

    it('serves public homepage config + best sellers per tenant', async () => {
        // Tenant B for scoping test
        const resB = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Store B',
                slug: slugB,
                email: emailB,
                password: 'password123'
            })
        })
        expect(resB.status).toBe(200)
        const userB = await prisma.user.findFirst({ where: { email: emailB }, include: { tenant: true } })
        expect(userB).toBeTruthy()
        tenantBId = userB!.tenantId

        // Create products + orders for both tenants
        const productA = await prisma.product.create({
            data: {
                tenantId: tenantAId,
                title: 'A - Best',
                slug: `a-best-${Date.now()}`,
                price: 100,
                stock: 10,
                isActive: true
            }
        })
        const productB = await prisma.product.create({
            data: {
                tenantId: tenantBId,
                title: 'B - Best',
                slug: `b-best-${Date.now()}`,
                price: 100,
                stock: 10,
                isActive: true
            }
        })

        const orderA = await prisma.order.create({
            data: {
                tenantId: tenantAId,
                status: 'CONFIRMED',
                totalAmount: 200,
                customerName: 'Alice',
                customerPhone: '0550000000',
                customerAddress: 'Algiers'
            }
        })
        await prisma.orderItem.create({
            data: {
                tenantId: tenantAId,
                orderId: orderA.id,
                productId: productA.id,
                quantity: 3,
                price: 100
            }
        })

        const orderB = await prisma.order.create({
            data: {
                tenantId: tenantBId,
                status: 'CONFIRMED',
                totalAmount: 200,
                customerName: 'Bob',
                customerPhone: '0660000000',
                customerAddress: 'Oran'
            }
        })
        await prisma.orderItem.create({
            data: {
                tenantId: tenantBId,
                orderId: orderB.id,
                productId: productB.id,
                quantity: 50,
                price: 100
            }
        })

        const resAHome = await fetch('/api/store/homepage', {
            headers: { 'X-Forwarded-Host': `${slugA}.localhost:3000` }
        })
        const bodyAHome = await resAHome.json()
        expect(resAHome.status).toBe(200)
        expect(bodyAHome).toHaveProperty('homeConfig')
        expect(bodyAHome).toHaveProperty('bestSellers')
        expect(Array.isArray(bodyAHome.bestSellers)).toBe(true)
        // Best sellers are enabled for tenant A (from previous test), should include productA and not productB
        const ids = bodyAHome.bestSellers.map((p: any) => p.id)
        expect(ids).toContain(productA.id)
        expect(ids).not.toContain(productB.id)

        const topSeller = bodyAHome.bestSellers.find((p: any) => p.id === productA.id)
        expect(topSeller).toBeTruthy()
        expect(Array.isArray(topSeller.images)).toBe(true)
        expect(topSeller.images[0]).toBe('/blank.svg?v=2')
    })

    it('denies cross-tenant admin access when host tenant mismatches token tenant', async () => {
        const res = await fetch('/api/admin/homepage-settings', {
            headers: {
                'X-Forwarded-Host': `${slugB}.localhost:3000`,
                Authorization: `Bearer ${tokenA}`
            }
        })
        const body = await res.json()
        expect(res.status).toBe(403)
        expect(body.statusMessage).toContain('different tenant')
    })

    it('cleanups', async () => {
        const tenantIds = [tenantAId, tenantBId].filter(Boolean)
        if (tenantIds.length) {
            await prisma.orderItem.deleteMany({ where: { tenantId: { in: tenantIds } } }).catch(() => { })
            await prisma.order.deleteMany({ where: { tenantId: { in: tenantIds } } }).catch(() => { })
            await prisma.product.deleteMany({ where: { tenantId: { in: tenantIds } } }).catch(() => { })
            await prisma.storeSettings.deleteMany({ where: { tenantId: { in: tenantIds } } }).catch(() => { })
            await prisma.user.deleteMany({ where: { tenantId: { in: tenantIds } } }).catch(() => { })
            await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } }).catch(() => { })
        }
    })
})
