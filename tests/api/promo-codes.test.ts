import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'
import { OrdersService } from '../../backend/src/modules/orders/orders.service'

describe('Promo codes', () => {
    const slug = `promo-${Date.now()}`
    const hostHeader = `${slug}.localhost:3000`
    const otherSlug = `promo-other-${Date.now()}`

    let tenantId: string
    let otherTenantId: string
    let adminToken: string
    let productId: string
    let variantId: string
    let categoryId: string
    let otherProductId: string
    let otherVariantId: string

    const placeOrder = (body: Record<string, unknown>) =>
        request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', hostHeader)
            .send({
                customerName: 'Promo Buyer',
                customerPhone: '0550333111',
                items: [{ productId, variantId, quantity: 2 }],
                ...body
            })

    const createCode = (data: Record<string, unknown>) =>
        request(app)
            .post('/api/admin/promo-codes')
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(data)

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Promo Tenant', slug } })
        tenantId = tenant.id

        const other = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Promo Other Tenant', slug: otherSlug } })
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

        for (const id of [tenantId, otherTenantId]) {
            await prisma.storeSettings.create({
                data: { tenantId: id, cartEnabled: true, codEnabled: true, minimumOrderAmountDzd: 0, hideOptionalAddress: true }
            })
        }

        const category = await prisma.category.create({
            data: { tenantId, title: 'Promo Category', slug: `promo-cat-${Date.now()}` }
        })
        categoryId = category.id

        // 2 x 1000 = 2000 DZD per order placed by the helper above.
        const product = await prisma.product.create({
            data: { tenantId, title: 'Promo Product', slug: `promo-product-${Date.now()}`, price: 1000, stock: 100, isActive: true }
        })
        productId = product.id
        const variant = await prisma.productVariant.create({
            data: { tenantId, productId, sku: `PROMO-${Date.now()}`, price: 1000, stock: 100 }
        })
        variantId = variant.id

        const otherProduct = await prisma.product.create({
            data: { tenantId, title: 'Other Product', slug: `promo-other-product-${Date.now()}`, price: 500, stock: 100, isActive: true }
        })
        otherProductId = otherProduct.id
        const otherVariant = await prisma.productVariant.create({
            data: { tenantId, productId: otherProductId, sku: `PROMO-OTHER-${Date.now()}`, price: 500, stock: 100 }
        })
        otherVariantId = otherVariant.id
    })

    beforeEach(async () => {
        await prisma.promoCodeRedemption.deleteMany({ where: { tenantId } })
        await prisma.orderItem.deleteMany({ where: { tenantId } })
        await prisma.order.deleteMany({ where: { tenantId } })
        await prisma.promoCode.deleteMany({ where: { tenantId } })
        await prisma.promoCode.deleteMany({ where: { tenantId: otherTenantId } })

        // Deleting the orders does not put the units back. Restock so a test
        // that places a dozen orders does not fail the one that runs after it.
        await prisma.product.updateMany({ where: { tenantId }, data: { stock: 100 } })
        await prisma.productVariant.updateMany({ where: { tenantId }, data: { stock: 100, reserved: 0 } })
    })

    afterAll(async () => {
        for (const id of [tenantId, otherTenantId]) {
            await prisma.promoCodeRedemption.deleteMany({ where: { tenantId: id } })
            await prisma.orderItem.deleteMany({ where: { tenantId: id } })
            await prisma.order.deleteMany({ where: { tenantId: id } })
            await prisma.promoCode.deleteMany({ where: { tenantId: id } })
            await prisma.productCategory.deleteMany({ where: { tenantId: id } })
            await prisma.productVariant.deleteMany({ where: { tenantId: id } })
            await prisma.product.deleteMany({ where: { tenantId: id } })
            await prisma.category.deleteMany({ where: { tenantId: id } })
            await prisma.customerPointsLedger.deleteMany({ where: { tenantId: id } })
            await prisma.customer.deleteMany({ where: { tenantId: id } })
            await prisma.storeSettings.deleteMany({ where: { tenantId: id } })
            await prisma.user.deleteMany({ where: { tenantId: id } })
            await prisma.tenant.delete({ where: { id } })
        }
    })

    describe('admin CRUD', () => {
        it('creates a code, storing it upper-cased', async () => {
            const res = await createCode({ code: ' welcome10 ', discountType: 'PERCENTAGE', discountValue: 10 })

            expect(res.status).toBe(201)
            expect(res.body.code).toBe('WELCOME10')
            expect(res.body.discountValue).toBe(10)
            expect(res.body.usedCount).toBe(0)
        })

        it('refuses a duplicate code within the tenant', async () => {
            await createCode({ code: 'DUP', discountType: 'FIXED', discountValue: 100 })
            const res = await createCode({ code: 'dup', discountType: 'FIXED', discountValue: 100 })

            expect(res.status).toBe(409)
            expect(res.body.code).toBe('DUPLICATE_CODE')
        })

        it('lets another tenant own the same code', async () => {
            await createCode({ code: 'SHARED', discountType: 'FIXED', discountValue: 100 })

            const twin = await prisma.promoCode.create({
                data: { tenantId: otherTenantId, code: 'SHARED', discountType: 'FIXED', discountValue: 100 }
            })

            expect(twin.id).toBeTruthy()
        })

        it('refuses a percentage above 100', async () => {
            const res = await createCode({ code: 'TOOMUCH', discountType: 'PERCENTAGE', discountValue: 120 })
            expect(res.status).toBe(400)
        })

        it('refuses a zero discount on a value-based code', async () => {
            const res = await createCode({ code: 'ZERO', discountType: 'FIXED', discountValue: 0 })
            expect(res.status).toBe(400)
        })

        it('refuses an end date before the start date', async () => {
            const res = await createCode({
                code: 'BACKWARDS',
                discountType: 'FIXED',
                discountValue: 100,
                startsAt: '2026-07-01T00:00:00.000Z',
                endsAt: '2026-06-01T00:00:00.000Z'
            })
            expect(res.status).toBe(400)
        })

        it('updates a code', async () => {
            const created = await createCode({ code: 'EDITME', discountType: 'PERCENTAGE', discountValue: 10 })

            const res = await request(app)
                .put(`/api/admin/promo-codes/${created.body.id}`)
                .set('X-Forwarded-Host', hostHeader)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ discountValue: 25, isActive: false })

            expect(res.status).toBe(200)
            expect(res.body.discountValue).toBe(25)
            expect(res.body.isActive).toBe(false)
        })

        it('lists only this tenant\'s codes', async () => {
            await createCode({ code: 'MINE', discountType: 'FIXED', discountValue: 100 })
            await prisma.promoCode.create({
                data: { tenantId: otherTenantId, code: 'THEIRS', discountType: 'FIXED', discountValue: 100 }
            })

            const res = await request(app)
                .get('/api/admin/promo-codes')
                .set('X-Forwarded-Host', hostHeader)
                .set('Authorization', `Bearer ${adminToken}`)

            expect(res.status).toBe(200)
            expect(res.body.items.map((item: any) => item.code)).toEqual(['MINE'])
        })

        it('requires authentication', async () => {
            const res = await request(app)
                .get('/api/admin/promo-codes')
                .set('X-Forwarded-Host', hostHeader)

            expect(res.status).toBe(401)
        })
    })

    describe('public preview', () => {
        const preview = (body: Record<string, unknown>) =>
            request(app)
                .post('/api/orders/promo-code/preview')
                .set('X-Forwarded-Host', hostHeader)
                .send({ items: [{ productId, variantId, quantity: 2 }], ...body })

        it('prices a valid percentage code', async () => {
            await createCode({ code: 'TAKE10', discountType: 'PERCENTAGE', discountValue: 10 })

            const res = await preview({ code: 'take10' })

            expect(res.status).toBe(200)
            expect(res.body.valid).toBe(true)
            expect(res.body.discountAmount).toBe(200)
        })

        it('reports an unknown code without leaking whether it exists', async () => {
            const res = await preview({ code: 'NOPE' })

            expect(res.status).toBe(200)
            expect(res.body.valid).toBe(false)
            expect(res.body.message).toBeTruthy()
        })

        it('refuses an expired code', async () => {
            await prisma.promoCode.create({
                data: {
                    tenantId,
                    code: 'GONE',
                    discountType: 'PERCENTAGE',
                    discountValue: 10,
                    endsAt: new Date(Date.now() - 60_000)
                }
            })

            const res = await preview({ code: 'GONE' })
            expect(res.body.valid).toBe(false)
            expect(res.body.reason).toBe('PROMO_EXPIRED')
        })

        it('refuses a code below its minimum order amount', async () => {
            await createCode({ code: 'BIGCART', discountType: 'FIXED', discountValue: 100, minOrderAmount: 5000 })

            const res = await preview({ code: 'BIGCART' })
            expect(res.body.valid).toBe(false)
            expect(res.body.reason).toBe('PROMO_MIN_ORDER_NOT_MET')
        })

        it('only discounts the products a scoped code names', async () => {
            await createCode({
                code: 'SCOPED',
                discountType: 'PERCENTAGE',
                discountValue: 50,
                productIds: [otherProductId]
            })

            const res = await preview({
                code: 'SCOPED',
                items: [
                    { productId, variantId, quantity: 2 },
                    { productId: otherProductId, variantId: otherVariantId, quantity: 1 }
                ]
            })

            // 50% of the 500 DZD eligible line, not of the 2500 DZD cart.
            expect(res.body.valid).toBe(true)
            expect(res.body.discountAmount).toBe(250)
        })

        it('discounts a category-scoped code through the products in it', async () => {
            await prisma.productCategory.create({ data: { tenantId, productId, categoryId } })
            await createCode({
                code: 'CATSCOPE',
                discountType: 'PERCENTAGE',
                discountValue: 10,
                categoryIds: [categoryId]
            })

            const res = await preview({
                code: 'CATSCOPE',
                items: [
                    { productId, variantId, quantity: 2 },
                    { productId: otherProductId, variantId: otherVariantId, quantity: 1 }
                ]
            })

            expect(res.body.valid).toBe(true)
            expect(res.body.discountAmount).toBe(200)

            await prisma.productCategory.deleteMany({ where: { tenantId, productId, categoryId } })
        })

        it('refuses a scoped code when nothing in the cart matches', async () => {
            await createCode({
                code: 'NOMATCH',
                discountType: 'PERCENTAGE',
                discountValue: 50,
                productIds: [otherProductId]
            })

            const res = await preview({ code: 'NOMATCH' })
            expect(res.body.valid).toBe(false)
            expect(res.body.reason).toBe('PROMO_NOT_APPLICABLE')
        })

        it('does not honour another tenant\'s code', async () => {
            await prisma.promoCode.create({
                data: { tenantId: otherTenantId, code: 'FOREIGN', discountType: 'PERCENTAGE', discountValue: 50 }
            })

            const res = await preview({ code: 'FOREIGN' })
            expect(res.body.valid).toBe(false)
        })
    })

    describe('checkout', () => {
        it('applies the discount to the order and books a redemption', async () => {
            const created = await createCode({ code: 'CHECKOUT10', discountType: 'PERCENTAGE', discountValue: 10 })

            const res = await placeOrder({ promoCode: 'checkout10', shippingAmount: 500 })
            expect(res.status).toBe(201)

            const order = await prisma.order.findUnique({ where: { id: res.body.orderId } })
            expect(Number(order?.totalAmount)).toBe(2000)
            expect(Number(order?.promoDiscountAmount)).toBe(200)
            expect(order?.promoCode).toBe('CHECKOUT10')
            expect(order?.promoCodeId).toBe(created.body.id)
            // 2000 items - 200 promo + 500 shipping
            expect(Number(order?.totalWithShippingAmount)).toBe(2300)

            const promo = await prisma.promoCode.findUnique({ where: { id: created.body.id } })
            expect(promo?.usedCount).toBe(1)

            const redemption = await prisma.promoCodeRedemption.findFirst({
                where: { tenantId, orderId: res.body.orderId }
            })
            expect(redemption?.status).toBe('ACTIVE')
            expect(Number(redemption?.discountAmount)).toBe(200)
        })

        it('takes the shipping off for a free-shipping code', async () => {
            await createCode({ code: 'FREESHIP', discountType: 'FREE_SHIPPING' })

            const res = await placeOrder({ promoCode: 'FREESHIP', shippingAmount: 700 })
            expect(res.status).toBe(201)

            const order = await prisma.order.findUnique({ where: { id: res.body.orderId } })
            expect(Number(order?.promoShippingDiscount)).toBe(700)
            expect(Number(order?.shippingAmount)).toBe(700)
            expect(Number(order?.totalWithShippingAmount)).toBe(2000)
        })

        it('rejects the order when the code is unknown', async () => {
            const res = await placeOrder({ promoCode: 'GHOST' })

            expect(res.status).toBe(400)
            expect(res.body.code).toBe('PROMO_CODE_INVALID')

            const orders = await prisma.order.count({ where: { tenantId } })
            expect(orders).toBe(0)
        })

        it('rejects the order once the total usage limit is spent', async () => {
            await createCode({ code: 'ONESHOT', discountType: 'FIXED', discountValue: 100, usageLimit: 1 })

            const first = await placeOrder({ promoCode: 'ONESHOT' })
            expect(first.status).toBe(201)

            const second = await placeOrder({ promoCode: 'ONESHOT', customerPhone: '0550333222' })
            expect(second.status).toBe(400)
            expect(second.body.code).toBe('PROMO_USAGE_LIMIT_REACHED')
        })

        it('holds the per-customer limit by phone number', async () => {
            await createCode({ code: 'ONCEPER', discountType: 'FIXED', discountValue: 100, usageLimitPerCustomer: 1 })

            const first = await placeOrder({ promoCode: 'ONCEPER' })
            expect(first.status).toBe(201)

            const sameCustomer = await placeOrder({ promoCode: 'ONCEPER' })
            expect(sameCustomer.status).toBe(400)
            expect(sameCustomer.body.code).toBe('PROMO_CUSTOMER_LIMIT_REACHED')

            const otherCustomer = await placeOrder({ promoCode: 'ONCEPER', customerPhone: '0550333999' })
            expect(otherCustomer.status).toBe(201)
        })

        it('hands the code back when the order is cancelled', async () => {
            const created = await createCode({ code: 'GIVEBACK', discountType: 'FIXED', discountValue: 100, usageLimit: 1 })

            const order = await placeOrder({ promoCode: 'GIVEBACK' })
            expect(order.status).toBe(201)

            const cancel = await request(app)
                .patch(`/api/admin/orders/${order.body.orderId}`)
                .set('X-Forwarded-Host', hostHeader)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'CANCELLED' })
            expect(cancel.status).toBe(200)

            const promo = await prisma.promoCode.findUnique({ where: { id: created.body.id } })
            expect(promo?.usedCount).toBe(0)

            const redemption = await prisma.promoCodeRedemption.findFirst({
                where: { tenantId, orderId: order.body.orderId }
            })
            expect(redemption?.status).toBe('CANCELLED')

            // The freed slot is usable again.
            const reuse = await placeOrder({ promoCode: 'GIVEBACK', customerPhone: '0550333777' })
            expect(reuse.status).toBe(201)
        })

        it('places the order untouched when no code is sent', async () => {
            const res = await placeOrder({})
            expect(res.status).toBe(201)

            const order = await prisma.order.findUnique({ where: { id: res.body.orderId } })
            expect(Number(order?.promoDiscountAmount)).toBe(0)
            expect(order?.promoCode).toBeNull()
        })

        it('re-prices the code when a pending order is edited', async () => {
            const created = await createCode({ code: 'REPRICE', discountType: 'PERCENTAGE', discountValue: 10 })

            const order = await placeOrder({ promoCode: 'REPRICE' })
            expect(order.status).toBe(201)

            const res = await request(app)
                .put(`/api/admin/orders/${order.body.orderId}`)
                .set('X-Forwarded-Host', hostHeader)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    customerName: 'Promo Buyer',
                    customerPhone: '0550333111',
                    items: [{ productId, variantId, quantity: 4 }]
                })
            expect(res.status).toBe(200)

            const saved = await prisma.order.findUnique({ where: { id: order.body.orderId } })
            // 4 x 1000 = 4000, so the 10% code is now worth 400.
            expect(Number(saved?.totalAmount)).toBe(4000)
            expect(Number(saved?.promoDiscountAmount)).toBe(400)
            expect(Number(saved?.totalWithShippingAmount)).toBe(3600)
            expect(saved?.promoCodeId).toBe(created.body.id)

            const redemption = await prisma.promoCodeRedemption.findFirst({
                where: { tenantId, orderId: order.body.orderId }
            })
            expect(Number(redemption?.discountAmount)).toBe(400)
        })

        it('drops and returns a code the edited cart no longer earns', async () => {
            const created = await createCode({
                code: 'BIGONLY',
                discountType: 'FIXED',
                discountValue: 300,
                minOrderAmount: 1500
            })

            const order = await placeOrder({ promoCode: 'BIGONLY' })
            expect(order.status).toBe(201)

            const res = await request(app)
                .put(`/api/admin/orders/${order.body.orderId}`)
                .set('X-Forwarded-Host', hostHeader)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    customerName: 'Promo Buyer',
                    customerPhone: '0550333111',
                    items: [{ productId, variantId, quantity: 1 }]
                })
            expect(res.status).toBe(200)

            const saved = await prisma.order.findUnique({ where: { id: order.body.orderId } })
            expect(Number(saved?.totalAmount)).toBe(1000)
            expect(Number(saved?.promoDiscountAmount)).toBe(0)
            expect(saved?.promoCodeId).toBeNull()
            expect(Number(saved?.totalWithShippingAmount)).toBe(1000)

            const promo = await prisma.promoCode.findUnique({ where: { id: created.body.id } })
            expect(promo?.usedCount).toBe(0)
        })

        it('refuses another tenant\'s code at checkout', async () => {
            await prisma.promoCode.create({
                data: { tenantId: otherTenantId, code: 'CROSSTENANT', discountType: 'PERCENTAGE', discountValue: 50 }
            })

            const res = await placeOrder({ promoCode: 'CROSSTENANT' })
            expect(res.status).toBe(400)
        })
    })

    /**
     * A limit checked with a read and spent with a write is only a limit if
     * nothing can slip between the two. These fire the checkouts in parallel so
     * they overlap inside the order transaction, which is exactly what an
     * attacker does by firing simultaneous requests at the public endpoint.
     *
     * Driven through the service rather than over HTTP on purpose: the race
     * lives in the transaction, and `publicOrderRateLimiter` allows 30 orders
     * an hour per tenant+IP, which the suite above already spends most of.
     */
    describe('concurrent checkout', () => {
        const orders = new OrdersService()

        /**
         * Each order gets its own phone by default. Two first-time shoppers
         * sharing one number collide on `Customer`'s unique index instead of on
         * the promo limit, and a burst that dies for that reason would pass
         * these assertions while proving nothing.
         */
        const placeConcurrently = (count: number, body: Record<string, unknown>, phone?: string) =>
            Promise.allSettled(
                Array.from({ length: count }, (_unused, index) =>
                    orders.createPublicOrder({
                        tenantId,
                        customerName: 'Promo Buyer',
                        customerPhone: phone ?? `0550444${String(index).padStart(3, '0')}`,
                        items: [{ productId, variantId, quantity: 2 }],
                        ...body
                    })
                )
            )

        /** The refusals must all be the limit — not a collision somewhere else. */
        const refusalCodes = (results: PromiseSettledResult<unknown>[]) =>
            results
                .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
                .map((result) => (result.reason as { code?: string })?.code)

        it('lets only one of several simultaneous checkouts spend the last use', async () => {
            const created = await createCode({
                code: 'RACEONE',
                discountType: 'FIXED',
                discountValue: 100,
                usageLimit: 1
            })

            const results = await placeConcurrently(6, { promoCode: 'RACEONE' })

            expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
            expect(refusalCodes(results)).toEqual(Array(5).fill('PROMO_USAGE_LIMIT_REACHED'))

            const promo = await prisma.promoCode.findUnique({ where: { id: created.body.id } })
            expect(promo?.usedCount).toBe(1)

            const redemptions = await prisma.promoCodeRedemption.count({
                where: { tenantId, promoCodeId: created.body.id, status: 'ACTIVE' }
            })
            expect(redemptions).toBe(1)

            // The losers rolled back whole — no half-placed discounted orders.
            const discounted = await prisma.order.count({ where: { tenantId, promoCode: 'RACEONE' } })
            expect(discounted).toBe(1)
        })

        it('stops at the cap when simultaneous checkouts exceed it', async () => {
            const created = await createCode({
                code: 'RACETHREE',
                discountType: 'FIXED',
                discountValue: 100,
                usageLimit: 3
            })

            const results = await placeConcurrently(8, { promoCode: 'RACETHREE' })

            expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(3)
            expect(refusalCodes(results)).toEqual(Array(5).fill('PROMO_USAGE_LIMIT_REACHED'))

            const promo = await prisma.promoCode.findUnique({ where: { id: created.body.id } })
            expect(promo?.usedCount).toBe(3)
        })

        it('holds the per-customer limit against simultaneous checkouts', async () => {
            const created = await createCode({
                code: 'RACEPER',
                discountType: 'FIXED',
                discountValue: 100,
                usageLimitPerCustomer: 1
            })

            const phone = '0550555111'

            // One plain order first, so the burst below races the promo limit and
            // not the creation of this customer.
            const warmUp = await placeConcurrently(1, {}, phone)
            expect(warmUp[0].status).toBe('fulfilled')

            // Same phone on every request: one redemption is all this customer gets.
            const results = await placeConcurrently(6, { promoCode: 'RACEPER' }, phone)

            expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
            expect(refusalCodes(results)).toEqual(Array(5).fill('PROMO_CUSTOMER_LIMIT_REACHED'))

            const redemptions = await prisma.promoCodeRedemption.count({
                where: { tenantId, promoCodeId: created.body.id, status: 'ACTIVE' }
            })
            expect(redemptions).toBe(1)
        })

        it('lets an uncapped code through every simultaneous checkout', async () => {
            const created = await createCode({ code: 'RACEFREE', discountType: 'FIXED', discountValue: 100 })

            const results = await placeConcurrently(5, { promoCode: 'RACEFREE' })

            expect(refusalCodes(results)).toEqual([])
            expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(5)

            const promo = await prisma.promoCode.findUnique({ where: { id: created.body.id } })
            expect(promo?.usedCount).toBe(5)
        })
    })
})
