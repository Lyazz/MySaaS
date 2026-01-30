import { describe, expect, it } from 'vitest'
import { parseHost } from '../backend/src/lib/tenant-host'

describe('tenant host parsing', () => {
  it('treats localhost as SaaS host', () => {
    expect(parseHost('localhost:3000')).toEqual({ kind: 'saas' })
  })

  it('parses {slug}.localhost as tenant subdomain', () => {
    expect(parseHost('apple.localhost:3000')).toEqual({ kind: 'tenant-subdomain', slug: 'apple' })
  })

  it('parses {slug}.platform.com as tenant subdomain', () => {
    expect(parseHost('tenant-a.platform.com')).toEqual({ kind: 'tenant-subdomain', slug: 'tenant-a' })
  })

  it('parses {slug}.{ip}.nip.io as tenant subdomain for LAN dev', () => {
    expect(parseHost('apple.192.168.1.5.nip.io')).toEqual({ kind: 'tenant-subdomain', slug: 'apple' })
  })

  it('treats bare {ip}.nip.io as SaaS host', () => {
    expect(parseHost('192.168.1.5.nip.io')).toEqual({ kind: 'saas' })
  })

  it('treats plain IPv4 host as SaaS host', () => {
    expect(parseHost('192.168.1.5')).toEqual({ kind: 'saas' })
  })

  it('ignores www.platform.com as SaaS host', () => {
    expect(parseHost('www.platform.com')).toEqual({ kind: 'saas' })
  })

  it('handles comma-separated forwarded hosts', () => {
    expect(parseHost('demo.localhost:3000, other-host')).toEqual({ kind: 'tenant-subdomain', slug: 'demo' })
  })

  it('treats unknown hostnames as custom domains', () => {
    expect(parseHost('store-example.com')).toEqual({ kind: 'custom-domain', domain: 'store-example.com' })
    expect(parseHost('store-example.com:443')).toEqual({ kind: 'custom-domain', domain: 'store-example.com' })
  })
})
