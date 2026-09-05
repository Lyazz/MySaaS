import { describe, expect, it } from 'vitest'
import {
  SETTINGS_NAV_GROUPS,
  adminPathToResource,
  filterSettingsNavForRole,
  hasSettingsHubAccess
} from '../../shared/admin/settings-navigation'

describe('settings navigation', () => {
  it('maps settings routes to the correct RBAC resources', () => {
    expect(adminPathToResource('/admin/settings')).toBe('settingsHub')
    expect(adminPathToResource('/admin/settings/appearance')).toBe('storeSettings')
    expect(adminPathToResource('/admin/settings/homepage')).toBe('homepageSettings')
    expect(adminPathToResource('/admin/settings/contact')).toBe('contactInfos')
    expect(adminPathToResource('/admin/settings/functional')).toBe('storeSettings')
    expect(adminPathToResource('/admin/settings/domains')).toBe('storeSettings')
  })

  it('allows the settings hub when staff has at least one settings permission', () => {
    expect(hasSettingsHubAccess('staff', [])).toBe(false)
    expect(hasSettingsHubAccess('staff', ['orders:read'])).toBe(false)
    expect(hasSettingsHubAccess('staff', ['storeSettings:read'])).toBe(true)
    expect(hasSettingsHubAccess('staff', ['homepageSettings:read'])).toBe(true)
    expect(hasSettingsHubAccess('staff', ['contactInfos:read'])).toBe(true)
    expect(hasSettingsHubAccess('staff', ['integrations:read'])).toBe(true)
  })

  it('filters nav groups and items by staff permissions', () => {
    const groups = filterSettingsNavForRole(SETTINGS_NAV_GROUPS, 'staff', ['homepageSettings:read'])

    expect(groups.map((group) => group.id)).toEqual(['store'])
    expect(groups[0].items).toEqual([
      expect.objectContaining({
        key: 'homepage',
        to: '/admin/settings/homepage',
        resource: 'homepageSettings'
      })
    ])
  })

  it('keeps all groups visible for admins and owners', () => {
    expect(filterSettingsNavForRole(SETTINGS_NAV_GROUPS, 'admin', [])).toHaveLength(SETTINGS_NAV_GROUPS.length)
    expect(filterSettingsNavForRole(SETTINGS_NAV_GROUPS, 'owner', [])).toHaveLength(SETTINGS_NAV_GROUPS.length)
  })
})
