import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import app from '../backend/src/app'
import prisma from '../backend/src/lib/prisma'

describe('Temporary registration phone lock', () => {
    const createdSlugs: string[] = []
    const prevLockFlag = process.env.REGISTER_PHONE_LOCK_ENABLED
    const allowedPhoneIntl = '+213540801436'
    const allowedPhoneLocal = '0540801436'
    const stamp = Date.now()

    beforeAll(() => {
        process.env.REGISTER_PHONE_LOCK_ENABLED = 'true'
    })

    afterAll(async () => {
        process.env.REGISTER_PHONE_LOCK_ENABLED = prevLockFlag

        if (createdSlugs.length === 0) return
        await prisma.user.deleteMany({ where: { tenant: { slug: { in: createdSlugs } } } })
        await prisma.tenant.deleteMany({ where: { slug: { in: createdSlugs } } })
    })

    it('rejects registration for non-whitelisted phone numbers', async () => {
        const slug = `lock-reject-${stamp}`

        const res = await request(app)
            .post('/api/register')
            .set('Host', 'localhost:3000')
            .set('X-Forwarded-Host', 'localhost:3000')
            .set('X-Forwarded-For', '203.0.113.101')
            .send({
                name: 'Restricted Tenant',
                slug,
                email: `restricted-${stamp}@example.com`,
                password: 'Password123!',
                phone: '0550123456'
            })

        expect(res.status).toBe(403)
        expect(String(res.body.statusMessage)).toContain('currently unavailable')
    })

    it('accepts the whitelisted phone in local format', async () => {
        const slug = `lock-local-${stamp}`

        const res = await request(app)
            .post('/api/register')
            .set('Host', 'localhost:3000')
            .set('X-Forwarded-Host', 'localhost:3000')
            .set('X-Forwarded-For', '203.0.113.102')
            .send({
                name: 'Allowed Local Format',
                slug,
                email: `allowed-local-${stamp}@example.com`,
                password: 'Password123!',
                phone: allowedPhoneLocal
            })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        createdSlugs.push(slug)
    })

    it('accepts the whitelisted phone in international format', async () => {
        const slug = `lock-international-${stamp}`

        const res = await request(app)
            .post('/api/register')
            .set('Host', 'localhost:3000')
            .set('X-Forwarded-Host', 'localhost:3000')
            .set('X-Forwarded-For', '203.0.113.103')
            .send({
                name: 'Allowed International Format',
                slug,
                email: `allowed-intl-${stamp}@example.com`,
                password: 'Password123!',
                phone: allowedPhoneIntl
            })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        createdSlugs.push(slug)
    })
})
