import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'

describe('Storefront visibility (LISTED / UNLISTED)', () => {
  const slug = `vis-${Date.now()}`
  const host = `${slug}.localhost:3000`

  let tenantId: string
  let otherTenantId: string

  const listedCategorySlug = `cat-listed-${Date.now()}`
  const unlistedCategorySlug = `cat-unlisted-${Date.now()}`

  const listedProductSlug = `p-listed-${Date.now()}`
  const unlistedProductSlug = `p-unlisted-${Date.now()}`
  const inUnlistedCatProductSlug = `p-in-unlisted-cat-${Date.now()}`
  const inBothCatsProductSlug = `p-in-both-cats-${Date.now()}`

  beforeAll(async () => {
    const [tenant, otherTenant] = await Promise.all([
      prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Visibility Tenant', slug } }),
      prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Visibility Other Tenant', slug: `${slug}-other` } })
    ])
    tenantId = tenant.id
    otherTenantId = otherTenant.id

    const listedCategory = await prisma.category.create({
      data: { tenantId, title: 'Listed Category', slug: listedCategorySlug, visibility: 'LISTED' }
    })
    const unlistedCategory = await prisma.category.create({
      data: { tenantId, title: 'Unlisted Category', slug: unlistedCategorySlug, visibility: 'UNLISTED' }
    })

    // Plain listed product, no category
    await prisma.product.create({
      data: { tenantId, title: 'Listed Product', slug: listedProductSlug, price: 100, stock: 5, isActive: true, visibility: 'LISTED' }
    })

    // Unlisted product, no category
    await prisma.product.create({
      data: { tenantId, title: 'Unlisted Product', slug: unlistedProductSlug, price: 100, stock: 5, isActive: true, visibility: 'UNLISTED' }
    })

    // Listed product whose only category is unlisted
    const inUnlistedCatProduct = await prisma.product.create({
      data: {
        tenantId,
        title: 'Product In Unlisted Category',
        slug: inUnlistedCatProductSlug,
        price: 100,
        stock: 5,
        isActive: true,
        visibility: 'LISTED',
        categoryId: unlistedCategory.id
      }
    })

    // Listed product in both a listed and an unlisted category
    const inBothCatsProduct = await prisma.product.create({
      data: {
        tenantId,
        title: 'Product In Both Categories',
        slug: inBothCatsProductSlug,
        price: 100,
        stock: 5,
        isActive: true,
        visibility: 'LISTED',
        categoryId: listedCategory.id
      }
    })

    await prisma.productCategory.createMany({
      data: [
        { tenantId, productId: inUnlistedCatProduct.id, categoryId: unlistedCategory.id },
        { tenantId, productId: inBothCatsProduct.id, categoryId: listedCategory.id },
        { tenantId, productId: inBothCatsProduct.id, categoryId: unlistedCategory.id }
      ]
    })
  })

  afterAll(async () => {
    const tenantIds = [tenantId, otherTenantId].filter(Boolean)
    await prisma.productCategory.deleteMany({ where: { tenantId: { in: tenantIds } } })
    await prisma.product.deleteMany({ where: { tenantId: { in: tenantIds } } })
    await prisma.category.deleteMany({ where: { tenantId: { in: tenantIds } } })
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: tenantIds } } })
    await prisma.tenantDomain.deleteMany({ where: { tenantId: { in: tenantIds } } })
    await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } })
  })

  it('GET /api/products hides unlisted products and products whose every category is unlisted', async () => {
    const res = await request(app).get('/api/products').set('Host', host)

    expect(res.status).toBe(200)
    const slugs: string[] = res.body.map((p: any) => p.slug)

    expect(slugs).toContain(listedProductSlug)
    expect(slugs).toContain(inBothCatsProductSlug)
    expect(slugs).not.toContain(unlistedProductSlug)
    expect(slugs).not.toContain(inUnlistedCatProductSlug)
  })

  it('GET /api/products/:slug still serves an unlisted product by direct link', async () => {
    const res = await request(app).get(`/api/products/${unlistedProductSlug}`).set('Host', host)

    expect(res.status).toBe(200)
    expect(res.body.slug).toBe(unlistedProductSlug)
    expect(res.body.visibility).toBe('UNLISTED')
  })

  it('GET /api/categories hides unlisted categories', async () => {
    const res = await request(app).get('/api/categories').set('Host', host)

    expect(res.status).toBe(200)
    const slugs: string[] = res.body.map((c: any) => c.slug)
    expect(slugs).toContain(listedCategorySlug)
    expect(slugs).not.toContain(unlistedCategorySlug)
  })

  it('GET /api/categories/:slug serves an unlisted category and its listed products by direct link', async () => {
    const res = await request(app).get(`/api/categories/${unlistedCategorySlug}`).set('Host', host)

    expect(res.status).toBe(200)
    expect(res.body.slug).toBe(unlistedCategorySlug)
    expect(res.body.visibility).toBe('UNLISTED')

    const productSlugs: string[] = (res.body.products || []).map((p: any) => p.slug)
    // Products living only in this unlisted category are visible on the category's own page.
    expect(productSlugs).toContain(inUnlistedCatProductSlug)
    expect(productSlugs).toContain(inBothCatsProductSlug)
  })

  it('does not leak visibility-scoped data across tenants', async () => {
    const otherHost = `${slug}-other.localhost:3000`
    const res = await request(app).get(`/api/categories/${unlistedCategorySlug}`).set('Host', otherHost)
    expect(res.status).toBe(404)
  })
})
