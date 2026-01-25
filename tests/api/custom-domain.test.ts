import { describe, it, expect } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils'
import prisma from '../../backend/src/lib/prisma'

describe('Custom domain tenant resolution (API)', async () => {
  await setup({ setupTimeout: 300_000 })

  const timestamp = Date.now()
  const slug = `domain-${timestamp}`
  const domain = `store-${timestamp}.example.com`

  it('resolves tenant from custom domain on public store settings', async () => {
    const tenant = await prisma.tenant.create({
      data: { name: 'Custom Domain Store', slug }
    })

    await prisma.tenantDomain.create({
      data: { tenantId: tenant.id, domain }
    })

    const res = await fetch('/api/store/settings', {
      headers: { 'X-Forwarded-Host': domain }
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tenant.slug).toBe(slug)
    expect(body.tenant.name).toBe('Custom Domain Store')

    await prisma.tenantDomain.delete({ where: { domain } })
    await prisma.storeSettings.deleteMany({ where: { tenantId: tenant.id } })
    await prisma.tenant.delete({ where: { id: tenant.id } })
  })
})

