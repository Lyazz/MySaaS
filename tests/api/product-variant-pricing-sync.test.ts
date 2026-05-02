import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Product price sync from variants', () => {
    const slug = `variant-price-sync-${Date.now()}`
    const host = `${slug}.localhost:3000`

    let tenantId: string
    let adminToken: string

    let simpleProductId: string
    let simpleVariantId: string
    let simpleProductSlug: string

    let optionedProductId: string
    let optionedVariantAId: string
    let optionedVariantBId: string

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({
            data: { name: 'Variant Price Sync Tenant', slug }
        })
        tenantId = tenant.id

        const admin = await prisma.user.create({
            data: {
                tenantId,
                email: `variant-price-sync-${slug}@example.com`,
                role: 'admin',
                passwordHash: 'x'
            }
        })
        adminToken = signAccessToken({ userId: admin.id, email: admin.email, role: admin.role, tenantId: admin.tenantId })

        simpleProductSlug = `simple-${Date.now()}`
        const simpleCreated = await request(app)
            .post('/api/admin/products')
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: 'Simple Product', slug: simpleProductSlug, price: 100, stock: 0, isActive: true })

        expect(simpleCreated.status).toBe(200)
        simpleProductId = simpleCreated.body.id

        const simpleProduct = await request(app)
            .get(`/api/admin/products/${simpleProductId}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)

        expect(simpleProduct.status).toBe(200)
        simpleVariantId = simpleProduct.body.variants?.[0]?.id
        expect(simpleVariantId).toBeTruthy()

        const optionedCreated = await request(app)
            .post('/api/admin/products')
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: 'Optioned Product', slug: `optioned-${Date.now()}`, price: 200, stock: 0, isActive: true })

        expect(optionedCreated.status).toBe(200)
        optionedProductId = optionedCreated.body.id

        const option = await prisma.productOption.create({
            data: {
                tenantId,
                productId: optionedProductId,
                name: 'Size',
                position: 0,
                displayType: 'dropdown' as any
            }
        })

        await prisma.productOptionValue.createMany({
            data: [
                { tenantId, optionId: option.id, label: 'S', position: 0 },
                { tenantId, optionId: option.id, label: 'L', position: 1 }
            ]
        })

        const generated = await request(app)
            .post(`/api/admin/products/${optionedProductId}/variants/generate`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)

        expect(generated.status).toBe(200)
        const generatedVariants = generated.body as any[]
        expect(generatedVariants).toHaveLength(2)

        const smallVariant = generatedVariants.find((variant) =>
            Array.isArray(variant?.optionValues) &&
            variant.optionValues.some((entry: any) => entry?.optionValue?.label === 'S')
        )
        const largeVariant = generatedVariants.find((variant) =>
            Array.isArray(variant?.optionValues) &&
            variant.optionValues.some((entry: any) => entry?.optionValue?.label === 'L')
        )

        optionedVariantAId = smallVariant?.id
        optionedVariantBId = largeVariant?.id
        expect(optionedVariantAId).toBeTruthy()
        expect(optionedVariantBId).toBeTruthy()
    })

    afterAll(async () => {
        await prisma.inventoryMovement.deleteMany({ where: { tenantId } })
        await prisma.productVariantImage.deleteMany({ where: { tenantId } })
        await prisma.productVariantOptionValue.deleteMany({ where: { tenantId } })
        await prisma.productVariant.deleteMany({ where: { tenantId } })
        await prisma.productOptionValue.deleteMany({ where: { tenantId } })
        await prisma.productOption.deleteMany({ where: { tenantId } })
        await prisma.product.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    it('accepts positive cost updates when promotional price is null', async () => {
        const res = await request(app)
            .put(`/api/admin/variants/${simpleVariantId}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                cost: 25,
                promotionalPrice: null,
                isPromotionActive: false
            })

        expect(res.status).toBe(200)
        expect(Number(res.body?.cost)).toBe(25)
    })

    it('rejects negative cost updates with a cost-specific error', async () => {
        const res = await request(app)
            .put(`/api/admin/variants/${simpleVariantId}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                cost: -1
            })

        expect(res.status).toBe(400)
        expect(res.body?.statusMessage).toBe('cost must be a non-negative number')
    })

    it('ignores legacy product-level price updates on the product edit endpoint', async () => {
        const res = await request(app)
            .put(`/api/admin/products/${simpleProductId}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                title: 'Simple Product',
                slug: simpleProductSlug,
                price: 999,
                isActive: true
            })

        expect(res.status).toBe(200)

        const product = await prisma.product.findUniqueOrThrow({
            where: { id: simpleProductId },
            select: { price: true }
        })
        const variant = await prisma.productVariant.findUniqueOrThrow({
            where: { id: simpleVariantId },
            select: { price: true }
        })

        expect(Number(product.price)).toBe(100)
        expect(Number(variant.price)).toBe(100)
    })

    it('mirrors simple-product price from the default variant', async () => {
        const res = await request(app)
            .put(`/api/admin/variants/${simpleVariantId}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ price: 135 })

        expect(res.status).toBe(200)

        const product = await prisma.product.findUniqueOrThrow({
            where: { id: simpleProductId },
            select: { price: true }
        })
        expect(Number(product.price)).toBe(135)
    })

    it('mirrors optioned products from the lowest active variant price', async () => {
        const highRes = await request(app)
            .put(`/api/admin/variants/${optionedVariantAId}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ price: 260 })
        expect(highRes.status).toBe(200)

        const lowRes = await request(app)
            .put(`/api/admin/variants/${optionedVariantBId}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ price: 180 })
        expect(lowRes.status).toBe(200)

        const product = await prisma.product.findUniqueOrThrow({
            where: { id: optionedProductId },
            select: { price: true }
        })
        expect(Number(product.price)).toBe(180)
    })

    it('recomputes mirrored product price when variants are archived and reactivated', async () => {
        const archiveRes = await request(app)
            .put(`/api/admin/variants/${optionedVariantBId}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ isActive: false })

        expect(archiveRes.status).toBe(200)

        let product = await prisma.product.findUniqueOrThrow({
            where: { id: optionedProductId },
            select: { price: true }
        })
        expect(Number(product.price)).toBe(260)

        const reactivateRes = await request(app)
            .put(`/api/admin/variants/${optionedVariantBId}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ isActive: true })

        expect(reactivateRes.status).toBe(200)

        product = await prisma.product.findUniqueOrThrow({
            where: { id: optionedProductId },
            select: { price: true }
        })
        expect(Number(product.price)).toBe(180)
    })
})
