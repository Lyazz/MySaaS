import { describe, expect, it } from 'vitest'

import { MissingEnvironmentError, assertRequiredEnv } from '../../backend/src/lib/env-check'

// A complete environment, used as the baseline each case pokes a hole in.
const completeEnv = (): NodeJS.ProcessEnv => ({
    JWT_SECRET: 'secret',
    ACTIVATION_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nx\n-----END PRIVATE KEY-----',
    ACTIVATION_PUBLIC_KEY: '-----BEGIN PUBLIC KEY-----\nx\n-----END PUBLIC KEY-----'
})

describe('assertRequiredEnv', () => {
    it('passes when every required variable is present', () => {
        expect(() => assertRequiredEnv(completeEnv())).not.toThrow()
    })

    it('refuses to boot without ACTIVATION_PRIVATE_KEY', () => {
        const env = completeEnv()
        delete env.ACTIVATION_PRIVATE_KEY

        expect(() => assertRequiredEnv(env)).toThrow(MissingEnvironmentError)
    })

    it('refuses to boot without JWT_SECRET', () => {
        const env = completeEnv()
        delete env.JWT_SECRET

        expect(() => assertRequiredEnv(env)).toThrow(MissingEnvironmentError)
    })

    it('treats a blank or whitespace-only value as missing', () => {
        const env = completeEnv()
        env.ACTIVATION_PUBLIC_KEY = '   '

        expect(() => assertRequiredEnv(env)).toThrow(MissingEnvironmentError)
    })

    it('reports every missing variable at once, not just the first', () => {
        let error: MissingEnvironmentError | undefined

        try {
            assertRequiredEnv({})
        } catch (thrown) {
            error = thrown as MissingEnvironmentError
        }

        expect(error).toBeInstanceOf(MissingEnvironmentError)
        expect(error?.missing).toEqual([
            'JWT_SECRET',
            'ACTIVATION_PRIVATE_KEY',
            'ACTIVATION_PUBLIC_KEY'
        ])
    })

    it('includes keypair generation guidance exactly once when both keys are missing', () => {
        const env = completeEnv()
        delete env.ACTIVATION_PRIVATE_KEY
        delete env.ACTIVATION_PUBLIC_KEY

        let message = ''
        try {
            assertRequiredEnv(env)
        } catch (thrown) {
            message = (thrown as Error).message
        }

        expect(message).toContain('openssl genpkey')
        expect(message.match(/openssl genpkey/g)).toHaveLength(1)
    })
})
