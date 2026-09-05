import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'

describe('Meta Pixels routing (product vs global)', () => {
    let tenant: any
    let product: any
    let globalPixel: any
    let productPixel: any

    beforeAll(async () => {
        tenant = await prisma.tenant.create({
            data: { publishedAt: new Date(), name: 'Apple Tenant', slug: `apple-${Date.now()}` }
        })

        globalPixel = await prisma.tenantMetaPixel.create({
            data: { tenantId: tenant.id, pixelId: '1234', isActive: true, isGlobal: true, name: 'Global' }
        })

        productPixel = await prisma.tenantMetaPixel.create({
            data: { tenantId: tenant.id, pixelId: '000000', isActive: true, isGlobal: false, name: 'Product Pixel' }
        })

        product = await prisma.product.create({
            data: {
                tenantId: tenant.id,
                title: 'USB-C to Lightning Cable (1m)',
                slug: 'usb-c-to-lightning-cable-1m-',
                price: 100,
                stock: 10,
                isActive: true
            }
        })

        await prisma.productMetaPixel.create({
            data: { tenantId: tenant.id, productId: product.id, metaPixelId: productPixel.id }
        })
    })

    afterAll(async () => {
        await prisma.productMetaPixel.deleteMany({ where: { tenantId: tenant.id } })
        await prisma.tenantMetaPixel.deleteMany({ where: { tenantId: tenant.id } })
        await prisma.product.deleteMany({ where: { tenantId: tenant.id } })
        await prisma.tenant.deleteMany({ where: { id: tenant.id } })
    })

    it('includes product metaPixelIds (pixelId strings) on public product detail for localhost tenant hosts', async () => {
        const res = await request(app)
            .get(`/api/products/${encodeURIComponent(product.slug)}`)
            .set('Host', `${tenant.slug}.localhost:3000`)

        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({
            slug: product.slug,
            metaPixelIds: ['000000']
        })
    })
})

