import { describe, expect, it } from 'vitest'
import { fetch, setup } from '@nuxt/test-utils'

describe('Nuxt security headers', async () => {
    await setup({ setupTimeout: 900_000, teardownTimeout: 900_000 })

    it('sets CSP report-only headers on public and auth pages', async () => {
        const paths = ['/', '/login', '/register']

        for (const path of paths) {
            const res = await fetch(path, { redirect: 'manual' })
            const cspReportOnly = res.headers.get('content-security-policy-report-only')

            expect(cspReportOnly).toBeTruthy()
            expect(cspReportOnly || '').toContain("default-src 'self'")
        }
    })
})
