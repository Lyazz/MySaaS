import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Loyalty points flows', () => {
    const slug = `loyalty-${Date.now()}`
    const host = `${slug}.localhost:3000`
    let tenantId: string
    let adminToken: string
    let customerId: string
    let productId: string
    let productSlug: string
    let variantId: string
    let cashboxId: string

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({
            data: { name: 'Loyalty Tenant', slug }
        })
        tenantId = tenant.id

        const admin = await prisma.user.create({
            data: {
                tenantId,
                email: `admin-${slug}@example.com`,
                role: 'admin',
                passwordHash: 'x'
            }
        })
        adminToken = signAccessToken({ userId: admin.id, email: admin.email, role: admin.role, tenantId: admin.tenantId })

        await prisma.storeSettings.create({
            data: {
                tenantId,
                cartEnabled: true,
                codEnabled: true,
                minimumOrderAmountDzd: 0,
                hideOptionalAddress: true,
                loyaltyEnabled: true,
                loyaltyBasePoints: 2,
                loyaltyMarginFactor: 0.1,
                loyaltyMinRedeemPoints: 50,
                loyaltyRedeemRateDzdPerPoint: 1
            }
        })

        const customer = await prisma.customer.create({
            data: {
                tenantId,
                name: 'Loyalty Customer',
                phone: '0550123456',
                phoneRaw: '0550123456',
                phoneNormalized: '213550123456'
            }
        })
        customerId = customer.id

        await prisma.customerPointsLedger.create({
            data: {
                tenantId,
                customerId,
                direction: 'EARN',
                status: 'AVAILABLE',
                sourceType: 'MANUAL',
                sourceId: `seed-${Date.now()}`,
                points: 200
            }
        })

        productSlug = `loyalty-product-${Date.now()}`
        const product = await prisma.product.create({
            data: {
                tenantId,
                title: 'Loyalty Product',
                slug: productSlug,
                price: 100,
                stock: 20,
                isActive: true
            }
        })
        productId = product.id

        const variant = await prisma.productVariant.create({
            data: {
                tenantId,
                productId,
                sku: `LOYALTY-${Date.now()}`,
                price: 100,
                cost: 40,
                stock: 20
            }
        })
        variantId = variant.id

        const cashbox = await prisma.cashbox.create({
            data: { tenantId, name: `CB-${Date.now()}`, isActive: true }
        })
        cashboxId = cashbox.id

        await prisma.cashSession.create({
            data: { tenantId, cashboxId, status: 'OPEN', openingFloat: 0 }
        })
    })

    afterAll(async () => {
        await prisma.customerPointsLedger.deleteMany({ where: { tenantId } })
        await prisma.customerPayment.deleteMany({ where: { tenantId } })
        await prisma.cashTransaction.deleteMany({ where: { tenantId } })
        await prisma.cashSession.deleteMany({ where: { tenantId } })
        await prisma.cashbox.deleteMany({ where: { tenantId } })
        await prisma.saleItem.deleteMany({ where: { sale: { tenantId } } })
        await prisma.sale.deleteMany({ where: { tenantId } })
        await prisma.orderItem.deleteMany({ where: { order: { tenantId } } })
        await prisma.order.deleteMany({ where: { tenantId } })
        await prisma.productVariant.deleteMany({ where: { tenantId } })
        await prisma.product.deleteMany({ where: { tenantId } })
        await prisma.storeSettings.deleteMany({ where: { tenantId } })
        await prisma.customer.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    it('reserves redemption on checkout and consumes it only on delivered order', async () => {
        const created = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', host)
            .send({
                customerName: 'Loyalty Customer',
                customerPhone: '+XX X XXX XXXX',
                customerAddress: 'Hydra',
                shippingAmount: 20,
                shippingCurrency: 'DZD',
                redeemPointsRequested: 50,
                items: [{ productId, variantId, quantity: 1 }]
            })

        expect(created.status).toBe(201)
        expect(created.body.loyaltySummary?.basePointsToEarn).toBe(2)
        expect(created.body.loyaltySummary?.productPointsToEarn).toBe(6)
        expect(created.body.loyaltySummary?.totalPointsToEarn).toBe(8)
        expect(created.body.loyaltySummary?.redeemedPoints).toBe(50)
        expect(created.body.loyaltySummary?.redeemedAmount).toBe(50)

        const orderId = created.body.orderId as string
        const pendingRedeem = await prisma.customerPointsLedger.findFirst({
            where: { tenantId, orderId, direction: 'REDEEM' }
        })
        expect(pendingRedeem?.status).toBe('PENDING')

        await request(app)
            .patch(`/api/admin/orders/${orderId}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'CONFIRMED' })
            .expect(200)

        await request(app)
            .patch(`/api/admin/orders/${orderId}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'SHIPPED' })
            .expect(200)

        await request(app)
            .patch(`/api/admin/orders/${orderId}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'DELIVERED', cashboxId })
            .expect(200)

        const consumedRedeem = await prisma.customerPointsLedger.findFirst({
            where: { tenantId, orderId, direction: 'REDEEM' }
        })
        const earned = await prisma.customerPointsLedger.findFirst({
            where: { tenantId, saleId: orderId, direction: 'EARN' }
        })

        expect(consumedRedeem?.status).toBe('CONSUMED')
        expect(earned?.status).toBe('AVAILABLE')
        expect(earned?.points).toBe(8)
    })

    it('returns a public product loyalty preview with base and product points only', async () => {
        const response = await request(app)
            .get(`/api/products/${productSlug}`)
            .set('X-Forwarded-Host', host)

        expect(response.status).toBe(200)
        expect(response.body.loyaltyPreview).toMatchObject({
            enabled: true,
            basePoints: 2,
            productPoints: 6,
            totalPoints: 8
        })
        expect(response.body.loyaltyPreview).not.toHaveProperty('estimatedPoints')
        expect(response.body.loyaltyPreview).not.toHaveProperty('formulaBreakdown')
        expect(response.body.variants[0].loyaltyPreview).toMatchObject({
            basePoints: 2,
            productPoints: 6,
            totalPoints: 8
        })
        expect(response.body.variants[0]).not.toHaveProperty('cost')
    })

    it('returns checkout loyalty summary with balance and earn breakdown', async () => {
        const response = await request(app)
            .post('/api/orders/loyalty/summary')
            .set('X-Forwarded-Host', host)
            .send({
                customerPhone: '0550 12 34 56',
                redeemPointsRequested: 50,
                items: [{ productId, variantId, quantity: 1 }]
            })

        expect(response.status).toBe(200)
        expect(response.body.availablePoints).toBe(150)
        expect(response.body.pendingRedeemPoints).toBe(50)
        expect(response.body.basePointsToEarn).toBe(2)
        expect(response.body.productPointsToEarn).toBe(6)
        expect(response.body.totalPointsToEarn).toBe(8)
        expect(response.body.redeemedPoints).toBe(50)
        expect(response.body.redeemedAmount).toBe(50)
    })

    it('credits POS sale points once for a known customer', async () => {
        const response = await request(app)
            .post('/api/admin/sales')
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                customerId,
                items: [{ productId, variantId, quantity: 2 }]
            })

        expect(response.status).toBe(201)
        expect(response.body.sale?.earnedPointsTotal).toBe(16)

        const ledgerRow = await prisma.customerPointsLedger.findFirst({
            where: {
                tenantId,
                saleId: response.body.saleId,
                direction: 'EARN',
                sourceType: 'SALE'
            }
        })
        expect(ledgerRow?.points).toBe(16)
    })
})
