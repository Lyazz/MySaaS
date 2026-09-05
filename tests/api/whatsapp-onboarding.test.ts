import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

/**
 * Connecting and managing a WhatsApp Business account.
 *
 * Nothing here reaches Meta: the cases stop at the platform configuration and
 * the payload validation, which is where a seller's mistakes actually land.
 */
describe('WhatsApp onboarding API', () => {
    const slug = `wa-onb-${Date.now()}`
    const hostHeader = `${slug}.localhost:3000`

    let tenantId: string
    let adminToken: string

    const originalEnv = {
        appId: process.env.META_APP_ID,
        appSecret: process.env.META_APP_SECRET,
        configId: process.env.META_WA_CONFIG_ID
    }

    const clearSignupEnv = () => {
        delete process.env.META_APP_ID
        delete process.env.META_APP_SECRET
        delete process.env.META_WA_CONFIG_ID
    }

    const setSignupEnv = () => {
        process.env.META_APP_ID = 'app-id'
        process.env.META_APP_SECRET = 'app-secret'
        process.env.META_WA_CONFIG_ID = 'config-id'
    }

    const connectIntegration = () =>
        prisma.tenantIntegration.upsert({
            where: { tenantId_provider: { tenantId, provider: 'WHATSAPP' } },
            create: {
                tenantId,
                provider: 'WHATSAPP',
                isActive: true,
                config: {
                    wabaId: 'waba-1',
                    phoneNumberId: 'pn-1',
                    accessToken: 'token',
                    autoSendEnabled: true,
                    remindersEnabled: true
                }
            },
            update: {
                isActive: true,
                config: {
                    wabaId: 'waba-1',
                    phoneNumberId: 'pn-1',
                    accessToken: 'token',
                    autoSendEnabled: true,
                    remindersEnabled: true
                }
            }
        })

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'WA Onboarding', slug } })
        tenantId = tenant.id

        const admin = await prisma.user.create({
            data: { tenantId, email: `admin-${slug}@example.com`, role: 'admin', passwordHash: 'x' }
        })
        adminToken = signAccessToken({
            userId: admin.id,
            email: admin.email,
            role: admin.role,
            tenantId: admin.tenantId
        })
    })

    afterEach(() => {
        clearSignupEnv()
        if (originalEnv.appId) process.env.META_APP_ID = originalEnv.appId
        if (originalEnv.appSecret) process.env.META_APP_SECRET = originalEnv.appSecret
        if (originalEnv.configId) process.env.META_WA_CONFIG_ID = originalEnv.configId
    })

    afterAll(async () => {
        await prisma.tenantIntegration.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    const post = (path: string, body?: unknown) =>
        request(app)
            .post(path)
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(body as any)

    const patch = (path: string, body: unknown) =>
        request(app)
            .patch(path)
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(body as any)

    const get = (path: string) =>
        request(app).get(path).set('X-Forwarded-Host', hostHeader).set('Authorization', `Bearer ${adminToken}`)

    it('tells the admin when the platform has no Meta app configured', async () => {
        clearSignupEnv()

        const status = await get('/api/admin/whatsapp/status')
        expect(status.body.signup).toMatchObject({ available: false })

        const res = await post('/api/admin/whatsapp/connect', { code: 'x', wabaId: 'w', phoneNumberId: 'p' })
        expect(res.status).toBe(503)
    })

    it('exposes the sign-up ids the browser needs, and no secret', async () => {
        setSignupEnv()

        const res = await get('/api/admin/whatsapp/status')
        expect(res.body.signup).toMatchObject({ appId: 'app-id', configId: 'config-id', available: true })
        expect(JSON.stringify(res.body)).not.toContain('app-secret')
    })

    it('refuses an incomplete sign-up payload before calling Meta', async () => {
        setSignupEnv()

        const res = await post('/api/admin/whatsapp/connect', { code: 'code-only' })
        expect(res.status).toBe(400)
        expect(res.body.message).toContain('required')
    })

    it('toggles auto-send and reminders without touching the credentials', async () => {
        await connectIntegration()

        const res = await patch('/api/admin/whatsapp/settings', { autoSendEnabled: false })
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({ autoSendEnabled: false, remindersEnabled: true })

        const stored = await prisma.tenantIntegration.findUnique({
            where: { tenantId_provider: { tenantId, provider: 'WHATSAPP' } }
        })
        expect((stored?.config as any).accessToken).toBe('token')
        expect((stored?.config as any).autoSendEnabled).toBe(false)

        const status = await get('/api/admin/whatsapp/status')
        expect(status.body).toMatchObject({ autoSendEnabled: false, canSend: false })
    })

    it('refuses to configure a store with no connected account', async () => {
        await prisma.tenantIntegration.deleteMany({ where: { tenantId, provider: 'WHATSAPP' } })

        const res = await patch('/api/admin/whatsapp/settings', { autoSendEnabled: true })
        expect(res.status).toBe(404)
    })

    it('disconnects by dropping the credentials', async () => {
        await connectIntegration()

        const res = await post('/api/admin/whatsapp/disconnect')
        expect(res.status).toBe(200)

        const stored = await prisma.tenantIntegration.findUnique({
            where: { tenantId_provider: { tenantId, provider: 'WHATSAPP' } }
        })
        expect(stored?.isActive).toBe(false)
        expect((stored?.config as any).accessToken).toBeUndefined()

        const status = await get('/api/admin/whatsapp/status')
        expect(status.body).toMatchObject({ connected: false, canSend: false })
    })

    it('cannot sync templates for a store with no connected account', async () => {
        await prisma.tenantIntegration.deleteMany({ where: { tenantId, provider: 'WHATSAPP' } })

        const res = await post('/api/admin/whatsapp/templates/sync')
        expect(res.status).toBe(404)
    })
})
