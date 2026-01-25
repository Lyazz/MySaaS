import { describe, it, expect } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils'
import prisma from '../backend/src/lib/prisma'

describe('Frontend Tenant Resolution', async () => {
    await setup({ setupTimeout: 300_000 })

    const slug = `frontend-test-${Date.now()}`

    it('resolves tenant on home page', async () => {
        // Create tenant
        await prisma.tenant.create({
            data: {
                name: 'Frontend Tenant',
                slug,
            }
        })

        // Fetch home page with tenant subdomain
        const res = await fetch('/', {
            headers: {
                'X-Forwarded-Host': `${slug}.localhost:3000`
            }
        })

        const html = await res.text()

        // Check verification
        expect(res.status).toBe(200)
        expect(html).toContain('Frontend Tenant')

        // Cleanup
        await prisma.tenant.delete({ where: { slug } })
    })
})
