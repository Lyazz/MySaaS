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

/**
 * Where the user currently is, in the shape the sidebar needs. Kept as a plain
 * object (rather than a vue-router RouteLocation) so the matching below stays
 * pure and testable.
 */
export type SettingsNavLocation = {
  path: string
  query?: Record<string, string | undefined | null>
  hash?: string
}

// Pages that render one of several sections chosen by `?section=`. Landing on
// the page with no query means the first section, so the nav has to treat a
// missing query and the default value as the same place.
export const SETTINGS_DEFAULT_SECTION: Record<string, string> = {
  '/admin/settings/functional': 'checkout'
}

/** Splits `/admin/settings/functional?section=fraud` into its three parts. */
export function parseSettingsNavTarget(to: string) {
  const [pathAndQuery = '', hash = ''] = to.split('#')
  const [path = '', queryString = ''] = pathAndQuery.split('?')
  const section = new URLSearchParams(queryString).get('section')
  return { path, section, hash: hash ? `#${hash}` : '' }
}

export function isSettingsNavItemActive(item: SettingsNavItem, location: SettingsNavLocation) {
  const target = parseSettingsNavTarget(item.to)
  if (location.path !== target.path) return false

  const currentHash = location.hash || ''
  const defaultSection = SETTINGS_DEFAULT_SECTION[target.path]
  const currentSection = (location.query?.section as string | undefined) || defaultSection

  if (target.section) return currentSection === target.section
  if (defaultSection && !target.hash) return currentSection === defaultSection
  if (target.hash) return currentHash === target.hash
  return !currentHash
}

export function findActiveSettingsNav(groups: SettingsNavGroup[], location: SettingsNavLocation) {
  for (const group of groups) {
    const item = group.items.find((candidate) => isSettingsNavItemActive(candidate, location))
    if (item) return { group, item }
  }
  return null
}

export type SettingsSearchEntry = {
  key: string
  to: string
  icon: string
  groupId: string
  /** Translated item label. */
  label: string
  /** Translated group label, shown as the result's breadcrumb. */
  groupLabel: string
  /** Extra translated words that should match, e.g. section field names. */
  keywords?: string[]
}

function normalizeSearchTerm(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    // Strip combining marks so "e" finds "é" and Arabic diacritics are ignored.
    .replace(/[\u0300-\u036f\u064b-\u0652]/g, '')
    .trim()
}

/**
 * Ranks settings destinations against a query. Label matches beat group and
 * keyword matches, and a prefix match beats a match in the middle of a word, so
 * typing "dom" puts Domains first rather than whatever merely mentions it.
 */
export function matchSettingsEntries(entries: SettingsSearchEntry[], query: string) {
  const term = normalizeSearchTerm(query)
  if (!term) return []

  const scored: Array<{ entry: SettingsSearchEntry; score: number }> = []

  for (const entry of entries) {
    const label = normalizeSearchTerm(entry.label)
    const group = normalizeSearchTerm(entry.groupLabel)
    const keywords = (entry.keywords || []).map(normalizeSearchTerm)

    let score = 0
    if (label.startsWith(term)) score = 100
    else if (label.includes(term)) score = 70
    else if (keywords.some((word) => word.startsWith(term))) score = 50
    else if (keywords.some((word) => word.includes(term))) score = 40
    else if (group.includes(term)) score = 20

    if (score > 0) scored.push({ entry, score })
  }

  return scored
    .sort((a, b) => b.score - a.score || a.entry.label.localeCompare(b.entry.label))
    .map(({ entry }) => entry)
}
