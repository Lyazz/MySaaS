<template>
  <details
    class="delivery-probe"
    @toggle="onToggle"
  >
    <summary class="delivery-probe__summary">
      <Icon
 name="lucide:search-check"
 class="h-4 w-4 shrink-0 text-tertiary"
 
 />
      <span class="flex-1">
        <span
 class="block text-sm font-semibold text-primary"
 
>
          {{ t('admin.pages.delivery.probe.title') }}
        </span>
        <span
 class="block text-xs text-tertiary"
 
>
          {{ t('admin.pages.delivery.probe.hint') }}
        </span>
      </span>
      <Icon
 name="lucide:chevron-down"
 class="delivery-probe__chevron h-4 w-4 text-tertiary"
 
 />
    </summary>

    <div class="delivery-probe__body">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label
            class="ui-label"
            for="probe-wilaya"
          >{{ t('admin.pages.delivery.pricing.table.wilaya') }}</label>
          <select
            id="probe-wilaya"
            v-model="wilayaCode"
            class="ui-input text-sm"
          >
            <option
              v-for="w in DZ_WILAYAS"
              :key="w.code"
              :value="w.code"
            >
              {{ w.code }} — {{ w.name }}
            </option>
          </select>
        </div>
        <div>
          <label
            class="ui-label"
            for="probe-commune"
          >{{ t('admin.pages.delivery.probe.commune') }}</label>
          <select
            id="probe-commune"
            v-model="communeCode"
            class="ui-input text-sm"
            :disabled="loadingCommunes || communes.length === 0"
          >
            <option
              value=""
              disabled
            >
              {{
                loadingCommunes
                  ? t('admin.pages.delivery.probe.loadingCommunes')
                  : communes.length
                    ? t('admin.pages.delivery.probe.selectCommune')
                    : t('admin.pages.delivery.probe.noCommunes')
              }}
            </option>
            <option
              v-for="c in communes"
              :key="c.id ?? c.name"
              :value="c.id ?? c.name"
            >
              {{ c.name }}
            </option>
          </select>
        </div>
        <button
          type="button"
          class="ui-btn ui-btn--secondary ui-btn--md"
          :disabled="loadingPrices || !communeCode"
          @click="fetchPrices"
        >
          {{ loadingPrices ? t('admin.pages.delivery.probe.checking') : t('admin.pages.delivery.probe.action') }}
        </button>
      </div>

      <div class="mt-3 grid grid-cols-2 gap-3">
        <div
          v-for="mode in DELIVERY_MODES"
          :key="mode"
          class="delivery-probe__readout"
        >
          <span class="delivery-probe__readout-label">{{ t(`admin.pages.delivery.pricing.modes.${mode}`) }}</span>
          <span class="delivery-probe__readout-value stat-number">
            {{ prices[mode] == null ? '—' : `${Math.round(prices[mode] as number)} DZD` }}
          </span>
        </div>
      </div>

      <p
 v-if="error"
 class="mt-2 text-xs text-danger"
 
>
        {{ error }}
      </p>
    </div>
  </details>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { DZ_WILAYAS } from '~/shared/geo/dz'
import { DELIVERY_MODES, type DeliveryMode } from '~/shared/admin/delivery-admin'

const props = defineProps<{ provider: string }>()

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()

type ProviderCommune = { id?: string; name: string }

const wilayaCode = ref('16')
const communes = ref<ProviderCommune[]>([])
const communeCode = ref('')
const loadingCommunes = ref(false)
const loadingPrices = ref(false)
const prices = reactive<Record<DeliveryMode, number | null>>({ home: null, office: null })
const error = ref('')

const authHeaders = computed(() => ({ Authorization: `Bearer ${authStore.token}` }))

// Communes come from the carrier's API — only spend the call once the panel is opened.
const opened = ref(false)

watch([() => props.provider, wilayaCode], () => {
  if (opened.value) loadCommunes()
})

function onToggle(event: Event) {
  if (opened.value || !(event.target as HTMLDetailsElement).open) return
  opened.value = true
  loadCommunes()
}

function resetPrices() {
  prices.home = null
  prices.office = null
}

async function loadCommunes() {
  loadingCommunes.value = true
  error.value = ''
  resetPrices()
  communes.value = []
  communeCode.value = ''

  try {
    const data = await $fetch<ProviderCommune[]>(
      `/api/admin/delivery/providers/${props.provider}/communes?wilaya=${encodeURIComponent(wilayaCode.value)}`,
      { headers: authHeaders.value }
    )
    communes.value = Array.isArray(data) ? data : []
    const first = communes.value[0]
    if (first) communeCode.value = first.id ?? first.name
  } catch (e: any) {
    error.value = e?.data?.statusMessage || t('admin.pages.delivery.probe.communesFailed')
  } finally {
    loadingCommunes.value = false
  }
}

async function fetchPrices() {
  if (!communeCode.value) return
  loadingPrices.value = true
  error.value = ''

  try {
    const data = await $fetch<Record<DeliveryMode, { price: number | null }>>(
      `/api/admin/delivery/providers/${props.provider}/commune-price` +
        `?wilaya=${encodeURIComponent(wilayaCode.value)}&commune=${encodeURIComponent(communeCode.value)}`,
      { headers: authHeaders.value }
    )
    for (const mode of DELIVERY_MODES) prices[mode] = data?.[mode]?.price ?? null
  } catch (e: any) {
    resetPrices()
    error.value = e?.data?.statusMessage || t('admin.pages.delivery.probe.pricesFailed')
  } finally {
    loadingPrices.value = false
  }
}
</script>

<style scoped>
.delivery-probe {
  border: 1px solid var(--surface-border);
  border-radius: 0.875rem;
  background: var(--surface-2);
}

.delivery-probe__summary {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  list-style: none;
}

.delivery-probe__summary::-webkit-details-marker {
  display: none;
}

.delivery-probe__summary:focus-visible {
  outline: 2px solid rgb(var(--brand-rgb) / 0.7);
  outline-offset: -2px;
  border-radius: 0.875rem;
}

.delivery-probe__chevron {
  transition: transform 0.18s ease;
}

.delivery-probe[open] .delivery-probe__chevron {
  transform: rotate(180deg);
}

.delivery-probe__body {
  padding: 0 1rem 1rem;
}

.delivery-probe__readout {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--surface-border);
  border-radius: 0.625rem;
  background: var(--surface-1);
}

.delivery-probe__readout-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.delivery-probe__readout-value {
  font-size: 14px;
  color: var(--text-primary);
}

@media (prefers-reduced-motion: reduce) {
  .delivery-probe__chevron {
    transition: none;
  }
}
</style>
