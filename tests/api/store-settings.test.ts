import { describe, it, expect } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils'
import prisma from '../../backend/src/lib/prisma'
import jwt from 'jsonwebtoken'

describe('Store Settings (Tenant Admin)', async () => {
    await setup({ setupTimeout: 900_000, teardownTimeout: 900_000 })

    const slugA = `settings-a-${Date.now()}`
    const emailA = `owner-${slugA}@example.com`
    const slugB = `settings-b-${Date.now()}`
    const emailB = `owner-${slugB}@example.com`

    let tokenA = ''
    let tokenB = ''

    it('creates default store settings on tenant registration', async () => {
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

        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.success).toBe(true)

        const user = await prisma.user.findFirst({ where: { email: emailA } })
        expect(user).toBeTruthy()

        const secret = process.env.JWT_SECRET!
        tokenA = jwt.sign({ userId: user!.id }, secret, { expiresIn: '1h' })

        const settings = await prisma.storeSettings.findUnique({ where: { tenantId: user!.tenantId } })
        expect(settings).toBeTruthy()
        expect(settings?.isCompleted).toBe(false)
    })

    it('allows tenant admin to read/update store settings (SaaS host)', async () => {
        const getRes = await fetch('/api/admin/store-settings', {
            headers: {
                Authorization: `Bearer ${tokenA}`
            }
        })
        const getBody = await getRes.json()
        expect(getRes.status).toBe(200)
        expect(getBody).toHaveProperty('tenantId')
        expect(getBody.isCompleted).toBe(false)
        expect(getBody).toHaveProperty('cartEnabled')
        expect(getBody).toHaveProperty('codEnabled')
        expect(getBody).toHaveProperty('currencyCode')
        expect(getBody).toHaveProperty('currencyCountry')

        const patchRes = await fetch('/api/admin/store-settings', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${tokenA}`
            },
            body: JSON.stringify({
                primaryColor: '#112233',
                templateKey: 'modern',
                language: 'ar',
                cartEnabled: false,
                codEnabled: false,
                currencyCode: 'EUR',
                currencyCountry: 'FR',
                isCompleted: true
            })
        })
        const patchBody = await patchRes.json()
        expect(patchRes.status).toBe(200)
        expect(patchBody.primaryColor).toBe('#112233'.toUpperCase())
        expect(patchBody.templateKey).toBe('modern')
        expect(patchBody.language).toBe('ar')
        expect(patchBody.cartEnabled).toBe(false)
        expect(patchBody.codEnabled).toBe(false)
        expect(patchBody.currencyCode).toBe('EUR')
        expect(patchBody.currencyCountry).toBe('FR')

        expect(patchBody.isCompleted).toBe(true)
    })

    it('denies cross-tenant access when host tenant mismatches token tenant', async () => {
        // Create tenant B
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Store B',
                slug: slugB,
                email: emailB,
                password: 'password123'
            })
        })
        expect(res.status).toBe(200)

        const userB = await prisma.user.findFirst({ where: { email: emailB } })
        expect(userB).toBeTruthy()
        const secret = process.env.JWT_SECRET!
        tokenB = jwt.sign({ userId: userB!.id }, secret, { expiresIn: '1h' })

        // Token A trying to access tenant B via tenant host
        const crossRes = await fetch('/api/admin/store-settings', {
            headers: {
                'X-Forwarded-Host': `${slugB}.localhost:3000`,
                Authorization: `Bearer ${tokenA}`
            }
        })
        const crossBody = await crossRes.json()
        expect(crossRes.status).toBe(403)
        expect(crossBody.statusMessage).toContain('different tenant')
    })

    it('returns a frontend-agent summary markdown', async () => {
        const res = await fetch('/api/admin/store-settings/agent-summary', {
            headers: {
                Authorization: `Bearer ${tokenA}`
            }
        })
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body).toHaveProperty('markdown')
        expect(typeof body.markdown).toBe('string')
        expect(body.markdown).toContain('Store Settings (Chosen)')
    })

    it('serves public store settings on tenant host', async () => {
        const res = await fetch('/api/store/settings', {
            headers: {
                'X-Forwarded-Host': `${slugA}.localhost:3000`
            }
        })
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.tenant.slug).toBe(slugA)
        expect(body.storeSettings).toHaveProperty('templateKey')
    })

    it('cleanups', async () => {
        const tenants = await prisma.tenant.findMany({
            where: { slug: { in: [slugA, slugB] } },
            select: { id: true }
        })
        const tenantIds = tenants.map((t) => t.id)
        if (tenantIds.length) {
            await prisma.storeSettings.deleteMany({ where: { tenantId: { in: tenantIds } } })
            await prisma.user.deleteMany({ where: { tenantId: { in: tenantIds } } })
            await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } })
        }
    })
})
