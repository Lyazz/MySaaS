import { describe, it, expect } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils'
import prisma from '../backend/src/lib/prisma'

describe('Checkout Guard (empty cart)', async () => {
  await setup({ setupTimeout: 900_000, teardownTimeout: 900_000 })

  const slug = `checkout-guard-${Date.now()}`

  it('redirects /checkout to /cart when cart is empty', async () => {
    await prisma.tenant.create({
      data: {
        name: 'Checkout Guard Tenant',
        slug
      }
    })

    const res = await fetch('/checkout', {
      redirect: 'manual',
      headers: {
        'X-Forwarded-Host': `${slug}.localhost:3000`,
        cookie: 'cart_item_count=0'
      }
    })

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/cart')

    await prisma.tenant.delete({ where: { slug } })
  })

  it('allows /checkout when cart is non-empty', async () => {
    await prisma.tenant.create({
      data: {
        name: 'Checkout Guard Tenant 2',
        slug: `${slug}-2`
      }
    })

    const res = await fetch('/checkout', {
      redirect: 'manual',
      headers: {
        'X-Forwarded-Host': `${slug}-2.localhost:3000`,
        cookie: 'cart_item_count=1'
      }
    })

    expect(res.status).toBe(200)

    await prisma.tenant.delete({ where: { slug: `${slug}-2` } })
  })
})

