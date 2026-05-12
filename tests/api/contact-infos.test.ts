import { describe, it, expect } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils'
import prisma from '../../backend/src/lib/prisma'
import jwt from 'jsonwebtoken'

describe('Contact Infos (Tenant Admin + Public)', async () => {
    await setup({ setupTimeout: 900_000, teardownTimeout: 900_000 })

    const slugA = `contact-a-${Date.now()}`
    const emailA = `owner-${slugA}@example.com`
    const slugB = `contact-b-${Date.now()}`
    const emailB = `owner-${slugB}@example.com`

    let tokenA = ''
    let tokenB = ''
    let tenantIdA = ''
    let tenantIdB = ''

    it('creates and lists contact infos for a tenant (admin)', async () => {
        const register = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Store A', slug: slugA, email: emailA, password: 'password123' })
        })
        expect(register.status).toBe(200)

        const userA = await prisma.user.findFirst({ where: { email: emailA } })
        expect(userA).toBeTruthy()
        tenantIdA = userA!.tenantId

        tokenA = jwt.sign({ userId: userA!.id }, process.env.JWT_SECRET!, { expiresIn: '1h' })

        const created = await fetch('/api/admin/contact-infos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
            body: JSON.stringify({ kind: 'phone', value: '+XX X XXX XXXX', label: 'Support' })
        })
        const createdBody = await created.json()
        expect(created.status).toBe(201)
        expect(createdBody.kind).toBe('phone')
        expect(createdBody).toHaveProperty('iconName')
        expect(createdBody).toHaveProperty('href')

        const list = await fetch('/api/admin/contact-infos', {
            headers: { Authorization: `Bearer ${tokenA}` }
        })
        const listBody = await list.json()
        expect(list.status).toBe(200)
        expect(Array.isArray(listBody.items)).toBe(true)
        expect(listBody.items.length).toBe(1)
        expect(listBody.items[0].tenantId).toBe(tenantIdA)
    })

    it('serves public contact infos on tenant host (active only)', async () => {
        const createEmail = await fetch('/api/admin/contact-infos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
            body: JSON.stringify({ kind: 'email', value: 'contact@store.com', isActive: false })
        })
        expect(createEmail.status).toBe(201)

        const res = await fetch('/api/store/contact-infos', {
            headers: { 'X-Forwarded-Host': `${slugA}.localhost:3000` }
        })
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(Array.isArray(body.items)).toBe(true)
        expect(body.items.length).toBe(1)
        expect(body.items[0].kind).toBe('phone')
    })

    it('denies cross-tenant access when host tenant mismatches token tenant', async () => {
        const register = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Store B', slug: slugB, email: emailB, password: 'password123' })
        })
        expect(register.status).toBe(200)

        const userB = await prisma.user.findFirst({ where: { email: emailB } })
        expect(userB).toBeTruthy()
        tenantIdB = userB!.tenantId

        tokenB = jwt.sign({ userId: userB!.id }, process.env.JWT_SECRET!, { expiresIn: '1h' })

        const cross = await fetch('/api/admin/contact-infos', {
            headers: {
                'X-Forwarded-Host': `${slugB}.localhost:3000`,
                Authorization: `Bearer ${tokenA}`
            }
        })
        const crossBody = await cross.json()
        expect(cross.status).toBe(403)
        expect(crossBody.statusMessage).toContain('different tenant')

        const ok = await fetch('/api/admin/contact-infos', {
            headers: { Authorization: `Bearer ${tokenB}` }
        })
        expect(ok.status).toBe(200)
    })

    it('returns 404 when deleting a missing contact info id', async () => {
        const res = await fetch('/api/admin/contact-infos/__missing__', {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${tokenA}` }
        })
        const body = await res.json()
        expect(res.status).toBe(404)
        expect(body.statusMessage).toContain('not found')
    })

    it('cleanups', async () => {
        const tenantIds = [tenantIdA, tenantIdB].filter(Boolean)
        if (!tenantIds.length) return

        await prisma.tenantContactInfo.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.user.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } })
    })
})
