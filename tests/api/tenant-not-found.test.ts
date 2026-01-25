import { describe, it, expect } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils'

describe('API Tenant 404', async () => {
  await setup({ setupTimeout: 300_000 })

  it('returns JSON 404 for unknown tenant on /api/products', async () => {
    const slug = `missing-${Date.now()}`
    const res = await fetch('/api/products', {
      headers: {
        'X-Forwarded-Host': `${slug}.localhost:3000`
      }
    })

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.statusCode).toBe(404)
  })
})
