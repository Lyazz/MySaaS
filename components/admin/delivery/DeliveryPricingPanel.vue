<template>
  <div class="flex flex-col gap-4">
    <DeliveryCommunePriceProbe
      v-if="canFetchCarrierRates"
      :provider="provider.provider"
    />

    <!-- Carrier rates: what the carrier bills you -->
    <div class="delivery-toolbar">
      <div class="flex flex-wrap items-center gap-3">
        <div class="min-w-0 flex-1">
          <p
            class="text-[13px] font-semibold"
            style="color: var(--text-primary)"
          >
            {{ t('admin.pages.delivery.pricing.carrierSource.title') }}
          </p>
          <p
            class="mt-0.5 text-xs"
            style="color: var(--text-tertiary)"
          >
            {{
              carrierRatesFetched
                ? carrierRatesAge
                  ? t('admin.pages.delivery.pricing.carrierSource.cached', { count: carrierRateCount, age: carrierRatesAge })
                  : t('admin.pages.delivery.pricing.carrierSource.loaded', { count: carrierRateCount })
                : t('admin.pages.delivery.pricing.carrierSource.empty')
            }}
          </p>
        </div>
        <button
          type="button"
          class="ui-btn ui-btn--secondary ui-btn--sm"
          :disabled="loadingCarrierRates || !canFetchCarrierRates"
          :title="canFetchCarrierRates ? undefined : t('admin.pages.delivery.pricing.carrierSource.needsConnection')"
          @click="fetchCarrierRates(true)"
        >
          <Icon
            name="lucide:refresh-cw"
            class="h-3.5 w-3.5"
            :class="loadingCarrierRates ? 'animate-spin' : ''"
          />
          {{
            loadingCarrierRates
              ? t('admin.pages.delivery.pricing.fetchingCarrierRates')
              : t('admin.pages.delivery.pricing.refreshCarrierRates')
          }}
        </button>
      </div>

      <!-- Margin applier — the reason this screen exists -->
      <div
        class="delivery-margin"
        :class="{ 'is-disabled': !carrierRatesFetched }"
      >
        <label
          class="delivery-margin__label"
          for="margin-amount"
        >
          {{ t('admin.pages.delivery.pricing.margin.prefix') }}
        </label>
        <input
          id="margin-amount"
          v-model="marginAmount"
          type="number"
          inputmode="numeric"
          class="ui-input delivery-margin__input font-mono-nums"
          :disabled="!carrierRatesFetched"
          placeholder="0"
        >
        <div
          class="delivery-margin__units"
          role="group"
          :aria-label="t('admin.pages.delivery.pricing.margin.unit')"
        >
          <button
            v-for="unit in (['DZD', 'PCT'] as const)"
            :key="unit"
            type="button"
            class="delivery-margin__unit"
            :class="{ 'is-active': marginUnit === unit }"
            :disabled="!carrierRatesFetched"
            @click="marginUnit = unit"
          >
            {{ unit === 'DZD' ? 'DZD' : '%' }}
          </button>
        </div>
        <button
          type="button"
          class="ui-btn ui-btn--secondary ui-btn--sm"
          :disabled="!canApplyMargin"
          @click="applyMargin"
        >
          {{ t('admin.pages.delivery.pricing.margin.apply', { count: marginTargetCount }) }}
        </button>
        <p class="delivery-margin__hint">
          {{
            carrierRatesFetched
              ? t('admin.pages.delivery.pricing.margin.hint')
              : t('admin.pages.delivery.pricing.margin.needsCarrierRates')
          }}
        </p>
      </div>
    </div>

    <!-- Search + filters -->
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div class="relative flex-1">
        <Icon
          name="lucide:search"
          class="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4"
          style="color: var(--text-muted)"
        />
        <input
          v-model="query"
          type="search"
          class="ui-input ps-9 text-sm"
          :placeholder="t('admin.pages.delivery.pricing.searchPlaceholder')"
          :aria-label="t('admin.pages.delivery.pricing.searchPlaceholder')"
        >
      </div>

      <div
        class="delivery-filters"
        role="group"
        :aria-label="t('admin.pages.delivery.pricing.filters.all')"
      >
        <button
          v-for="option in filterOptions"
          :key="option.value"
          type="button"
          class="delivery-filters__chip"
          :class="{ 'is-active': filter === option.value }"
          :disabled="option.value === 'missing-carrier' && !carrierRatesFetched"
          :aria-pressed="filter === option.value"
          @click="filter = option.value"
        >
          {{ option.label }}
          <span class="delivery-filters__count font-mono-nums">{{ option.count }}</span>
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="delivery-table-shell">
      <div
        v-if="loadingRates"
        class="flex flex-col items-center gap-3 py-16"
      >
        <div
          class="h-7 w-7 animate-spin rounded-full border-2 border-transparent"
          style="border-block-start-color: var(--brand); border-inline-start-color: var(--brand)"
        />
        <p
          class="text-sm"
          style="color: var(--text-tertiary)"
        >
          {{ t('admin.pages.delivery.pricing.loading') }}
        </p>
      </div>

      <div
        v-else-if="visibleWilayas.length === 0"
        class="flex flex-col items-center gap-2 py-16 text-center"
      >
        <Icon
          name="lucide:map-pin-off"
          class="h-6 w-6"
          style="color: var(--text-muted)"
        />
        <p
          class="text-sm"
          style="color: var(--text-secondary)"
        >
          {{ t('admin.pages.delivery.pricing.noMatches') }}
        </p>
        <button
          type="button"
          class="ui-btn ui-btn--ghost ui-btn--sm"
          @click="resetFilters"
        >
          {{ t('admin.pages.delivery.pricing.clearFilters') }}
        </button>
      </div>

      <div
        v-else
        class="delivery-table-scroll"
      >
        <table class="delivery-table">
          <thead>
            <tr>
              <th
                rowspan="2"
                class="delivery-table__th delivery-table__th--wilaya"
              >
                {{ t('admin.pages.delivery.pricing.table.wilaya') }}
              </th>
              <th
                v-for="mode in DELIVERY_MODES"
                :key="mode"
                colspan="3"
                class="delivery-table__th delivery-table__th--group"
              >
                {{ t(`admin.pages.delivery.pricing.modes.${mode}`) }}
              </th>
            </tr>
            <tr>
              <template
                v-for="mode in DELIVERY_MODES"
                :key="`${mode}-sub`"
              >
                <th class="delivery-table__th delivery-table__th--num">
                  {{ t('admin.pages.delivery.pricing.table.carrierPrice') }}
                </th>
                <th class="delivery-table__th delivery-table__th--input">
                  {{ t('admin.pages.delivery.pricing.table.overridePrice') }}
                </th>
                <th class="delivery-table__th delivery-table__th--num">
                  {{ t('admin.pages.delivery.pricing.table.margin') }}
                </th>
              </template>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="wilaya in visibleWilayas"
              :key="wilaya.code"
              class="delivery-table__row"
            >
              <td class="delivery-table__td delivery-table__td--wilaya">
                <span class="delivery-table__code font-mono-nums">{{ wilaya.code }}</span>
                <span class="delivery-table__name">{{ wilaya.name }}</span>
              </td>

              <template
                v-for="mode in DELIVERY_MODES"
                :key="`${wilaya.code}-${mode}`"
              >
                <td class="delivery-table__td delivery-table__td--num">
                  <span
                    v-if="carrierRates[mode][wilaya.code] != null"
                    class="font-mono-nums"
                    style="color: var(--text-secondary)"
                  >
                    {{ Math.round(Number(carrierRates[mode][wilaya.code])) }}
                  </span>
                  <span
                    v-else
                    style="color: var(--text-muted)"
                  >—</span>
                </td>

                <td class="delivery-table__td">
                  <input
                    v-model="draft[mode][wilaya.code]"
                    type="number"
                    inputmode="numeric"
                    min="0"
                    class="delivery-rate-input font-mono-nums"
                    :class="{ 'is-dirty': isDirtyCell(mode, wilaya.code) }"
                    :placeholder="t('admin.pages.delivery.pricing.overridePlaceholder')"
                    :aria-label="`${wilaya.name} — ${t(`admin.pages.delivery.pricing.modes.${mode}`)} — ${t('admin.pages.delivery.pricing.table.overridePrice')}`"
                  >
                </td>

                <td class="delivery-table__td delivery-table__td--num">
                  <span
                    v-if="margin(mode, wilaya.code) !== null"
                    class="delivery-margin-chip font-mono-nums"
                    :class="marginTone(margin(mode, wilaya.code) as number)"
                  >
                    {{ formatMargin(margin(mode, wilaya.code) as number) }}
                  </span>
                  <span
                    v-else
                    style="color: var(--text-muted)"
                  >—</span>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Save bar -->
      <div class="delivery-savebar">
        <p
          class="text-xs"
          style="color: var(--text-tertiary)"
        >
          <template v-if="dirtyCount > 0">
            <span
              class="font-mono-nums font-semibold"
              style="color: var(--text-primary)"
            >{{ dirtyCount }}</span>
            {{ t('admin.pages.delivery.pricing.unsaved', dirtyCount) }}
          </template>
          <template v-else-if="saveMessage">
            <span :style="{ color: saveKind === 'error' ? 'var(--status-cancelled-text)' : 'var(--status-delivered-text)' }">
              {{ saveMessage }}
            </span>
          </template>
          <template v-else>
            {{ t('admin.pages.delivery.pricing.showingCount', { shown: visibleWilayas.length, total: DZ_WILAYAS.length }) }}
          </template>
        </p>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="ui-btn ui-btn--ghost ui-btn--sm"
            :disabled="dirtyCount === 0 || saving"
            @click="resetDraft"
          >
            {{ t('admin.pages.delivery.pricing.discard') }}
          </button>
          <button
            type="button"
            class="ui-btn ui-btn--primary ui-btn--md"
            :disabled="dirtyCount === 0 || saving"
            @click="save"
          >
            {{ saving ? t('admin.common.saving') : t('admin.pages.delivery.pricing.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DeliveryCommunePriceProbe from './DeliveryCommunePriceProbe.vue'
import { useAuthStore } from '~/stores/auth'
import { DZ_WILAYAS } from '~/shared/geo/dz'
import {
  DELIVERY_MODES,
  emptyRateMap,
  type DeliveryMode,
  type DeliveryProviderAdminView,
  type DeliveryRateMap
} from '~/shared/admin/delivery-admin'

const props = defineProps<{ provider: DeliveryProviderAdminView }>()

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()

type RateFilter = 'all' | 'overrides' | 'no-overrides' | 'missing-carrier'

const draft = reactive<DeliveryRateMap<string>>(emptyRateMap())
const baseline = reactive<DeliveryRateMap<string>>(emptyRateMap())
const carrierRates = reactive<DeliveryRateMap<number | null>>(emptyRateMap())

const loadingRates = ref(false)
const loadingCarrierRates = ref(false)
const saving = ref(false)
const saveMessage = ref('')
const saveKind = ref<'success' | 'error'>('success')

const query = ref('')
const filter = ref<RateFilter>('all')
const marginAmount = ref('')
const marginUnit = ref<'DZD' | 'PCT'>('DZD')

const authHeaders = computed(() => ({ Authorization: `Bearer ${authStore.token}` }))

/* ── Loading ─────────────────────────────────────────────────────────── */

function clearRates() {
  for (const mode of DELIVERY_MODES) {
    for (const wilaya of DZ_WILAYAS) {
      draft[mode][wilaya.code] = ''
      baseline[mode][wilaya.code] = ''
      carrierRates[mode][wilaya.code] = null
    }
  }
}

async function loadRates() {
  loadingRates.value = true
  saveMessage.value = ''
  clearRates()

  try {
    const rates = await $fetch<any[]>(`/api/rates/${props.provider.provider}`, { headers: authHeaders.value })

    for (const rate of rates) {
      if (!rate?.wilayaCode || rate.isActive === false) continue
      const mode = typeof rate.serviceLevel === 'string' ? rate.serviceLevel.trim() : ''
      if (mode !== 'home' && mode !== 'office') continue

      const price = String(Number(rate.price))
      draft[mode][rate.wilayaCode] = price
      baseline[mode][rate.wilayaCode] = price
    }
  } catch (e) {
    console.error('Failed to load rates', e)
    saveKind.value = 'error'
    saveMessage.value = t('admin.pages.delivery.pricing.loadFailed')
  } finally {
    loadingRates.value = false
  }
}

watch(
  () => props.provider.provider,
  async () => {
    await loadRates()
    // Cheap now: the server answers from its last build unless asked to refresh, so
    // the margin column is populated on arrival instead of after a click.
    void fetchCarrierRates()
  },
  { immediate: true }
)

/* ── Carrier rates ───────────────────────────────────────────────────── */

const canFetchCarrierRates = computed(() => {
  const provider = props.provider
  if (!provider.supports.quote || !provider.account?.isActive) return false
  return provider.credentialFields
    .filter((field) => field.required && field.secret)
    .every((field) => provider.account?.secrets?.[field.key])
})

const carrierRateCount = computed(
  () => DELIVERY_MODES.reduce((sum, mode) => sum + Object.values(carrierRates[mode]).filter((v) => v != null).length, 0)
)

const carrierRatesFetched = computed(() => carrierRateCount.value > 0)

const carrierRatesFetchedAt = ref<string | null>(null)

/** How stale the shown carrier prices are — margins get set off these numbers. */
const carrierRatesAge = computed(() => {
  if (!carrierRatesFetchedAt.value) return ''
  const hours = Math.floor((Date.now() - new Date(carrierRatesFetchedAt.value).getTime()) / 3_600_000)
  if (hours < 1) return t('admin.pages.delivery.pricing.carrierSource.ageJustNow')
  if (hours < 24) return t('admin.pages.delivery.pricing.carrierSource.ageHours', { hours })
  return t('admin.pages.delivery.pricing.carrierSource.ageDays', { days: Math.floor(hours / 24) })
})

async function loadRateCacheInfo() {
  try {
    const info = await $fetch<Record<string, string>>(
      `/api/admin/delivery/providers/${props.provider.provider}/rate-cache`,
      { headers: authHeaders.value }
    )
    const stamps = Object.values(info || {}).filter(Boolean).sort()
    carrierRatesFetchedAt.value = stamps.length ? stamps[0] : null
  } catch {
    carrierRatesFetchedAt.value = null
  }
}

/**
 * `refresh` re-quotes the carrier — 58 calls per mode. Without it the server serves
 * its last build, which is why this can now run on open instead of only on click.
 */
async function fetchCarrierRates(refresh = false) {
  if (!canFetchCarrierRates.value || loadingCarrierRates.value) return
  loadingCarrierRates.value = true
  saveMessage.value = ''

  try {
    const results = await Promise.all(
      DELIVERY_MODES.map((mode) =>
        $fetch<Array<{ wilayaCode: string; carrierPrice: number | null }>>(
          `/api/admin/delivery/providers/${props.provider.provider}/live-rates?deliveryMode=${mode}${refresh ? '&refresh=true' : ''}`,
          { headers: authHeaders.value }
        )
      )
    )

    DELIVERY_MODES.forEach((mode, index) => {
      for (const rate of results[index] ?? []) {
        if (!rate?.wilayaCode) continue
        carrierRates[mode][rate.wilayaCode] = rate.carrierPrice == null ? null : Number(rate.carrierPrice)
      }
    })

    await loadRateCacheInfo()
  } catch (e: any) {
    console.error('Failed to fetch carrier rates', e)
    saveKind.value = 'error'
    // The carrier's own reason ("rate limit exceeded", "unauthorized") is far more
    // actionable than a generic failure, so show it when there is one.
    saveMessage.value = e?.data?.statusMessage || t('admin.pages.delivery.errors.fetchCarrierRatesFailed')
  } finally {
    loadingCarrierRates.value = false
  }
}

/* ── Derived rows ────────────────────────────────────────────────────── */

function hasOverride(code: string) {
  return DELIVERY_MODES.some((mode) => (draft[mode][code] ?? '').trim().length > 0)
}

function missingCarrierRate(code: string) {
  return DELIVERY_MODES.some((mode) => carrierRates[mode][code] == null)
}

const searchedWilayas = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return DZ_WILAYAS
  return DZ_WILAYAS.filter((w) => `${w.code} ${w.name}`.toLowerCase().includes(q))
})

function matchesFilter(code: string, value: RateFilter) {
  if (value === 'overrides') return hasOverride(code)
  if (value === 'no-overrides') return !hasOverride(code)
  if (value === 'missing-carrier') return carrierRatesFetched.value && missingCarrierRate(code)
  return true
}

const visibleWilayas = computed(() => searchedWilayas.value.filter((w) => matchesFilter(w.code, filter.value)))

const filterOptions = computed(() =>
  ([
    { value: 'all', label: t('admin.pages.delivery.pricing.filters.all') },
    { value: 'overrides', label: t('admin.pages.delivery.pricing.filters.overrides') },
    { value: 'no-overrides', label: t('admin.pages.delivery.pricing.filters.noOverrides') },
    { value: 'missing-carrier', label: t('admin.pages.delivery.pricing.filters.missingCarrier') }
  ] as const).map((option) => ({
    ...option,
    count: searchedWilayas.value.filter((w) => matchesFilter(w.code, option.value)).length
  }))
)

function resetFilters() {
  query.value = ''
  filter.value = 'all'
}

/* ── Margin ──────────────────────────────────────────────────────────── */

function margin(mode: DeliveryMode, code: string): number | null {
  const carrier = carrierRates[mode][code]
  if (carrier == null) return null
  const raw = (draft[mode][code] ?? '').trim()
  if (!raw) return null
  const yours = Number(raw)
  if (!Number.isFinite(yours)) return null
  return Math.round(yours - carrier)
}

function marginTone(value: number) {
  if (value > 0) return 'is-positive'
  if (value < 0) return 'is-negative'
  return 'is-neutral'
}

function formatMargin(value: number) {
  if (value === 0) return '0'
  return `${value > 0 ? '+' : '−'}${Math.abs(value)}`
}

const marginTargets = computed(() => {
  const codes = new Set(visibleWilayas.value.map((w) => w.code))
  const targets: Array<[DeliveryMode, string]> = []
  for (const mode of DELIVERY_MODES) {
    for (const code of codes) {
      if (carrierRates[mode][code] != null) targets.push([mode, code])
    }
  }
  return targets
})

const marginTargetCount = computed(() => marginTargets.value.length)

const canApplyMargin = computed(
  () => carrierRatesFetched.value && marginTargetCount.value > 0 && Number.isFinite(Number(marginAmount.value)) && marginAmount.value.trim() !== ''
)

function applyMargin() {
  if (!canApplyMargin.value) return
  const amount = Number(marginAmount.value)

  for (const [mode, code] of marginTargets.value) {
    const carrier = Number(carrierRates[mode][code])
    const next = marginUnit.value === 'DZD' ? carrier + amount : carrier * (1 + amount / 100)
    draft[mode][code] = String(Math.max(0, Math.round(next)))
  }
}

/* ── Saving ──────────────────────────────────────────────────────────── */

function isDirtyCell(mode: DeliveryMode, code: string) {
  return (draft[mode][code] ?? '').trim() !== (baseline[mode][code] ?? '').trim()
}

const dirtyCells = computed(() => {
  const cells: Array<[DeliveryMode, string]> = []
  for (const mode of DELIVERY_MODES) {
    for (const wilaya of DZ_WILAYAS) {
      if (isDirtyCell(mode, wilaya.code)) cells.push([mode, wilaya.code])
    }
  }
  return cells
})

const dirtyCount = computed(() => dirtyCells.value.length)

function resetDraft() {
  for (const [mode, code] of dirtyCells.value) draft[mode][code] = baseline[mode][code] ?? ''
  saveMessage.value = ''
}

async function save() {
  if (dirtyCount.value === 0 || saving.value) return
  saving.value = true
  saveMessage.value = ''

  const rates = dirtyCells.value.flatMap(([mode, code]) => {
    const raw = (draft[mode][code] ?? '').trim()

    if (!raw) {
      // Was an override, now blank — deactivate so the carrier rate takes over.
      return [{ wilayaCode: code, price: 0, communeCode: '', serviceLevel: mode, isActive: false }]
    }

    const price = Number(raw)
    if (!Number.isFinite(price)) return []
    return [{ wilayaCode: code, price, communeCode: '', serviceLevel: mode, isActive: true }]
  })

  try {
    await $fetch(`/api/rates/${props.provider.provider}`, {
      method: 'PUT',
      headers: authHeaders.value,
      body: { rates }
    })
    await loadRates()
    saveKind.value = 'success'
    saveMessage.value = t('admin.common.saved')
  } catch (e) {
    console.error('Failed to save rates', e)
    saveKind.value = 'error'
    saveMessage.value = t('admin.pages.delivery.errors.saveFailed')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
/* ── Toolbar ── */
.delivery-toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding: 1rem;
  border: 1px solid var(--surface-border);
  border-radius: 0.875rem;
  background: var(--surface-2);
}

/* ── Margin applier ── */
.delivery-margin {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.875rem;
  border-top: 1px solid var(--surface-border);
}

.delivery-margin.is-disabled {
  opacity: 0.6;
}

.delivery-margin__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.delivery-margin__input {
  width: 5.5rem;
  padding: 0.375rem 0.625rem;
  font-size: 13px;
  border-radius: 0.5rem;
}

.delivery-margin__units {
  display: inline-flex;
  padding: 2px;
  border: 1px solid var(--surface-border);
  border-radius: 0.5rem;
  background: var(--surface-1);
}

.delivery-margin__unit {
  padding: 0.1875rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  transition: background 0.15s ease, color 0.15s ease;
}

.delivery-margin__unit.is-active {
  background: var(--surface-3);
  color: var(--text-primary);
}

.delivery-margin__unit:focus-visible {
  outline: 2px solid rgb(var(--brand-rgb) / 0.7);
  outline-offset: 1px;
}

.delivery-margin__hint {
  flex-basis: 100%;
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-muted);
}

/* ── Filters ── */
.delivery-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.delivery-filters__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  border: 1px solid var(--surface-border);
  border-radius: 0.5rem;
  background: var(--surface-1);
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}

.delivery-filters__chip:hover:not(:disabled) {
  border-color: var(--surface-border-hover);
  color: var(--text-primary);
}

.delivery-filters__chip.is-active {
  background: var(--accent-soft);
  border-color: var(--accent-border);
  color: var(--brand);
}

.delivery-filters__chip:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.delivery-filters__chip:focus-visible {
  outline: 2px solid rgb(var(--brand-rgb) / 0.7);
  outline-offset: 1px;
}

.delivery-filters__count {
  font-size: 11px;
  opacity: 0.65;
}

/* ── Table ── */
.delivery-table-shell {
  border: 1px solid var(--surface-border);
  border-radius: 1rem;
  background: var(--surface-1);
  overflow: hidden;
}

.delivery-table-scroll {
  max-height: min(60vh, 40rem);
  overflow: auto;
}

.delivery-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.delivery-table__th {
  position: sticky;
  background: var(--surface-2);
  padding: 0.5rem 0.75rem;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: start;
  color: var(--text-tertiary);
  border-bottom: 1px solid var(--surface-border);
  white-space: nowrap;
  z-index: 2;
}

thead tr:first-child .delivery-table__th {
  top: 0;
}

thead tr:last-child .delivery-table__th {
  top: 1.8125rem;
}

.delivery-table__th--group {
  text-align: center;
  color: var(--text-secondary);
  border-inline-start: 1px solid var(--surface-border);
}

.delivery-table__th--wilaya {
  min-width: 11rem;
}

.delivery-table__th--num {
  text-align: end;
  width: 6.5rem;
}

.delivery-table__th--input {
  width: 8rem;
}

.delivery-table__td {
  padding: 0.4375rem 0.75rem;
  border-bottom: 1px solid var(--surface-border);
  font-size: 13px;
  vertical-align: middle;
}

.delivery-table__row:last-child .delivery-table__td {
  border-bottom: none;
}

.delivery-table__row:hover .delivery-table__td {
  background: var(--nav-hover-bg);
}

.delivery-table__td--wilaya {
  white-space: nowrap;
}

.delivery-table__td--wilaya .delivery-table__code {
  margin-inline-end: 0.5rem;
}

.delivery-table__td--num {
  text-align: end;
}

.delivery-table__code {
  font-size: 11px;
  color: var(--text-muted);
}

.delivery-table__name {
  font-weight: 500;
  color: var(--text-primary);
}

/* ── Rate input ── */
.delivery-rate-input {
  width: 100%;
  padding: 0.3125rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 0.5rem;
  background: var(--surface-2);
  color: var(--text-primary);
  font-size: 13px;
  text-align: end;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.delivery-rate-input::placeholder {
  color: var(--text-muted);
  font-size: 11px;
}

.delivery-rate-input:hover {
  border-color: var(--surface-border);
}

.delivery-rate-input:focus {
  border-color: rgb(var(--brand-rgb) / 0.5);
  box-shadow: 0 0 0 3px rgb(var(--brand-rgb) / 0.1);
}

.delivery-rate-input.is-dirty {
  border-color: var(--accent-border);
  background: var(--accent-soft);
}

/* ── Margin chip ── */
.delivery-margin-chip {
  font-size: 12px;
  font-weight: 600;
}

.delivery-margin-chip.is-positive {
  color: var(--status-delivered-text);
}

.delivery-margin-chip.is-negative {
  color: var(--status-cancelled-text);
}

.delivery-margin-chip.is-neutral {
  color: var(--text-tertiary);
}

/* ── Save bar ── */
.delivery-savebar {
  position: sticky;
  bottom: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--surface-border);
  background: var(--surface-2);
}

@media (prefers-reduced-motion: reduce) {
  .delivery-rate-input,
  .delivery-filters__chip,
  .delivery-margin__unit {
    transition: none;
  }
}
</style>
