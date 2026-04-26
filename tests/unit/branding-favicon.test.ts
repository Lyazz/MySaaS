import { describe, it, expect } from 'vitest'
import {
  DEFAULT_TENANT_FAVICON_URL,
  SAAS_LOGO_MARK_URL,
  resolveFaviconUrl
} from '../../utils/branding'

describe('resolveFaviconUrl', () => {
  it('returns tenant custom favicon when provided', () => {
    const favicon = resolveFaviconUrl({
      tenant: { id: 'tenant-1' },
      storeSettings: { faviconUrl: 'https://cdn.example.com/custom.ico' }
    })

    expect(favicon).toBe('https://cdn.example.com/custom.ico')
  })

  it('returns default tenant favicon when tenant exists without custom favicon', () => {
    const favicon = resolveFaviconUrl({
      tenant: { id: 'tenant-1' },
      storeSettings: { faviconUrl: '   ' }
    })

    expect(favicon).toBe(DEFAULT_TENANT_FAVICON_URL)
  })

  it('returns SaaS logo mark favicon when no tenant context exists', () => {
    const favicon = resolveFaviconUrl({
      tenant: null,
      storeSettings: null
    })

    expect(favicon).toBe(SAAS_LOGO_MARK_URL)
  })
})
