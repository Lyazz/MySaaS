import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'

import app from '../backend/src/app'

describe('Registration temporarily closed flag', () => {
    const prevFlag = process.env.REGISTRATIONS_OPEN
    const stamp = Date.now()

    afterEach(() => {
        process.env.REGISTRATIONS_OPEN = prevFlag
    })

    const post = (slug: string, ip: string, phone: string) =>
        request(app)
            .post('/api/register')
            .set('Host', 'localhost:3000')
            .set('X-Forwarded-Host', 'localhost:3000')
            .set('X-Forwarded-For', ip)
            .send({
                name: 'Closed Window Tenant',
                slug,
                email: `${slug}@example.com`,
                password: 'Password123!',
                phone
            })

    it('rejects registration with 403 when REGISTRATIONS_OPEN is "false"', async () => {
        process.env.REGISTRATIONS_OPEN = 'false'

        const res = await post(`closed-${stamp}`, '203.0.113.201', '0550123456')

        expect(res.status).toBe(403)
        expect(String(res.body.statusMessage)).toContain('temporarily closed')
    })

    it('does not apply the closed-window gate when the flag is unset', async () => {
        delete process.env.REGISTRATIONS_OPEN

        const res = await post(`open-default-${stamp}`, '203.0.113.202', '0550123457')

        // Other gates (e.g. the phone allowlist) may still apply in some envs,
        // but the closed-window gate must not be the reason for any rejection.
        expect(String(res.body.statusMessage ?? '')).not.toContain('temporarily closed')
    })
})
