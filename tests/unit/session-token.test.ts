import { describe, expect, it } from 'vitest'
import jwt from 'jsonwebtoken'
import { getJwtExpiryEpochMs, isJwtExpired } from '../../shared/auth/session-token'

describe('session token helpers', () => {
    const secret = process.env.JWT_SECRET || 'test-jwt-secret'

    it('extracts exp timestamp from a valid token', () => {
        const token = jwt.sign({ userId: 'u1' }, secret, { expiresIn: '1h' })
        const exp = getJwtExpiryEpochMs(token)
        expect(typeof exp).toBe('number')
        expect(exp).toBeGreaterThan(Date.now())
    })

    it('returns expired=true for invalid or expired tokens', () => {
        const expiredToken = jwt.sign({ userId: 'u1' }, secret, { expiresIn: -1 })
        expect(isJwtExpired(expiredToken)).toBe(true)
        expect(isJwtExpired('not-a-token')).toBe(true)
    })
})

