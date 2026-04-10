import { computed, ref, watch } from 'vue'
import { useTenantApiHeaders, useTenantApiUrl } from '~/composables/useTenantApi'

type QuoteOption = { price: number; currency: string; serviceLevel?: string }

export const useMaystroDeliveryPrices = (input: { wilayaCode: () => string; communeCode: () => string }) => {
  const homePrice = ref<number | null>(null)
  const officePrice = ref<number | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const normalized = computed(() => ({
    wilayaCode: String(input.wilayaCode() || '').trim(),
    communeCode: String(input.communeCode() || '').trim()
  }))

  const fetchMode = async (deliveryMode: 'home' | 'office') => {
    const { wilayaCode, communeCode } = normalized.value
    const url = useTenantApiUrl('/api/delivery/options')
    const quotes = await $fetch<QuoteOption[]>(url, {
      method: 'POST',
      body: {
        provider: 'MAYSTRO',
        deliveryMode,
        destination: { wilayaCode, communeCode }
      },
      headers: {
        ...(useTenantApiHeaders() || {})
      }
    })
    if (!Array.isArray(quotes) || quotes.length === 0) return null
    const best = quotes.reduce((a, b) => (a.price <= b.price ? a : b))
    return Number.isFinite(best.price) ? best.price : null
  }

  const refresh = async () => {
    const { wilayaCode, communeCode } = normalized.value
    homePrice.value = null
    officePrice.value = null
    error.value = null
    if (!wilayaCode || !communeCode) return

    loading.value = true
    try {
      const [home, office] = await Promise.all([fetchMode('home'), fetchMode('office')])
      homePrice.value = home
      officePrice.value = office
    } catch (e: any) {
      error.value = e?.data?.statusMessage || e?.data?.message || 'Failed to fetch Maystro prices'
    } finally {
      loading.value = false
    }
  }

  watch(normalized, () => {
    void refresh()
  }, { immediate: true, deep: true })

  return { homePrice, officePrice, loading, error, refresh }
}

