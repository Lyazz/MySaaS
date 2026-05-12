import { describe, expect, it } from 'vitest'
import {
  getPlatformLegalFooterLabel,
  getPlatformLegalPage,
  isPlatformLegalPageKey,
  PLATFORM_LEGAL_PAGE_KEYS,
  PLATFORM_LEGAL_PAGES,
  platformLegalLinks
} from '../../shared/platform/legal-pages'

describe('platform legal pages', () => {
  it('defines a public page and footer link for every platform legal policy', () => {
    expect(PLATFORM_LEGAL_PAGE_KEYS).toEqual([
      'terms',
      'privacy',
      'cookies',
      'billing'
    ])

    expect(platformLegalLinks).toHaveLength(PLATFORM_LEGAL_PAGE_KEYS.length)

    for (const key of PLATFORM_LEGAL_PAGE_KEYS) {
      const page = PLATFORM_LEGAL_PAGES[key]
      expect(page.key).toBe(key)
      expect(page.title.length).toBeGreaterThan(0)
      expect(page.footerLabel.en.length).toBeGreaterThan(0)
      expect(page.footerLabel.fr.length).toBeGreaterThan(0)
      expect(page.footerLabel.ar.length).toBeGreaterThan(0)
      expect(page.description.length).toBeGreaterThan(0)
      expect(page.sections.length).toBeGreaterThan(0)
      expect(platformLegalLinks.find((link) => link.key === key)?.to).toBe(`/legal/${key}`)
    }
  })

  it('makes tenant responsibility explicit without market-specific wording', () => {
    const body = Object.values(PLATFORM_LEGAL_PAGES)
      .flatMap((page) => [
        page.title,
        page.description,
        ...page.sections.flatMap((section) => [
          section.heading,
          ...section.paragraphs,
          ...(section.bullets || [])
        ])
      ])
      .join(' ')

    expect(body).toContain('Swekly is a technical platform provider')
    expect(body).toContain('Tenants are independent businesses')
    expect(body).toContain('Swekly disclaims responsibility for tenant activities')
    const disallowedTerms = [
      `Alg${'eria'}`,
      `Alg${'erian'}`,
      `Alg${'erie'}`,
      `D${'ZD'}`,
      `wil${'aya'}`,
      `comm${'une'}`
    ]

    for (const term of disallowedTerms) {
      expect(body.toLowerCase()).not.toContain(term.toLowerCase())
    }
  })

  it('resolves only known platform legal pages', () => {
    expect(isPlatformLegalPageKey('privacy')).toBe(true)
    expect(getPlatformLegalPage('privacy')?.title).toBe('Privacy Policy')
    expect(isPlatformLegalPageKey('acceptable-use')).toBe(false)
    expect(getPlatformLegalPage('acceptable-use')).toBeNull()
    expect(isPlatformLegalPageKey('tenant-responsibility')).toBe(false)
    expect(getPlatformLegalPage('tenant-responsibility')).toBeNull()
  })

  it('returns localized footer labels while keeping page content in English', () => {
    expect(getPlatformLegalFooterLabel('terms', 'en')).toBe('Terms of Service')
    expect(getPlatformLegalFooterLabel('terms', 'fr')).toBe('Conditions de service')
    expect(getPlatformLegalFooterLabel('terms', 'ar')).toBe('شروط الخدمة')
    expect(getPlatformLegalFooterLabel('billing', 'unknown')).toBe('Billing and Subscription Terms')

    expect(PLATFORM_LEGAL_PAGES.terms.title).toBe('Terms of Service')
    expect(PLATFORM_LEGAL_PAGES.terms.sections[0].heading).toBe('Platform role')
  })

  it('states the 30-day subscription refund window in billing terms', () => {
    const billingBody = PLATFORM_LEGAL_PAGES.billing.sections
      .flatMap((section) => [section.heading, ...section.paragraphs])
      .join(' ')

    expect(billingBody).toContain('within 30 days of the subscription payment date')
  })
})
