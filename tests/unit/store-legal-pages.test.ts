import { describe, it, expect } from 'vitest'
import {
  buildDefaultStoreLegalPagesConfig,
  isValidStoreLegalPagesConfig,
  normalizeStoreLegalPagesConfig
} from '../../shared/storefront/legal-pages'

describe('store legal pages config helpers', () => {
  it('builds disabled defaults with FR/EN/AR content for all pages', () => {
    const config = buildDefaultStoreLegalPagesConfig()

    expect(config.terms.enabled).toBe(false)
    expect(config.privacy.enabled).toBe(false)
    expect(config.returns.enabled).toBe(false)
    expect(config.contact.enabled).toBe(false)

    expect(config.terms.title.fr.length).toBeGreaterThan(0)
    expect(config.terms.title.en.length).toBeGreaterThan(0)
    expect(config.terms.title.ar.length).toBeGreaterThan(0)
    expect(config.privacy.content.fr.length).toBeGreaterThan(0)
    expect(config.privacy.content.en.length).toBeGreaterThan(0)
    expect(config.privacy.content.ar.length).toBeGreaterThan(0)
  })

  it('normalizes malformed values back to safe defaults', () => {
    const normalized = normalizeStoreLegalPagesConfig({
      terms: {
        enabled: true,
        title: { fr: 'CGU', en: 'Terms', ar: 'الشروط' },
        content: { fr: 'FR', en: 'EN' }
      }
    })

    expect(normalized.terms.enabled).toBe(true)
    expect(normalized.terms.content.fr).toBe('FR')
    expect(normalized.terms.content.en).toBe('EN')
    expect(normalized.terms.content.ar.length).toBeGreaterThan(0)
    expect(normalized.privacy.enabled).toBe(false)
  })

  it('validates strict shape for payload persistence', () => {
    const valid = buildDefaultStoreLegalPagesConfig()
    valid.contact.enabled = true

    expect(isValidStoreLegalPagesConfig(valid)).toBe(true)
    expect(isValidStoreLegalPagesConfig({ terms: { enabled: true } })).toBe(false)
  })
})
