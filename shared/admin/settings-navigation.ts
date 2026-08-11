export type AdminRole = 'owner' | 'admin' | 'staff'

export type AdminSettingsResource =
  | 'storeSettings'
  | 'homepageSettings'
  | 'contactInfos'
  | 'integrations'
  | 'users'
  | 'billing'

export type AdminResource =
  | 'dashboard'
  | 'statistics'
  | 'products'
  | 'inventory'
  | 'categories'
  | 'suppliers'
  | 'purchases'
  | 'orders'
  | 'sales'
  | 'pos'
  | 'customers'
  | 'delivery'
  | 'cash'
  | 'metaPixels'
  | AdminSettingsResource
  | 'settingsHub'

export type SettingsNavItem = {
  key: string
  to: string
  labelKey: string
  icon: string
  resource: AdminSettingsResource
  external?: boolean
}

export type SettingsNavGroup = {
  id: string
  labelKey: string
  items: SettingsNavItem[]
}

export const SETTINGS_HUB_RESOURCES: AdminSettingsResource[] = [
  'storeSettings',
  'homepageSettings',
  'contactInfos',
  'integrations',
  'users',
  'billing'
]

// Flat, grouped sidebar nav for the settings area. Each item is one honest
// destination (a page, or a page + query/hash pointing at a single section) —
// no nested card grid, no scroll-jump pill tabs.
export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    id: 'store',
    labelKey: 'admin.settingsNav.groups.store',
    items: [
      { key: 'identity', to: '/admin/settings/appearance', labelKey: 'admin.settingsNav.items.identity', icon: 'lucide:palette', resource: 'storeSettings' },
      { key: 'theme', to: '/admin/settings/appearance#templates', labelKey: 'admin.settingsNav.items.theme', icon: 'lucide:layout-template', resource: 'storeSettings' },
      { key: 'homepage', to: '/admin/settings/homepage', labelKey: 'admin.settingsNav.items.homepage', icon: 'lucide:home', resource: 'homepageSettings' }
    ]
  },
  {
    id: 'commerce',
    labelKey: 'admin.settingsNav.groups.commerce',
    items: [
      { key: 'checkout', to: '/admin/settings/functional?section=checkout', labelKey: 'admin.settingsNav.items.checkout', icon: 'lucide:shopping-bag', resource: 'storeSettings' },
      { key: 'fraud', to: '/admin/settings/functional?section=fraud', labelKey: 'admin.settingsNav.items.fraud', icon: 'lucide:shield-ban', resource: 'storeSettings' },
      { key: 'loyalty', to: '/admin/settings/functional?section=loyalty', labelKey: 'admin.settingsNav.items.loyalty', icon: 'lucide:badge-percent', resource: 'storeSettings' },
      { key: 'clearance', to: '/admin/settings/functional?section=clearance', labelKey: 'admin.settingsNav.items.clearance', icon: 'lucide:package-open', resource: 'storeSettings' },
      { key: 'invoices', to: '/admin/settings/functional?section=invoices', labelKey: 'admin.settingsNav.items.invoices', icon: 'lucide:receipt-text', resource: 'storeSettings' }
    ]
  },
  {
    id: 'content',
    labelKey: 'admin.settingsNav.groups.content',
    items: [
      { key: 'contact', to: '/admin/settings/contact', labelKey: 'admin.settingsNav.items.contact', icon: 'lucide:phone', resource: 'contactInfos' },
      { key: 'legal', to: '/admin/settings/legal', labelKey: 'admin.settingsNav.items.legal', icon: 'lucide:file-text', resource: 'storeSettings' },
      { key: 'announcement', to: '/admin/settings/functional?section=announcement', labelKey: 'admin.settingsNav.items.announcement', icon: 'lucide:megaphone', resource: 'storeSettings' },
      { key: 'messaging', to: '/admin/settings/functional?section=messaging', labelKey: 'admin.settingsNav.items.messaging', icon: 'lucide:message-square', resource: 'storeSettings' }
    ]
  },
  {
    id: 'localization',
    labelKey: 'admin.settingsNav.groups.localization',
    items: [
      { key: 'localization', to: '/admin/settings/functional?section=localization', labelKey: 'admin.settingsNav.items.localization', icon: 'lucide:languages', resource: 'storeSettings' }
    ]
  },
  {
    id: 'connections',
    labelKey: 'admin.settingsNav.groups.connections',
    items: [
      { key: 'domains', to: '/admin/settings/domains', labelKey: 'admin.settingsNav.items.domains', icon: 'lucide:globe-2', resource: 'storeSettings' },
      { key: 'integrations', to: '/admin/integrations', labelKey: 'admin.settingsNav.items.integrations', icon: 'lucide:puzzle', resource: 'integrations', external: true }
    ]
  },
  {
    id: 'administration',
    labelKey: 'admin.settingsNav.groups.administration',
    items: [
      { key: 'team', to: '/admin/users', labelKey: 'admin.settingsNav.items.team', icon: 'lucide:user-cog', resource: 'users', external: true },
      { key: 'billing', to: '/admin/billing', labelKey: 'admin.settingsNav.items.billing', icon: 'lucide:credit-card', resource: 'billing', external: true },
      { key: 'maintenance', to: '/admin/settings/functional?section=maintenance', labelKey: 'admin.settingsNav.items.maintenance', icon: 'lucide:power-off', resource: 'storeSettings' }
    ]
  }
]

export function adminPathToResource(path: string): AdminResource | null {
  if (path === '/admin' || path.startsWith('/admin/dashboard')) return 'dashboard'
  if (path.startsWith('/admin/statistics')) return 'statistics'
  if (path.startsWith('/admin/products')) return 'products'
  if (path.startsWith('/admin/inventory')) return 'inventory'
  if (path.startsWith('/admin/categories')) return 'categories'
  if (path.startsWith('/admin/suppliers')) return 'suppliers'
  if (path.startsWith('/admin/purchases')) return 'purchases'
  if (path.startsWith('/admin/orders')) return 'orders'
  if (path.startsWith('/admin/sales')) return 'sales'
  if (path.startsWith('/admin/pos')) return 'pos'
  if (path.startsWith('/admin/customers')) return 'customers'
  if (path.startsWith('/admin/delivery')) return 'delivery'
  if (path.startsWith('/admin/cash')) return 'cash'
  if (path.startsWith('/admin/billing')) return 'billing'
  if (path === '/admin/settings') return 'settingsHub'
  if (path.startsWith('/admin/settings/appearance')) return 'storeSettings'
  if (path.startsWith('/admin/settings/homepage')) return 'homepageSettings'
  if (path.startsWith('/admin/settings/contact')) return 'contactInfos'
  if (path.startsWith('/admin/settings/functional')) return 'storeSettings'
  if (path.startsWith('/admin/settings/legal')) return 'storeSettings'
  if (path.startsWith('/admin/settings/domains')) return 'storeSettings'
  if (path.startsWith('/admin/integrations')) return 'integrations'
  if (path.startsWith('/admin/meta-pixels')) return 'metaPixels'
  if (path.startsWith('/admin/users')) return 'users'
  return null
}

export function permissionAllows(resource: string, permissions: string[]) {
  return permissions.includes(`${resource}:read`)
}

export function hasSettingsHubAccess(role: AdminRole, permissions: string[]) {
  if (role !== 'staff') return true
  return SETTINGS_HUB_RESOURCES.some((resource) => permissionAllows(resource, permissions))
}

export function filterSettingsNavForRole(
  groups: SettingsNavGroup[],
  role: AdminRole,
  permissions: string[]
) {
  if (role !== 'staff') return groups

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => permissionAllows(item.resource, permissions))
    }))
    .filter((group) => group.items.length > 0)
}
