import { describe, expect, it } from 'vitest'
import { toSaasHost, toTenantHost } from '../composables/host'

describe('host helpers', () => {
  it('derives SaaS host from a tenant subdomain', () => {
    expect(toSaasHost('test.swekly.com', { platformBaseDomain: 'swekly.com' })).toBe('swekly.com')
  })

  it('derives tenant host from SaaS host', () => {
    expect(toTenantHost('swekly.com', 'test', { platformBaseDomain: 'swekly.com' })).toBe('test.swekly.com')
  })

  it('does not double-prefix when called with an already-tenant host', () => {
    // Regression: clicking "Go to store" from nokhba.swekly.com/admin was
    // producing nokhba.nokhba.swekly.com because the current host was passed
    // directly without stripping the existing subdomain first.
    expect(toTenantHost('nokhba.swekly.com', 'nokhba', { platformBaseDomain: 'swekly.com' })).toBe('nokhba.swekly.com')
    expect(toTenantHost('nokhba.swekly.com:3000', 'nokhba', { platformBaseDomain: 'swekly.com' })).toBe('nokhba.swekly.com:3000')
  })

  it('preserves ports', () => {
    expect(toSaasHost('test.swekly.com:3000', { platformBaseDomain: 'swekly.com' })).toBe('swekly.com:3000')
    expect(toTenantHost('swekly.com:3000', 'test', { platformBaseDomain: 'swekly.com' })).toBe(
      'test.swekly.com:3000'
    )
  })
})

