export const DEFAULT_TENANT_FAVICON_URL = '/favicon.ico'
export const SAAS_LOGO_MARK_URL = '/swekly-logo-mark.svg'

export type FaviconResolutionInput = {
  tenant?: unknown | null
  storeSettings?: {
    faviconUrl?: string | null
  } | null
}

const normalizeFaviconUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export const resolveFaviconUrl = ({ tenant, storeSettings }: FaviconResolutionInput): string => {
  const customFavicon = normalizeFaviconUrl(storeSettings?.faviconUrl)
  if (customFavicon) return customFavicon

  if (tenant) return DEFAULT_TENANT_FAVICON_URL

  return SAAS_LOGO_MARK_URL
}
