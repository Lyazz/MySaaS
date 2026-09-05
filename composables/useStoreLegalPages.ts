import {
  normalizeStoreLegalPagesConfig,
  type StoreLegalLanguage,
  type StoreLegalPageKey
} from '~/shared/storefront/legal-pages'

export function useStoreLegalPagesConfig() {
  const storeSettings = useState<any>('storeSettings')

  return computed(() => normalizeStoreLegalPagesConfig(storeSettings.value?.legalPages))
}

export function useStoreLegalLinks() {
  const config = useStoreLegalPagesConfig()

  return computed(() => ({
    terms: {
      enabled: config.value.terms.enabled,
      path: '/legal/terms'
    },
    privacy: {
      enabled: config.value.privacy.enabled,
      path: '/legal/privacy'
    },
    returns: {
      enabled: config.value.returns.enabled,
      path: '/legal/returns'
    },
    contact: {
      enabled: config.value.contact.enabled,
      path: '/legal/contact'
    }
  }))
}

export function useStoreLegalPageContent() {
  const config = useStoreLegalPagesConfig()
  const { locale } = useI18n({ useScope: 'global' })

  const resolveLanguage = (): StoreLegalLanguage => {
    const value = locale.value
    if (value === 'fr' || value === 'en' || value === 'ar') return value
    return 'fr'
  }

  const resolveForPage = (page: StoreLegalPageKey) => {
    const lang = resolveLanguage()
    const entry = config.value[page]

    return {
      enabled: entry.enabled,
      page,
      lang,
      title: entry.title[lang],
      content: entry.content[lang]
    }
  }

  return {
    config,
    resolveForPage
  }
}
