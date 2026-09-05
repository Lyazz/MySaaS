import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'

describe('Public products hasVariants flag', () => {
  const slug = `hv-${Date.now()}`
  const host = `${slug}.localhost:3000`

  let tenantId: string
  let optionedProductSlug: string
  let simpleProductSlug: string

  beforeAll(async () => {
    const tenant = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Has Variants Tenant', slug } })
    tenantId = tenant.id

    optionedProductSlug = `prod-opt-${Date.now()}`
    const optionedProduct = await prisma.product.create({
      data: {
        tenantId,
        title: 'Optioned Product',
        slug: optionedProductSlug,
        price: 1000,
        stock: 20,
        isActive: true
      }
    })

    const option = await prisma.productOption.create({
      data: {
        tenantId,
        productId: optionedProduct.id,
        name: 'Size',
        position: 0
      }
    })

    await prisma.productOptionValue.create({
      data: {
        tenantId,
        optionId: option.id,
        label: 'L',
        position: 0
      }
    })

    simpleProductSlug = `prod-simple-${Date.now()}`
    await prisma.product.create({
      data: {
        tenantId,
        title: 'Simple Product',
        slug: simpleProductSlug,
        price: 700,
        stock: 10,
        isActive: true
      }
    })
  })

  afterAll(async () => {
    await prisma.productVariantImage.deleteMany({ where: { tenantId } })
    await prisma.productVariantOptionValue.deleteMany({ where: { tenantId } })
    await prisma.productVariant.deleteMany({ where: { tenantId } })
    await prisma.productOptionValue.deleteMany({ where: { tenantId } })
    await prisma.productOption.deleteMany({ where: { tenantId } })
    await prisma.productImage.deleteMany({ where: { tenantId } })
    await prisma.product.deleteMany({ where: { tenantId } })
    await prisma.tenantSubscription.deleteMany({ where: { tenantId } })
    await prisma.tenantDomain.deleteMany({ where: { tenantId } })
    await prisma.tenant.deleteMany({ where: { id: tenantId } })
  })

  it('GET /api/products returns hasVariants=true when product has options', async () => {
    const res = await request(app).get('/api/products').set('Host', host)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)

    const optioned = res.body.find((item: any) => item?.slug === optionedProductSlug)
    const simple = res.body.find((item: any) => item?.slug === simpleProductSlug)

    expect(optioned).toBeTruthy()
    expect(optioned.hasVariants).toBe(true)

    expect(simple).toBeTruthy()
    expect(simple.hasVariants).toBe(false)
  })
})
