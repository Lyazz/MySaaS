import { describe, expect, it, beforeAll } from 'vitest'

/**
 * The draft gate decides whether an unpublished storefront is visible. It runs on
 * two surfaces with two different clients, so the rule itself is worth pinning
 * down independently of either middleware.
 */
describe('draft storefront gate', () => {
  let mod: typeof import('../../backend/src/lib/draft-storefront')
  let signAccessToken: typeof import('../../backend/src/lib/jwt')['signAccessToken']

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'draft-gate-test-secret'
    mod = await import('../../backend/src/lib/draft-storefront')
    ;({ signAccessToken } = await import('../../backend/src/lib/jwt'))
  })

  describe('readCookie', () => {
    it('reads a cookie from the middle of the header', () => {
      expect(mod.readCookie('a=1; auth_token=abc; b=2', 'auth_token')).toBe('abc')
    })

    it('reads a cookie with no surrounding whitespace', () => {
      expect(mod.readCookie('auth_token=abc', 'auth_token')).toBe('abc')
    })

    it('does not match a cookie whose name merely ends with the one asked for', () => {
      expect(mod.readCookie('other_auth_token=abc', 'auth_token')).toBeNull()
    })

    it('returns null when the header is absent or the cookie is missing', () => {
      expect(mod.readCookie(undefined, 'auth_token')).toBeNull()
      expect(mod.readCookie('a=1; b=2', 'auth_token')).toBeNull()
    })

    it('url-decodes the value', () => {
      expect(mod.readCookie('auth_token=a%20b', 'auth_token')).toBe('a b')
    })
  })

  describe('isTenantMemberToken', () => {
    it('accepts a valid token for the same tenant', () => {
      const token = signAccessToken({ userId: 'u1', tenantId: 'tenant-a', role: 'owner' })
      expect(mod.isTenantMemberToken(token, 'tenant-a')).toBe(true)
    })

    it('rejects a valid token minted for a different tenant', () => {
      const token = signAccessToken({ userId: 'u1', tenantId: 'tenant-b', role: 'owner' })
      expect(mod.isTenantMemberToken(token, 'tenant-a')).toBe(false)
    })

    it('rejects a forged or malformed token', () => {
      expect(mod.isTenantMemberToken('not-a-token', 'tenant-a')).toBe(false)
      expect(mod.isTenantMemberToken(null, 'tenant-a')).toBe(false)
      expect(mod.isTenantMemberToken(undefined, 'tenant-a')).toBe(false)
    })

    it('rejects a token carrying no tenant at all', () => {
      const token = signAccessToken({ userId: 'u1', role: 'superadmin' })
      expect(mod.isTenantMemberToken(token, 'tenant-a')).toBe(false)
    })
  })

  describe('isDraftAllowedPath', () => {
    it('keeps the merchant’s way back in open', () => {
      for (const path of ['/admin', '/admin/onboarding', '/login', '/register', '/forgot-password']) {
        expect(mod.isDraftAllowedPath(path)).toBe(true)
      }
    })

    it('gates every storefront path', () => {
      for (const path of ['/', '/products', '/checkout', '/cart', '/p/some-product']) {
        expect(mod.isDraftAllowedPath(path)).toBe(false)
      }
    })
  })
})
