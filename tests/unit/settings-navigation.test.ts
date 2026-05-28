import { describe, expect, it } from 'vitest'
import {
  SETTINGS_THEMES,
  adminPathToResource,
  filterSettingsThemesForRole,
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

  it('filters hub themes and links by staff permissions', () => {
    const themes = filterSettingsThemesForRole(SETTINGS_THEMES, 'staff', ['homepageSettings:read'])

    expect(themes.map((theme) => theme.id)).toEqual(['content'])
    expect(themes[0].links).toEqual([
      expect.objectContaining({
        to: '/admin/settings/homepage',
        resource: 'homepageSettings'
      })
    ])
  })

  it('keeps all themes visible for admins and owners', () => {
    expect(filterSettingsThemesForRole(SETTINGS_THEMES, 'admin', [])).toHaveLength(SETTINGS_THEMES.length)
    expect(filterSettingsThemesForRole(SETTINGS_THEMES, 'owner', [])).toHaveLength(SETTINGS_THEMES.length)
  })
})
