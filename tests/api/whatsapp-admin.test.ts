import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

/**
 * The seller-facing side of the integration.
 *
 * Every case here stops before the Cloud API call on purpose: what matters is
 * that a refusal is reported rather than thrown (the admin falls back to wa.me
 * on it), and that one tenant cannot message another tenant's order.
 */
describe('WhatsApp admin API', () => {
    const slug = `wa-admin-${Date.now()}`
    const hostHeader = `${slug}.localhost:3000`

    let tenantId: string
    let otherTenantId: string
    let adminToken: string

    const connect = (tenant: string, overrides: Record<string, unknown> = {}) =>
        prisma.tenantIntegration.upsert({
            where: { tenantId_provider: { tenantId: tenant, provider: 'WHATSAPP' } },
            create: {
                tenantId: tenant,
                provider: 'WHATSAPP',
                isActive: true,
                config: {
                    wabaId: 'waba-1',
                    phoneNumberId: `pn-${tenant}`,
                    displayPhoneNumber: '+213 555 00 00 00',
                    accessToken: 'token',
                    templates: {
                        CONFIRMATION: { name: 'swekly_order_confirmation', languages: { fr: { status: 'APPROVED' } } }
                    },
                    ...overrides
                }
            },
            update: {
                isActive: true,
                config: {
                    wabaId: 'waba-1',
                    phoneNumberId: `pn-${tenant}`,
                    displayPhoneNumber: '+213 555 00 00 00',
                    accessToken: 'token',
                    templates: {
                        CONFIRMATION: { name: 'swekly_order_confirmation', languages: { fr: { status: 'APPROVED' } } }
                    },
                    ...overrides
                }
            }
        })

    const createOrder = (tenant: string, data: Record<string, unknown> = {}) =>
        prisma.order.create({
            data: {
                tenantId: tenant,
                customerName: 'Amine',
                customerPhone: '0550123456',
                totalAmount: 4200,
                status: 'PENDING',
                ...data
            }
        })

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({ data: { name: 'WA Admin', slug } })
        tenantId = tenant.id

        const other = await prisma.tenant.create({ data: { name: 'WA Other', slug: `${slug}-other` } })
        otherTenantId = other.id

        const admin = await prisma.user.create({
            data: { tenantId, email: `admin-${slug}@example.com`, role: 'admin', passwordHash: 'x' }
        })
        adminToken = signAccessToken({
            userId: admin.id,
            email: admin.email,
            role: admin.role,
            tenantId: admin.tenantId
        })

        await prisma.storeSettings.create({ data: { tenantId, language: 'fr' } })
    })

    afterAll(async () => {
        const tenantIds = [tenantId, otherTenantId]
        await prisma.whatsAppMessage.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.order.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.tenantIntegration.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.storeSettings.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.user.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } })
    })

    const get = (path: string) =>
        request(app).get(path).set('X-Forwarded-Host', hostHeader).set('Authorization', `Bearer ${adminToken}`)

    const post = (path: string) =>
        request(app).post(path).set('X-Forwarded-Host', hostHeader).set('Authorization', `Bearer ${adminToken}`)

    it('requires authentication', async () => {
        const res = await request(app).get('/api/admin/whatsapp/status').set('X-Forwarded-Host', hostHeader)
        expect(res.status).toBe(401)
    })

    it('reports a store with no WABA as unable to send', async () => {
        await prisma.tenantIntegration.deleteMany({ where: { tenantId, provider: 'WHATSAPP' } })

        const res = await get('/api/admin/whatsapp/status')
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({ connected: false, canSend: false })
    })

    it('never exposes the access token', async () => {
        await connect(tenantId)

        const res = await get('/api/admin/whatsapp/status')
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({ connected: true, active: true, canSend: true, language: 'fr' })
        expect(JSON.stringify(res.body)).not.toContain('token')
    })

    it('reports a connected store whose template is still under review as unable to send', async () => {
        await connect(tenantId, {
            templates: { CONFIRMATION: { name: 'swekly_order_confirmation', languages: { fr: { status: 'PENDING' } } } }
        })

        const res = await get('/api/admin/whatsapp/status')
        expect(res.body).toMatchObject({ connected: true, canSend: false })

        await connect(tenantId)
    })

    it('refuses to send for an order of another tenant', async () => {
        const foreign = await createOrder(otherTenantId)

        const res = await post(`/api/admin/whatsapp/orders/${foreign.id}/confirmation`)
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({ ok: false, skipped: 'ORDER_NOT_FOUND' })

        const messages = await prisma.whatsAppMessage.count({ where: { orderId: foreign.id } })
        expect(messages).toBe(0)
    })

    it('refuses to chase an order that is no longer pending', async () => {
        const order = await createOrder(tenantId, { status: 'CONFIRMED' })

        const res = await post(`/api/admin/whatsapp/orders/${order.id}/confirmation`)
        expect(res.body).toMatchObject({ ok: false, skipped: 'ORDER_NOT_PENDING' })
    })

    it('refuses a phone number that is not a valid Algerian mobile', async () => {
        const order = await createOrder(tenantId, { customerPhone: '12' })

        const res = await post(`/api/admin/whatsapp/orders/${order.id}/confirmation`)
        expect(res.body).toMatchObject({ ok: false, skipped: 'INVALID_PHONE' })
    })

    it('reports a disconnected integration instead of failing', async () => {
        await prisma.tenantIntegration.deleteMany({ where: { tenantId, provider: 'WHATSAPP' } })
        const order = await createOrder(tenantId)

        const res = await post(`/api/admin/whatsapp/orders/${order.id}/confirmation`)
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({ ok: false, skipped: 'NOT_CONFIGURED' })

        await connect(tenantId)
    })

    it('lists the messages logged for an order, scoped to the tenant', async () => {
        const order = await createOrder(tenantId)
        await prisma.whatsAppMessage.create({
            data: {
                tenantId,
                orderId: order.id,
                kind: 'CONFIRMATION',
                attempt: 0,
                toPhone: '213550123456',
                templateName: 'swekly_order_confirmation',
                languageCode: 'fr',
                status: 'SENT'
            }
        })

        const res = await get(`/api/admin/whatsapp/orders/${order.id}/messages`)
        expect(res.status).toBe(200)
        expect(res.body.messages).toHaveLength(1)
        expect(res.body.messages[0]).toMatchObject({ kind: 'CONFIRMATION', status: 'SENT' })

        const foreign = await createOrder(otherTenantId)
        const empty = await get(`/api/admin/whatsapp/orders/${foreign.id}/messages`)
        expect(empty.body.messages).toHaveLength(0)
    })
})
