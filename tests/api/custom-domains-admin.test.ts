import { afterAll, describe, it, expect } from 'vitest'
import request from 'supertest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'

describe('Custom domain settings (Tenant Admin)', () => {
  const timestamp = Date.now()
  const slugA = `domain-admin-a-${timestamp}`
  const slugB = `domain-admin-b-${timestamp}`
  const emailA = `owner-${slugA}@example.com`
  const emailB = `owner-${slugB}@example.com`
  const domain = `www.store-${timestamp}.example.com`
  const platformBaseDomain = process.env.PLATFORM_BASE_DOMAIN || process.env.NUXT_PUBLIC_PLATFORM_BASE_DOMAIN || 'platform.com'

  let tokenA = ''
  let tokenB = ''
  let domainId = ''

  async function registerTenant(slug: string, email: string) {
    const res = await request(app)
      .post('/api/register')
      .set('X-Forwarded-Host', 'localhost:3000')
      .send({
        name: slug,
        slug,
        email,
        password: 'password123'
      })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeTruthy()
    return res.body.token as string
  }

  it('lets a tenant add, list, and resolve a custom domain', async () => {
    tokenA = await registerTenant(slugA, emailA)

    const createRes = await request(app)
      .post('/api/admin/custom-domains')
      .set('X-Forwarded-Host', 'localhost:3000')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ domain: `https://${domain}/some-path` })
    const created = createRes.body

    expect(createRes.status).toBe(201)
    expect(created.domain).toBe(domain)
    expect(created.cnameTarget).toBe(`${slugA}.${platformBaseDomain}`)
    domainId = created.id

    const listRes = await request(app)
      .get('/api/admin/custom-domains')
      .set('X-Forwarded-Host', 'localhost:3000')
      .set('Authorization', `Bearer ${tokenA}`)
    const listBody = listRes.body

    expect(listRes.status).toBe(200)
    expect(listBody.cnameTarget).toBe(`${slugA}.${platformBaseDomain}`)
    expect(listBody.domains.map((item: any) => item.domain)).toContain(domain)

    const publicRes = await request(app)
      .get('/api/store/settings')
      .set('X-Forwarded-Host', domain)
    const publicBody = publicRes.body

    expect(publicRes.status).toBe(200)
    expect(publicBody.tenant.slug).toBe(slugA)
  })

  it('does not allow another tenant to claim or delete the domain', async () => {
    tokenB = await registerTenant(slugB, emailB)

    const claimRes = await request(app)
      .post('/api/admin/custom-domains')
      .set('X-Forwarded-Host', 'localhost:3000')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ domain })
    const claimBody = claimRes.body

    expect(claimRes.status).toBe(409)
    expect(claimBody.statusMessage).toContain('another store')

    const deleteRes = await request(app)
      .delete(`/api/admin/custom-domains/${domainId}`)
      .set('X-Forwarded-Host', 'localhost:3000')
      .set('Authorization', `Bearer ${tokenB}`)
    const deleteBody = deleteRes.body

    expect(deleteRes.status).toBe(404)
    expect(deleteBody.statusMessage).toBe('Domain not found')
  })

  it('lets the owning tenant remove the domain', async () => {
    const deleteRes = await request(app)
      .delete(`/api/admin/custom-domains/${domainId}`)
      .set('X-Forwarded-Host', 'localhost:3000')
      .set('Authorization', `Bearer ${tokenA}`)

    expect(deleteRes.status).toBe(204)

    const listRes = await request(app)
      .get('/api/admin/custom-domains')
      .set('X-Forwarded-Host', 'localhost:3000')
      .set('Authorization', `Bearer ${tokenA}`)
    const listBody = listRes.body

    expect(listRes.status).toBe(200)
    expect(listBody.domains.map((item: any) => item.domain)).not.toContain(domain)
  })

  afterAll(async () => {
    await prisma.tenantDomain.deleteMany({ where: { domain } })
    await prisma.user.deleteMany({ where: { tenant: { slug: { in: [slugA, slugB] } } } })
    await prisma.tenant.deleteMany({ where: { slug: { in: [slugA, slugB] } } })
  })
})
