import { describe, expect, it } from 'vitest'
import {
  SETTINGS_NAV_GROUPS,
  findActiveSettingsNav,
  isSettingsNavItemActive,
  matchSettingsEntries,
  parseSettingsNavTarget,
  type SettingsNavItem,
  type SettingsSearchEntry
} from '../../shared/admin/settings-navigation'

function item(to: string): SettingsNavItem {
  return { key: 'x', to, labelKey: 'x', icon: 'x', resource: 'storeSettings' }
}

describe('parseSettingsNavTarget', () => {
  it('splits path, section and hash', () => {
    expect(parseSettingsNavTarget('/admin/settings/functional?section=fraud')).toEqual({
      path: '/admin/settings/functional',
      section: 'fraud',
      hash: ''
    })
    expect(parseSettingsNavTarget('/admin/settings/appearance#templates')).toEqual({
      path: '/admin/settings/appearance',
      section: null,
      hash: '#templates'
    })
    expect(parseSettingsNavTarget('/admin/users')).toEqual({
      path: '/admin/users',
      section: null,
      hash: ''
    })
  })
})

describe('isSettingsNavItemActive', () => {
  it('matches a plain page only when no hash is open', () => {
    const identity = item('/admin/settings/appearance')
    expect(isSettingsNavItemActive(identity, { path: '/admin/settings/appearance' })).toBe(true)
    expect(isSettingsNavItemActive(identity, { path: '/admin/settings/appearance', hash: '#templates' })).toBe(false)
    expect(isSettingsNavItemActive(identity, { path: '/admin/settings/homepage' })).toBe(false)
  })

  it('matches a hash target only on that hash', () => {
    const theme = item('/admin/settings/appearance#templates')
    expect(isSettingsNavItemActive(theme, { path: '/admin/settings/appearance', hash: '#templates' })).toBe(true)
    expect(isSettingsNavItemActive(theme, { path: '/admin/settings/appearance' })).toBe(false)
  })

  it('matches a section target on its query value', () => {
    const fraud = item('/admin/settings/functional?section=fraud')
    expect(isSettingsNavItemActive(fraud, { path: '/admin/settings/functional', query: { section: 'fraud' } })).toBe(true)
    expect(isSettingsNavItemActive(fraud, { path: '/admin/settings/functional', query: { section: 'loyalty' } })).toBe(false)
  })

  it('treats a missing section as the page default', () => {
    const checkout = item('/admin/settings/functional?section=checkout')
    // Landing on /admin/settings/functional renders the checkout section, so
    // the checkout entry has to light up even with no query present.
    expect(isSettingsNavItemActive(checkout, { path: '/admin/settings/functional' })).toBe(true)
  })
})

describe('findActiveSettingsNav', () => {
  it('returns the group and item for the current location', () => {
    const active = findActiveSettingsNav(SETTINGS_NAV_GROUPS, {
      path: '/admin/settings/functional',
      query: { section: 'loyalty' }
    })
    expect(active?.group.id).toBe('commerce')
    expect(active?.item.key).toBe('loyalty')
  })

  it('returns null away from settings', () => {
    expect(findActiveSettingsNav(SETTINGS_NAV_GROUPS, { path: '/admin/orders' })).toBeNull()
  })

  it('resolves every nav entry back to itself', () => {
    for (const group of SETTINGS_NAV_GROUPS) {
      for (const navItem of group.items) {
        const target = parseSettingsNavTarget(navItem.to)
        const active = findActiveSettingsNav(SETTINGS_NAV_GROUPS, {
          path: target.path,
          query: target.section ? { section: target.section } : {},
          hash: target.hash
        })
        expect(active?.item.key, `${navItem.to} should resolve to ${navItem.key}`).toBe(navItem.key)
      }
    }
  })
})

describe('matchSettingsEntries', () => {
  const entries: SettingsSearchEntry[] = [
    { key: 'domains', to: '/admin/settings/domains', icon: 'i', groupId: 'connections', label: 'Domaines', groupLabel: 'Connexions', keywords: ['domains'] },
    { key: 'loyalty', to: '/admin/settings/functional?section=loyalty', icon: 'i', groupId: 'commerce', label: 'Programme de fidélité', groupLabel: 'Commerce', keywords: ['loyalty'] },
    { key: 'checkout', to: '/admin/settings/functional?section=checkout', icon: 'i', groupId: 'commerce', label: 'Paiement et panier', groupLabel: 'Commerce', keywords: ['checkout'] }
  ]

  it('returns nothing for an empty query', () => {
    expect(matchSettingsEntries(entries, '')).toEqual([])
    expect(matchSettingsEntries(entries, '   ')).toEqual([])
  })

  it('matches the translated label', () => {
    expect(matchSettingsEntries(entries, 'domaine').map((e) => e.key)).toEqual(['domains'])
  })

  it('matches the English key from any locale', () => {
    expect(matchSettingsEntries(entries, 'loyalty').map((e) => e.key)).toEqual(['loyalty'])
  })

  it('ignores accents and case', () => {
    expect(matchSettingsEntries(entries, 'FIDELITE').map((e) => e.key)).toEqual(['loyalty'])
  })

  it('matches the group label so a group name lists its pages', () => {
    expect(matchSettingsEntries(entries, 'commerce').map((e) => e.key).sort()).toEqual(['checkout', 'loyalty'])
  })

  it('ranks a label prefix above a keyword or group match', () => {
    const ranked = matchSettingsEntries(
      [
        { key: 'a', to: '/a', icon: 'i', groupId: 'g', label: 'Other', groupLabel: 'Paiement', keywords: [] },
        { key: 'b', to: '/b', icon: 'i', groupId: 'g', label: 'Paiement et panier', groupLabel: 'Commerce', keywords: [] }
      ],
      'paiement'
    )
    expect(ranked.map((e) => e.key)).toEqual(['b', 'a'])
  })
})
