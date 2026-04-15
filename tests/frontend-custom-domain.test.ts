import { describe, it, expect } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils'
import prisma from '../backend/src/lib/prisma'

describe('Frontend custom domain tenant resolution', async () => {
  await setup({ setupTimeout: 900_000, teardownTimeout: 900_000 })

  const timestamp = Date.now()
  const slug = `frontend-domain-${timestamp}`
  const domain = `tenant-${timestamp}.example.com`

  it('renders tenant storefront on custom domain', async () => {
    const tenant = await prisma.tenant.create({
      data: { name: 'Frontend Custom Domain', slug }
    })

    await prisma.tenantDomain.create({
      data: { tenantId: tenant.id, domain }
    })

    const res = await fetch('/', {
      headers: { 'X-Forwarded-Host': domain }
    })
    const html = await res.text()

    expect(res.status).toBe(200)
    expect(html).toContain('Frontend Custom Domain')

    await prisma.tenantDomain.delete({ where: { domain } })
    await prisma.storeSettings.deleteMany({ where: { tenantId: tenant.id } })
    await prisma.tenant.delete({ where: { id: tenant.id } })
  })
})
