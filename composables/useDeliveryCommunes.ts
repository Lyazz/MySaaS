import { computed, ref, watch } from 'vue'
import { useTenantApiHeaders, useTenantApiUrl } from '~/composables/useTenantApi'

export type DeliveryCommune = {
  name: string
  /**
   * The id each carrier uses for this commune, keyed by provider — `{ MAYSTRO: '227' }`.
   * Carriers share no commune identifier and spell names differently, so a carrier must be
   * addressed with its own id. A carrier missing from this map does not serve the commune
   * under this name and simply will not quote it.
   */
  ids: Record<string, string>
}

type Cache = Record<string, DeliveryCommune[]>

export const useDeliveryCommunes = (wilayaCode: () => string) => {
  const cache = useState<Cache>('delivery-communes-cache', () => ({}))

  const communes = ref<DeliveryCommune[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const normalizedWilaya = computed(() => String(wilayaCode() || '').trim())

  const refresh = async () => {
    const w = normalizedWilaya.value
    communes.value = []
    error.value = null
    if (!w) return

    const cached = cache.value[w]
    if (cached && cached.length) {
      communes.value = cached
      return
    }

    loading.value = true
    try {
      const url = useTenantApiUrl(`/api/delivery/communes?wilaya=${encodeURIComponent(w)}`)
      const data = await $fetch<DeliveryCommune[]>(url, {
        headers: {
          ...(useTenantApiHeaders() || {})
        }
      })
      communes.value = Array.isArray(data)
        ? data.map((c: any) => ({ name: String(c?.name ?? ''), ids: c?.ids && typeof c.ids === 'object' ? c.ids : {} }))
            .filter((c) => c.name.trim().length > 0)
        : []
      cache.value[w] = communes.value
    } catch (e: any) {
      error.value = e?.data?.statusMessage || e?.data?.message || 'Failed to load communes'
      communes.value = []
    } finally {
      loading.value = false
    }
  }

  watch(normalizedWilaya, () => {
    void refresh()
  }, { immediate: true })

  return { communes, loading, error, refresh }
}
