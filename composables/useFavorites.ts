export type FavoritesStorageV1 = Record<string, string[]>

const FAVORITES_STORAGE_KEY_V1 = 'mysaas:favorites:v1'

const safeParse = (value: string | null): FavoritesStorageV1 => {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value) as unknown
    if (!parsed || typeof parsed !== 'object') return {}

    const out: FavoritesStorageV1 = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (!k) continue
      if (!Array.isArray(v)) continue
      const ids = v.filter((x): x is string => typeof x === 'string' && x.length > 0)
      out[k] = Array.from(new Set(ids))
    }
    return out
  } catch {
    return {}
  }
}

const tenantKeyFromContext = (tenant: any): string | null => {
  const id = tenant?.id
  if (typeof id === 'string' && id.length > 0) return id
  const slug = tenant?.slug
  if (typeof slug === 'string' && slug.length > 0) return slug
  return null
}

export const useFavorites = () => {
  const tenant = useState<any>('tenant')

  const storage = useState<FavoritesStorageV1>('favorites:storage:v1', () => ({}))
  const hydrated = useState<boolean>('favorites:hydrated', () => false)

  const tenantKey = computed(() => {
    const fromTenant = tenantKeyFromContext(tenant.value)
    if (fromTenant) return fromTenant
    if (process.client) return window.location.host
    return 'unknown'
  })

  const hydrateOnce = () => {
    if (!process.client) return
    if (hydrated.value) return
    hydrated.value = true
    storage.value = safeParse(localStorage.getItem(FAVORITES_STORAGE_KEY_V1))
  }

  const persist = () => {
    if (!process.client) return
    localStorage.setItem(FAVORITES_STORAGE_KEY_V1, JSON.stringify(storage.value))
  }

  /*
   * Reading localStorage during setup made the first client render disagree with
   * the server (which always has an empty store), so every storefront page hit
   * logged a hydration mismatch on the header's favourites badge. Wait for mount:
   * the first client render then matches the server and the badge fills in after.
   */
  if (getCurrentInstance()) onMounted(hydrateOnce)
  else hydrateOnce()

  const favoriteIds = computed<string[]>(() => storage.value[tenantKey.value] ?? [])
  const count = computed(() => favoriteIds.value.length)
  const isFavorite = (productId: string): boolean => favoriteIds.value.includes(productId)

  const setForTenant = (next: string[]) => {
    const uniq = Array.from(new Set(next.filter((x) => typeof x === 'string' && x.length > 0)))
    storage.value = { ...storage.value, [tenantKey.value]: uniq }
    persist()
  }

  const add = (productId: string) => {
    if (!productId) return
    if (isFavorite(productId)) return
    setForTenant([...favoriteIds.value, productId])
  }

  const remove = (productId: string) => {
    if (!productId) return
    if (!isFavorite(productId)) return
    setForTenant(favoriteIds.value.filter((id) => id !== productId))
  }

  const toggle = (productId: string): { isFavorite: boolean } => {
    if (isFavorite(productId)) {
      remove(productId)
      return { isFavorite: false }
    }
    add(productId)
    return { isFavorite: true }
  }

  const clear = () => setForTenant([])

  return {
    tenantKey,
    favoriteIds,
    count,
    isFavorite,
    add,
    remove,
    toggle,
    clear
  }
}

