import { computed, ref, watch } from 'vue'
import { useTenantApiHeaders, useTenantApiUrl } from '~/composables/useTenantApi'

type QuoteOption = { provider: string; price: number; currency: string; serviceLevel?: string }
type ProviderPrices = { home: number | null; office: number | null }

export const useDeliveryPrices = (input: { wilayaCode: () => string; communeCode: () => string }) => {
  const pricesByProvider = ref<Record<string, ProviderPrices>>({})
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
        deliveryMode,
        destination: { wilayaCode, communeCode }
      },
      headers: {
        ...(useTenantApiHeaders() || {})
      }
    })
    return Array.isArray(quotes) ? quotes : []
  }

  const refresh = async () => {
    const { wilayaCode, communeCode } = normalized.value
    pricesByProvider.value = {}
    error.value = null
    if (!wilayaCode || !communeCode) return

    loading.value = true
    try {
      const [homeQuotes, officeQuotes] = await Promise.all([fetchMode('home'), fetchMode('office')])
      const byProvider: Record<string, ProviderPrices> = {}

      const applyMode = (quotes: QuoteOption[], mode: 'home' | 'office') => {
        for (const quote of quotes) {
          if (!quote?.provider || !Number.isFinite(quote.price)) continue
          const existing = byProvider[quote.provider] || { home: null, office: null }
          if (existing[mode] == null || quote.price < existing[mode]!) {
            existing[mode] = quote.price
          }
          byProvider[quote.provider] = existing
        }
      }

      applyMode(homeQuotes, 'home')
      applyMode(officeQuotes, 'office')
      pricesByProvider.value = byProvider
    } catch (e: any) {
      error.value = e?.data?.statusMessage || e?.data?.message || 'Failed to fetch delivery prices'
    } finally {
      loading.value = false
    }
  }

  watch(normalized, () => {
    void refresh()
  }, { immediate: true, deep: true })

  return { pricesByProvider, loading, error, refresh }
}
