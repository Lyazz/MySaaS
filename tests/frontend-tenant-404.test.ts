import { describe, it, expect } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils'

describe('Frontend Tenant 404', async () => {
  await setup({ setupTimeout: 900_000, teardownTimeout: 900_000 })

  it('returns 404 for unknown tenant subdomain', async () => {
    const slug = `missing-${Date.now()}`
    const res = await fetch('/', {
      headers: {
        'X-Forwarded-Host': `${slug}.localhost:3000`
      }
    })

    expect(res.status).toBe(404)
  })
})
