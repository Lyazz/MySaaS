import request from 'supertest'
import bcrypt from 'bcryptjs'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'
import { ProductsService } from '../../backend/src/modules/products/products.service'

describe('Security hardening', () => {
    const productsService = new ProductsService()
    const stamp = Date.now()
    const authSlug = `security-auth-${stamp}`
    const orderSlug = `security-order-${stamp}`
    const webhookSlug = `security-hook-${stamp}`

    const authHost = `${authSlug}.localhost:3000`
    const orderHost = `${orderSlug}.localhost:3000`
    const webhookHost = `${webhookSlug}.localhost:3000`

    const authEmail = `security-${stamp}@example.com`

    let authTenantId = ''
    let authUserId = ''
    let authToken = ''

    let orderTenantId = ''
    let orderProductId = ''

    let webhookTenantId = ''
    const webhookSecret = `secret-${stamp}`

    beforeAll(async () => {
        const authTenant = await prisma.tenant.create({
            data: { name: 'Security Auth Tenant', slug: authSlug }
        })
        authTenantId = authTenant.id

        const authUser = await prisma.user.create({
            data: {
                tenantId: authTenantId,
                email: authEmail,
                role: 'owner',
                passwordHash: await bcrypt.hash('Password123!', 10)
            }
        })
        authUserId = authUser.id
        authToken = signAccessToken({
            userId: authUser.id,
            email: authUser.email,
            role: authUser.role,
            tenantId: authUser.tenantId
        })

        const orderTenant = await prisma.tenant.create({
            data: { name: 'Security Order Tenant', slug: orderSlug }
        })
        orderTenantId = orderTenant.id

        await prisma.storeSettings.create({
            data: {
                tenantId: orderTenantId,
                cartEnabled: true,
                codEnabled: true
            }
        })

        const product = await prisma.product.create({
            data: {
                tenantId: orderTenantId,
                title: 'Security Product',
                slug: `security-product-${stamp}`,
                price: 199,
                stock: 500,
                isActive: true
            }
        })
        orderProductId = product.id

        const webhookTenant = await prisma.tenant.create({
            data: { name: 'Security Hook Tenant', slug: webhookSlug }
        })
        webhookTenantId = webhookTenant.id

        await prisma.tenantDeliveryAccount.create({
            data: {
                tenantId: webhookTenantId,
                provider: 'MAYSTRO',
                isActive: true,
                config: {
                    webhookSecret
                }
            }
        })
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    afterAll(async () => {
        await prisma.orderItem.deleteMany({ where: { tenantId: orderTenantId } })
        await prisma.order.deleteMany({ where: { tenantId: orderTenantId } })
        await prisma.productVariant.deleteMany({ where: { tenantId: orderTenantId } })
        await prisma.product.deleteMany({ where: { tenantId: orderTenantId } })
        await prisma.storeSettings.deleteMany({ where: { tenantId: orderTenantId } })

        await prisma.tenantDeliveryAccount.deleteMany({ where: { tenantId: webhookTenantId } })

        await prisma.user.deleteMany({ where: { tenantId: authTenantId } })

        await prisma.tenant.deleteMany({
            where: {
                id: {
                    in: [authTenantId, orderTenantId, webhookTenantId].filter(Boolean)
                }
            }
        })
    })

    it('sets secure API headers with Helmet', async () => {
        const res = await request(app).get('/api/hello')

        expect(res.status).toBe(200)
        expect(res.headers['x-frame-options']).toBe('DENY')
        expect(res.headers['x-content-type-options']).toBe('nosniff')
        expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    })

    it('rejects invalid registration email format', async () => {
        const res = await request(app)
            .post('/api/register')
            .set('Host', 'localhost:3000')
            .set('X-Forwarded-Host', 'localhost:3000')
            .send({
                name: 'Invalid Email Tenant',
                slug: `invalid-email-${stamp}`,
                email: 'not-an-email',
                password: 'Password123!'
            })

        expect(res.status).toBe(400)
        expect(res.body.statusMessage).toContain('Invalid email format')
    })

    it('rejects short registration passwords', async () => {
        const res = await request(app)
            .post('/api/register')
            .set('Host', 'localhost:3000')
            .set('X-Forwarded-Host', 'localhost:3000')
            .send({
                name: 'Weak Password Tenant',
                slug: `weak-password-${stamp}`,
                email: `weak-password-${stamp}@example.com`,
                password: 'short'
            })

        expect(res.status).toBe(400)
        expect(String(res.body.statusMessage)).toContain('at least')
    })

    it('rate-limits repeated login attempts', async () => {
        const ip = '203.0.113.10'

        for (let i = 0; i < 10; i++) {
            const res = await request(app)
                .post('/api/login')
                .set('Host', authHost)
                .set('X-Forwarded-Host', authHost)
                .set('X-Forwarded-For', ip)
                .send({ email: authEmail, password: 'wrong-password' })

            expect(res.status).toBe(401)
        }

        const blocked = await request(app)
            .post('/api/login')
            .set('Host', authHost)
            .set('X-Forwarded-Host', authHost)
            .set('X-Forwarded-For', ip)
            .send({ email: authEmail, password: 'wrong-password' })

        expect(blocked.status).toBe(429)
        expect(String(blocked.body.statusMessage)).toContain('Too many login attempts')
    })

    it('normalizes missing-user login path with bcrypt.compare', async () => {
        const compareSpy = vi.spyOn(bcrypt, 'compare')

        const res = await request(app)
            .post('/api/login')
            .set('Host', authHost)
            .set('X-Forwarded-Host', authHost)
            .set('X-Forwarded-For', '203.0.113.11')
            .send({ email: `missing-${stamp}@example.com`, password: 'wrong-password' })

        expect(res.status).toBe(401)
        expect(compareSpy).toHaveBeenCalledTimes(1)
    })

    it('revokes prior access token on logout', async () => {
        const meBefore = await request(app)
            .get('/api/me')
            .set('Host', authHost)
            .set('X-Forwarded-Host', authHost)
            .set('Authorization', `Bearer ${authToken}`)

        expect(meBefore.status).toBe(200)

        const logout = await request(app)
            .post('/api/logout')
            .set('Host', authHost)
            .set('X-Forwarded-Host', authHost)
            .set('Authorization', `Bearer ${authToken}`)

        expect(logout.status).toBe(200)
        expect(logout.body.success).toBe(true)

        const meAfter = await request(app)
            .get('/api/me')
            .set('Host', authHost)
            .set('X-Forwarded-Host', authHost)
            .set('Authorization', `Bearer ${authToken}`)

        expect(meAfter.status).toBe(401)
    })

    it('keeps normal order creation working while enforcing order rate limits', async () => {
        const ip = '203.0.113.12'

        const firstOrder = await request(app)
            .post('/api/orders')
            .set('Host', orderHost)
            .set('X-Forwarded-Host', orderHost)
            .set('X-Forwarded-For', ip)
            .send({
                customerName: 'Rate Limit Buyer',
                customerPhone: '0550123456',
                deliveryMode: 'home',
                shippingWilayaCode: '16',
                shippingCommuneCode: 'Algiers',
                shippingServiceLevel: 'home',
                items: [{ productId: orderProductId, quantity: 1 }]
            })

        expect(firstOrder.status).toBe(201)

        for (let i = 0; i < 29; i++) {
            const invalid = await request(app)
                .post('/api/orders')
                .set('Host', orderHost)
                .set('X-Forwarded-Host', orderHost)
                .set('X-Forwarded-For', ip)
                .send({
                    customerName: 'Rate Limit Buyer',
                    items: []
                })

            expect([400, 422]).toContain(invalid.status)
        }

        const blocked = await request(app)
            .post('/api/orders')
            .set('Host', orderHost)
            .set('X-Forwarded-Host', orderHost)
            .set('X-Forwarded-For', ip)
            .send({
                customerName: 'Rate Limit Buyer',
                items: []
            })

        expect(blocked.status).toBe(429)
        expect(String(blocked.body.statusMessage)).toContain('Too many order attempts')
    })

    it('sanitizes rich text on product write paths', async () => {
        const slug = `unsafe-rich-${stamp}`
        const payload = `<p>Safe paragraph</p><script>alert('xss')</script><a href="javascript:alert(1)">bad link</a>`

        await productsService.createProduct(orderTenantId, {
            title: 'Unsafe Rich Product',
            slug,
            description: payload,
            miniDescription: payload,
            price: 50,
            stock: 3,
            isActive: true
        })

        const saved = await prisma.product.findUnique({
            where: { tenantId_slug: { tenantId: orderTenantId, slug } },
            select: { description: true, miniDescription: true }
        })

        expect(saved?.description || '').toContain('<p>Safe paragraph</p>')
        expect(saved?.description || '').not.toContain('<script')
        expect(saved?.description || '').not.toContain('javascript:')
        expect(saved?.miniDescription || '').not.toContain('<script')
    })

    it('accepts Maystro webhook secret from header or legacy query param', async () => {
        const headerBased = await request(app)
            .post('/api/webhooks/maystro')
            .set('Host', webhookHost)
            .set('X-Forwarded-Host', webhookHost)
            .set('X-Webhook-Secret', webhookSecret)
            .send({})

        expect([200, 202]).toContain(headerBased.status)

        const queryBased = await request(app)
            .post(`/api/webhooks/maystro?secret=${encodeURIComponent(webhookSecret)}`)
            .set('Host', webhookHost)
            .set('X-Forwarded-Host', webhookHost)
            .send({})

        expect([200, 202]).toContain(queryBased.status)

        const wrongSecret = await request(app)
            .post('/api/webhooks/maystro')
            .set('Host', webhookHost)
            .set('X-Forwarded-Host', webhookHost)
            .set('X-Webhook-Secret', 'wrong-secret')
            .send({})

        expect(wrongSecret.status).toBe(401)
    })
})
