import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Store maintenance mode enforcement', () => {
    const slug = `maintenance-${Date.now()}`
    const host = `${slug}.localhost:3000`

    let tenantId: string
    let userId: string
    let token: string

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({ data: { name: 'Maintenance Tenant', slug, isOffline: false } })
        tenantId = tenant.id

        const user = await prisma.user.create({
            data: { tenantId, email: `maintenance-admin-${Date.now()}@example.com`, role: 'admin', passwordHash: 'x' }
        })
        userId = user.id
        token = signAccessToken({ userId: userId, email: user.email, role: user.role, tenantId: user.tenantId })
    })

    afterAll(async () => {
        await prisma.storeSettings.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { id: userId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    it('allows the public storefront API while maintenance mode is off', async () => {
        const res = await request(app).get('/api/products').set('X-Forwarded-Host', host)
        expect(res.status).toBe(200)
    })

    it('blocks the public storefront API once maintenance mode is enabled', async () => {
        const patch = await request(app)
            .patch('/api/admin/store-settings')
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)
            .send({ maintenanceMode: true })
        expect(patch.status).toBe(200)

        const res = await request(app).get('/api/products').set('X-Forwarded-Host', host)
        expect(res.status).toBe(503)
    })

    it('still allows the tenant admin API while maintenance mode is enabled', async () => {
        const res = await request(app)
            .get('/api/admin/store-settings')
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(200)
        expect(res.body.maintenanceMode).toBe(true)
    })

    it('unblocks the public storefront API once maintenance mode is disabled', async () => {
        const patch = await request(app)
            .patch('/api/admin/store-settings')
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)
            .send({ maintenanceMode: false })
        expect(patch.status).toBe(200)

        const res = await request(app).get('/api/products').set('X-Forwarded-Host', host)
        expect(res.status).toBe(200)
    })
})
