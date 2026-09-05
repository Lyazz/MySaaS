import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTenantApiHeaders, useTenantApiUrl } from '~/composables/useTenantApi'

export type PickupPoint = {
  /** Stable key for the list. Never sent to the carrier — see `ProviderPickupPoint`. */
  id: string
  name: string
  address?: string
  communeId?: string
  communeName?: string
  /** 'desk' is the carrier's own counter, 'relay' a third-party shop holding parcels. */
  kind?: 'desk' | 'relay'
}

type Accessors = {
  provider: () => string | null | undefined
  mode: () => string | null | undefined
  wilaya: () => string
  commune: () => string
  selected: () => string
  onSelect: (name: string) => void
  onCommuneChange: (communeId: string) => void
}

/**
 * Pickup points for whichever carrier the shopper picked.
 *
 * Every theme used to carry its own copy of this, hardcoded to Maystro, which is why
 * a Yalidine store could not offer pickup at all. The carrier now comes from the
 * selected delivery option and the generic route answers for any of them.
 */
export const usePickupPoints = (input: Accessors) => {
  const { t } = useI18n({ useScope: 'global' })
  const points = ref<PickupPoint[]>([])
  const loading = ref(false)
  const error = ref('')

  const provider = computed(() => input.provider() || '')
  const isPickupSelected = computed(() => Boolean(provider.value) && input.mode() === 'pickup')

  /**
   * Only relays move the commune: Maystro prices a relay parcel against the relay's
   * own commune. A carrier desk does not reprice, so leave the shopper's commune be.
   *
   * The commune field holds names, not carrier ids — it is fed by the carrier-agnostic
   * list, which has no single id to offer. Writing the id here blanked the field and
   * took the delivery prices down with it.
   */
  const syncCommune = () => {
    const name = (input.selected() || '').trim()
    if (!name) return
    const point = points.value.find((p) => p.kind === 'relay' && p.name === name)
    const communeName = point?.communeName?.trim()
    if (communeName && input.commune() !== communeName) input.onCommuneChange(communeName)
  }

  watch(
    [isPickupSelected, provider, () => input.commune(), () => input.wilaya()],
    async ([isPickup, carrier, commune, wilaya]) => {
      error.value = ''
      points.value = []
      if (!isPickup) {
        input.onSelect('')
        return
      }
      if (!carrier || !wilaya) return

      loading.value = true
      try {
        const query = new URLSearchParams({ wilaya: String(wilaya) })
        if (commune) query.set('commune', String(commune))
        const url = useTenantApiUrl(
          `/api/delivery/providers/${encodeURIComponent(String(carrier))}/pickup-points?${query.toString()}`
        )
        const data = await $fetch<any[]>(url, { headers: { ...(useTenantApiHeaders() || {}) } })

        points.value = Array.isArray(data)
          ? data
              .map((p: any) => ({
                id: String(p?.id ?? ''),
                name: String(p?.name ?? ''),
                address: p?.address ? String(p.address) : undefined,
                communeId: p?.communeId ? String(p.communeId) : undefined,
                communeName: p?.communeName ? String(p.communeName) : undefined,
                kind: p?.kind === 'relay' ? ('relay' as const) : ('desk' as const)
              }))
              .filter((p) => p.name.trim().length > 0)
          : []

        // An empty list is an answer, not a loading state. Leaving it blank and silent
        // is why picking a commune sometimes looked like nothing happened at all.
        if (points.value.length === 0) {
          error.value = t('storefront.checkout.delivery.noPickupPoints')
        }

        // Preselect only when there is nothing to choose between. With several
        // agencies the shopper picks; they don't get one assigned silently.
        const current = (input.selected() || '').trim()
        if (!current || !points.value.some((p) => p.name === current)) {
          input.onSelect(points.value.length === 1 ? points.value[0].name : '')
          syncCommune()
        }
      } catch (e: any) {
        points.value = []
        error.value = e?.data?.statusMessage || e?.data?.message || 'Failed to load pickup points'
      } finally {
        loading.value = false
      }
    },
    { immediate: true }
  )

  return { points, loading, error, isPickupSelected, syncCommune }
}
