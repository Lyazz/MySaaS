import { describe, it, expect } from 'vitest'
import request from 'supertest'
import prisma from '../backend/src/lib/prisma'
import app from '../backend/src/app'
import { signAccessToken } from '../backend/src/lib/jwt'

describe('Store Settings API', () => {
    let tenantId: string
    let userId: string
    let token: string
    const slug = `settings-test-${Date.now()}`

    it('sets up a tenant for settings test', async () => {
        const res = await request(app).post('/api/register').send({
            name: 'Settings Test Tenant',
            slug,
            email: `admin-${slug}@example.com`,
            password: 'password123'
        })
        expect(res.status).toBe(200)
        tenantId = res.body.tenant.id
        const user = await prisma.user.findFirst({ where: { tenantId } })
        userId = user!.id
        token = signAccessToken({ userId })
    })

    it('updates logo and favicon successfully', async () => {
        const logoUrl = 'http://example.com/logo.png'
        const faviconUrl = 'http://example.com/favicon.ico'

        const res = await request(app)
            .patch('/api/admin/store-settings')
            .set('host', `${slug}.localhost`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                logoUrl,
                faviconUrl,
                name: 'Updated Name',
                slug: slug,
                primaryColor: '#0F766E',
                templateKey: 'modern'
            })

        if (res.status !== 200) {
            console.log('Update Settings Failed:', res.status, res.body)
        }
        expect(res.status).toBe(200)
        expect(res.body.logoUrl).toBe(logoUrl)
        expect(res.body.faviconUrl).toBe(faviconUrl)

        // Verify in DB
        const settings = await prisma.storeSettings.findUnique({
            where: { tenantId }
        })
        expect(settings?.logoUrl).toBe(logoUrl)
        expect(settings?.faviconUrl).toBe(faviconUrl)
    })

    it('fails with invalid faviconUrl type', async () => {
        const res = await request(app)
            .patch('/api/admin/store-settings')
            .set('host', `${slug}.localhost`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                faviconUrl: 123 // Should be string
            })

        expect(res.status).toBe(400)
    })

    it('cleanups', async () => {
        if (tenantId) {
            await prisma.storeSettings.deleteMany({ where: { tenantId } })
            await prisma.user.deleteMany({ where: { tenantId } })
            await prisma.tenant.delete({ where: { id: tenantId } })
        }
    })
})
