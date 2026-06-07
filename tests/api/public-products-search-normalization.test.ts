import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'

describe('Public products search normalization', () => {
    const tenantASlug = `search-a-${Date.now()}`
    const tenantBSlug = `search-b-${Date.now()}`
    const tenantAHost = `${tenantASlug}.localhost:3000`
    const tenantBHost = `${tenantBSlug}.localhost:3000`

    let tenantAId: string
    let tenantBId: string
    let productSlug: string

    beforeAll(async () => {
        const [tenantA, tenantB] = await Promise.all([
            prisma.tenant.create({ data: { name: 'Search Tenant A', slug: tenantASlug } }),
            prisma.tenant.create({ data: { name: 'Search Tenant B', slug: tenantBSlug } })
        ])

        tenantAId = tenantA.id
        tenantBId = tenantB.id
        productSlug = `product-${Date.now()}`

        await prisma.product.create({
            data: {
                tenantId: tenantAId,
                title: 'مدرسة أبل',
                description: 'مُدَرِّسَة حديثة',
                searchKeywords: 'مدرسه, ابل',
                slug: productSlug,
                price: 1500,
                stock: 10,
                isActive: true
            }
        })
    })

    afterAll(async () => {
        await prisma.productImage.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId].filter(Boolean) } } })
        await prisma.product.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId].filter(Boolean) } } })
        await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId].filter(Boolean) } } })
        await prisma.tenantDomain.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId].filter(Boolean) } } })
        await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId].filter(Boolean) } } })
    })

    it('returns the same tenant-scoped product for normalized Arabic query variants', async () => {
        const [canonicalRes, variantRes, harakatRes] = await Promise.all([
            request(app).get('/api/products').query({ q: 'مدرسه ابل' }).set('Host', tenantAHost),
            request(app).get('/api/products').query({ q: 'مدرسة أبل' }).set('Host', tenantAHost),
            request(app).get('/api/products').query({ q: 'مُدَرِّسَة أَبْل' }).set('Host', tenantAHost)
        ])

        for (const response of [canonicalRes, variantRes, harakatRes]) {
            expect(response.status).toBe(200)
            expect(Array.isArray(response.body)).toBe(true)
            expect(response.body.some((item: any) => item?.slug === productSlug)).toBe(true)
        }
    })

    it('does not leak tenant A products to tenant B for the same normalized search', async () => {
        const response = await request(app)
            .get('/api/products')
            .query({ q: 'مدرسه ابل' })
            .set('Host', tenantBHost)

        expect(response.status).toBe(200)
        expect(Array.isArray(response.body)).toBe(true)
        expect(response.body.some((item: any) => item?.slug === productSlug)).toBe(false)
    })
})
