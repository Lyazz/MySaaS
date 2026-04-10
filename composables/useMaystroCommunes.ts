import { computed, ref, watch } from 'vue'
import { useTenantApiHeaders, useTenantApiUrl } from '~/composables/useTenantApi'

export type MaystroCommune = { id: number; name: string; wilaya: number; postcode?: string; zone?: string }

type Cache = Record<string, MaystroCommune[]>

export const useMaystroCommunes = (wilayaCode: () => string) => {
  const cache = useState<Cache>('maystro-communes-cache', () => ({}))

  const communes = ref<MaystroCommune[]>([])
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
      const url = useTenantApiUrl(`/api/delivery/maystro/communes?wilaya=${encodeURIComponent(w)}`)
      const data = await $fetch<MaystroCommune[]>(url, {
        headers: {
          ...(useTenantApiHeaders() || {})
        }
      })
      communes.value = Array.isArray(data) ? data : []
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

