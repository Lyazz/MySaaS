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

export type SettingsThemeLink = {
  to: string
  labelKey: string
  descriptionKey: string
  icon: string
  resource: AdminSettingsResource
}

export type SettingsThemeSection = {
  id: string
  labelKey: string
  links: SettingsThemeLink[]
}

export type SettingsTheme = {
  id: string
  icon: string
  labelKey: string
  descriptionKey: string
  links: SettingsThemeLink[]
  sections: SettingsThemeSection[]
}

export const SETTINGS_HUB_RESOURCES: AdminSettingsResource[] = [
  'storeSettings',
  'homepageSettings',
  'contactInfos',
  'integrations',
  'users',
  'billing'
]

export const SETTINGS_THEMES: SettingsTheme[] = [
  {
    id: 'identity',
    icon: 'lucide:palette',
    labelKey: 'admin.settingsHub.themes.identity.title',
    descriptionKey: 'admin.settingsHub.themes.identity.description',
    links: [
      {
        to: '/admin/settings/appearance',
        labelKey: 'admin.settingsHub.links.appearance',
        descriptionKey: 'admin.settingsHub.linkDescriptions.appearance',
        icon: 'lucide:palette',
        resource: 'storeSettings'
      }
    ],
    sections: [
      {
        id: 'brand',
        labelKey: 'admin.settingsHub.sections.brand',
        links: [
          {
            to: '/admin/settings/appearance',
            labelKey: 'admin.settingsHub.links.appearance',
            descriptionKey: 'admin.settingsHub.linkDescriptions.appearance',
            icon: 'lucide:palette',
            resource: 'storeSettings'
          }
        ]
      }
    ]
  },
  {
    id: 'content',
    icon: 'lucide:layout-grid',
    labelKey: 'admin.settingsHub.themes.content.title',
    descriptionKey: 'admin.settingsHub.themes.content.description',
    links: [
      {
        to: '/admin/settings/homepage',
        labelKey: 'admin.settingsHub.links.homepage',
        descriptionKey: 'admin.settingsHub.linkDescriptions.homepage',
        icon: 'lucide:home',
        resource: 'homepageSettings'
      },
      {
        to: '/admin/settings/contact',
        labelKey: 'admin.settingsHub.links.contact',
        descriptionKey: 'admin.settingsHub.linkDescriptions.contact',
        icon: 'lucide:phone',
        resource: 'contactInfos'
      },
      {
        to: '/admin/settings/legal',
        labelKey: 'admin.settingsHub.links.legal',
        descriptionKey: 'admin.settingsHub.linkDescriptions.legal',
        icon: 'lucide:file-text',
        resource: 'storeSettings'
      }
    ],
    sections: [
      {
        id: 'storefront-content',
        labelKey: 'admin.settingsHub.sections.storefrontContent',
        links: [
          {
            to: '/admin/settings/homepage',
            labelKey: 'admin.settingsHub.links.homepage',
            descriptionKey: 'admin.settingsHub.linkDescriptions.homepage',
            icon: 'lucide:home',
            resource: 'homepageSettings'
          },
          {
            to: '/admin/settings/contact',
            labelKey: 'admin.settingsHub.links.contact',
            descriptionKey: 'admin.settingsHub.linkDescriptions.contact',
            icon: 'lucide:phone',
            resource: 'contactInfos'
          },
          {
            to: '/admin/settings/legal',
            labelKey: 'admin.settingsHub.links.legal',
            descriptionKey: 'admin.settingsHub.linkDescriptions.legal',
            icon: 'lucide:file-text',
            resource: 'storeSettings'
          }
        ]
      }
    ]
  },
  {
    id: 'checkout',
    icon: 'lucide:shopping-bag',
    labelKey: 'admin.settingsHub.themes.checkout.title',
    descriptionKey: 'admin.settingsHub.themes.checkout.description',
    links: [
      {
        to: '/admin/settings/functional#features',
        labelKey: 'admin.settingsHub.links.salesFeatures',
        descriptionKey: 'admin.settingsHub.linkDescriptions.salesFeatures',
        icon: 'lucide:shopping-bag',
        resource: 'storeSettings'
      },
      {
        to: '/admin/settings/functional#checkout',
        labelKey: 'admin.settingsHub.links.checkoutRules',
        descriptionKey: 'admin.settingsHub.linkDescriptions.checkoutRules',
        icon: 'lucide:credit-card',
        resource: 'storeSettings'
      }
    ],
    sections: [
      {
        id: 'store-features',
        labelKey: 'admin.settingsHub.sections.storeFeatures',
        links: [
          {
            to: '/admin/settings/functional#features',
            labelKey: 'admin.settingsHub.links.salesFeatures',
            descriptionKey: 'admin.settingsHub.linkDescriptions.salesFeatures',
            icon: 'lucide:shopping-bag',
            resource: 'storeSettings'
          }
        ]
      },
      {
        id: 'checkout-rules',
        labelKey: 'admin.settingsHub.sections.checkoutRules',
        links: [
          {
            to: '/admin/settings/functional#checkout',
            labelKey: 'admin.settingsHub.links.checkoutRules',
            descriptionKey: 'admin.settingsHub.linkDescriptions.checkoutRules',
            icon: 'lucide:credit-card',
            resource: 'storeSettings'
          }
        ]
      }
    ]
  },
  {
    id: 'invoices',
    icon: 'lucide:receipt-text',
    labelKey: 'admin.settingsHub.themes.invoices.title',
    descriptionKey: 'admin.settingsHub.themes.invoices.description',
    links: [
      {
        to: '/admin/settings/functional#invoices',
        labelKey: 'admin.settingsHub.links.salesInvoices',
        descriptionKey: 'admin.settingsHub.linkDescriptions.salesInvoices',
        icon: 'lucide:receipt-text',
        resource: 'storeSettings'
      }
    ],
    sections: [
      {
        id: 'invoice-documents',
        labelKey: 'admin.settingsHub.sections.invoiceDocuments',
        links: [
          {
            to: '/admin/settings/functional#invoices',
            labelKey: 'admin.settingsHub.links.salesInvoices',
            descriptionKey: 'admin.settingsHub.linkDescriptions.salesInvoices',
            icon: 'lucide:receipt-text',
            resource: 'storeSettings'
          }
        ]
      }
    ]
  },
  {
    id: 'localization',
    icon: 'lucide:languages',
    labelKey: 'admin.settingsHub.themes.localization.title',
    descriptionKey: 'admin.settingsHub.themes.localization.description',
    links: [
      {
        to: '/admin/settings/functional#currency',
        labelKey: 'admin.settingsHub.links.currency',
        descriptionKey: 'admin.settingsHub.linkDescriptions.currency',
        icon: 'lucide:circle-dollar-sign',
        resource: 'storeSettings'
      },
      {
        to: '/admin/settings/functional#localization',
        labelKey: 'admin.settingsHub.links.language',
        descriptionKey: 'admin.settingsHub.linkDescriptions.language',
        icon: 'lucide:languages',
        resource: 'storeSettings'
      }
    ],
    sections: [
      {
        id: 'market-format',
        labelKey: 'admin.settingsHub.sections.marketFormat',
        links: [
          {
            to: '/admin/settings/functional#currency',
            labelKey: 'admin.settingsHub.links.currency',
            descriptionKey: 'admin.settingsHub.linkDescriptions.currency',
            icon: 'lucide:circle-dollar-sign',
            resource: 'storeSettings'
          },
          {
            to: '/admin/settings/functional#localization',
            labelKey: 'admin.settingsHub.links.language',
            descriptionKey: 'admin.settingsHub.linkDescriptions.language',
            icon: 'lucide:languages',
            resource: 'storeSettings'
          }
        ]
      }
    ]
  },
  {
    id: 'marketing',
    icon: 'lucide:badge-percent',
    labelKey: 'admin.settingsHub.themes.marketing.title',
    descriptionKey: 'admin.settingsHub.themes.marketing.description',
    links: [
      {
        to: '/admin/settings/functional#announcement',
        labelKey: 'admin.settingsHub.links.announcement',
        descriptionKey: 'admin.settingsHub.linkDescriptions.announcement',
        icon: 'lucide:megaphone',
        resource: 'storeSettings'
      },
      {
        to: '/admin/settings/functional#loyalty',
        labelKey: 'admin.settingsHub.links.loyalty',
        descriptionKey: 'admin.settingsHub.linkDescriptions.loyalty',
        icon: 'lucide:badge-percent',
        resource: 'storeSettings'
      }
    ],
    sections: [
      {
        id: 'growth',
        labelKey: 'admin.settingsHub.sections.growth',
        links: [
          {
            to: '/admin/settings/functional#announcement',
            labelKey: 'admin.settingsHub.links.announcement',
            descriptionKey: 'admin.settingsHub.linkDescriptions.announcement',
            icon: 'lucide:megaphone',
            resource: 'storeSettings'
          },
          {
            to: '/admin/settings/functional#loyalty',
            labelKey: 'admin.settingsHub.links.loyalty',
            descriptionKey: 'admin.settingsHub.linkDescriptions.loyalty',
            icon: 'lucide:badge-percent',
            resource: 'storeSettings'
          }
        ]
      }
    ]
  },
  {
    id: 'connections',
    icon: 'lucide:plug-zap',
    labelKey: 'admin.settingsHub.themes.connections.title',
    descriptionKey: 'admin.settingsHub.themes.connections.description',
    links: [
      {
        to: '/admin/settings/domains',
        labelKey: 'admin.settingsHub.links.domains',
        descriptionKey: 'admin.settingsHub.linkDescriptions.domains',
        icon: 'lucide:globe-2',
        resource: 'storeSettings'
      },
      {
        to: '/admin/integrations',
        labelKey: 'admin.settingsHub.links.integrations',
        descriptionKey: 'admin.settingsHub.linkDescriptions.integrations',
        icon: 'lucide:puzzle',
        resource: 'integrations'
      }
    ],
    sections: [
      {
        id: 'external-access',
        labelKey: 'admin.settingsHub.sections.externalAccess',
        links: [
          {
            to: '/admin/settings/domains',
            labelKey: 'admin.settingsHub.links.domains',
            descriptionKey: 'admin.settingsHub.linkDescriptions.domains',
            icon: 'lucide:globe-2',
            resource: 'storeSettings'
          },
          {
            to: '/admin/integrations',
            labelKey: 'admin.settingsHub.links.integrations',
            descriptionKey: 'admin.settingsHub.linkDescriptions.integrations',
            icon: 'lucide:puzzle',
            resource: 'integrations'
          }
        ]
      }
    ]
  },
  {
    id: 'administration',
    icon: 'lucide:user-cog',
    labelKey: 'admin.settingsHub.themes.administration.title',
    descriptionKey: 'admin.settingsHub.themes.administration.description',
    links: [
      {
        to: '/admin/users',
        labelKey: 'admin.settingsHub.links.users',
        descriptionKey: 'admin.settingsHub.linkDescriptions.users',
        icon: 'lucide:user-cog',
        resource: 'users'
      },
      {
        to: '/admin/billing',
        labelKey: 'admin.settingsHub.links.billing',
        descriptionKey: 'admin.settingsHub.linkDescriptions.billing',
        icon: 'lucide:credit-card',
        resource: 'billing'
      }
    ],
    sections: [
      {
        id: 'workspace-admin',
        labelKey: 'admin.settingsHub.sections.workspaceAdmin',
        links: [
          {
            to: '/admin/users',
            labelKey: 'admin.settingsHub.links.users',
            descriptionKey: 'admin.settingsHub.linkDescriptions.users',
            icon: 'lucide:user-cog',
            resource: 'users'
          },
          {
            to: '/admin/billing',
            labelKey: 'admin.settingsHub.links.billing',
            descriptionKey: 'admin.settingsHub.linkDescriptions.billing',
            icon: 'lucide:credit-card',
            resource: 'billing'
          }
        ]
      }
    ]
  }
]

export function adminPathToResource(path: string): AdminResource | null {
  if (path === '/admin' || path.startsWith('/admin/dashboard')) return 'dashboard'
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

export function filterSettingsThemesForRole(
  themes: SettingsTheme[],
  role: AdminRole,
  permissions: string[]
) {
  if (role !== 'staff') return themes

  return themes
    .map((theme) => ({
      ...theme,
      links: theme.links.filter((link) => permissionAllows(link.resource, permissions)),
      sections: theme.sections
        .map((section) => ({
          ...section,
          links: section.links.filter((link) => permissionAllows(link.resource, permissions))
        }))
        .filter((section) => section.links.length > 0)
    }))
    .filter((theme) => theme.links.length > 0)
}
