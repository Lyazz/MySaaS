import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'

describe('Public products images payload', () => {
    const slug = `img-${Date.now()}`
    const host = `${slug}.localhost:3000`

    let tenantId: string
    let productSlug: string
    let noImageProductSlug: string

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Images Tenant', slug } })
        tenantId = tenant.id

        productSlug = `prod-${Date.now()}`
        const product = await prisma.product.create({
            data: {
                tenantId,
                title: 'Images Product',
                slug: productSlug,
                price: 10,
                stock: 10,
                isActive: true,
                images: []
            }
        })

        await prisma.productImage.createMany({
            data: [
                {
                    tenantId,
                    productId: product.id,
                    url: 'https://example.com/img-1.jpg',
                    position: 1,
                    isMain: false
                },
                {
                    tenantId,
                    productId: product.id,
                    url: 'https://example.com/img-main.jpg',
                    position: 0,
                    isMain: true
                }
            ]
        })

        noImageProductSlug = `prod-no-image-${Date.now()}`
        await prisma.product.create({
            data: {
                tenantId,
                title: 'No Image Product',
                slug: noImageProductSlug,
                price: 15,
                stock: 5,
                isActive: true,
                images: []
            }
        })
    })

    afterAll(async () => {
        await prisma.productVariantImage.deleteMany({ where: { tenantId } })
        await prisma.productImage.deleteMany({ where: { tenantId } })
        await prisma.productVariant.deleteMany({ where: { tenantId } })
        await prisma.product.deleteMany({ where: { tenantId } })
        await prisma.tenantSubscription.deleteMany({ where: { tenantId } })
        await prisma.tenantDomain.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    it('GET /api/products includes productImages and derives images when legacy images empty', async () => {
        const res = await request(app).get('/api/products').set('Host', host)
        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)

        const p = res.body.find((x: any) => x?.slug === productSlug)
        expect(p).toBeTruthy()
        expect(Array.isArray(p.productImages)).toBe(true)
        expect(p.productImages.length).toBeGreaterThan(0)

        expect(p.productImages[0].url).toBe('https://example.com/img-main.jpg')
        expect(Array.isArray(p.images)).toBe(true)
        expect(p.images[0]).toBe('https://example.com/img-main.jpg')

        const noImage = res.body.find((x: any) => x?.slug === noImageProductSlug)
        expect(noImage).toBeTruthy()
        expect(Array.isArray(noImage.images)).toBe(true)
        expect(noImage.images[0]).toBe('/blank.svg?v=2')
    })

    it('GET /api/products/:slug includes productImages and derives images when legacy images empty', async () => {
        const res = await request(app).get(`/api/products/${encodeURIComponent(productSlug)}`).set('Host', host)
        expect(res.status).toBe(200)

        expect(Array.isArray(res.body.productImages)).toBe(true)
        expect(res.body.productImages[0].url).toBe('https://example.com/img-main.jpg')
        expect(Array.isArray(res.body.images)).toBe(true)
        expect(res.body.images[0]).toBe('https://example.com/img-main.jpg')
    })

    it('GET /api/products/:slug returns placeholder when no images exist', async () => {
        const res = await request(app).get(`/api/products/${encodeURIComponent(noImageProductSlug)}`).set('Host', host)
        expect(res.status).toBe(200)
        expect(Array.isArray(res.body.images)).toBe(true)
        expect(res.body.images[0]).toBe('/blank.svg?v=2')
    })
})
