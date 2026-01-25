import { describe, it, expect, vi } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils'
import prisma from '../backend/src/lib/prisma'

// Mock prisma to avoid real db writes in this quick test if preferred, 
// but integration tests usually use a test db. 
// For now we'll assume the environment is set up for testing or we mock.
// Let's rely on the fact that we are running 'npm run test' which might use a local db.
// We will use a unique slug to avoid conflicts.

describe('Express Backend Migration', async () => {
    await setup({ setupTimeout: 300_000 })

    it('responds to /api/hello', async () => {
        const res = await fetch('/api/hello')
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body).toEqual({ hello: 'world' })
    })

    it('handles /api/register via Express', async () => {
        const slug = `test-tenant-${Date.now()}`
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Tenant',
                slug,
                email: `owner-${slug}@example.com`,
                password: 'password123'
            })
        })

        const body = await res.json()
        console.log('Register response:', body)

        if (res.status === 500) {
            console.error('500 Error Body:', body)
        }

        expect(res.status).toBe(200)
        expect(body.success).toBe(true)
        expect(body.tenant.slug).toBe(slug)

        // Cleanup
        await prisma.user.deleteMany({ where: { email: `owner-${slug}@example.com` } })
        await prisma.tenant.delete({ where: { slug } })
    })
})
