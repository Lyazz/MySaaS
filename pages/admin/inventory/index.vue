<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight" style="color: var(--text-primary)">
          {{ t('admin.nav.inventory') }}
        </h2>
        <p class="mt-1" style="color: var(--text-secondary)">
          {{ t('admin.pages.inventory.subtitle') }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="ui-btn ui-btn--secondary text-sm"
          :disabled="loading"
          @click="fetchVariants"
        >
          <Icon
            name="lucide:refresh-cw"
            class="h-4 w-4"
            :class="loading ? 'animate-spin' : ''"
          />
          {{ t('admin.common.refresh') }}
        </button>

        <button
          type="button"
          class="ui-btn ui-btn--secondary text-sm"
          :disabled="loading"
          @click="exportVariantsCsv"
        >
          <Icon name="lucide:download" class="h-4 w-4" />
          {{ t('admin.pages.inventory.bulk.exportCsv') }}
        </button>

        <button
          type="button"
          class="ui-btn ui-btn--secondary text-sm"
          :disabled="loading"
          @click="openImportVariantsPicker"
        >
          <Icon name="lucide:upload" class="h-4 w-4" />
          {{ t('admin.pages.inventory.bulk.importCsv') }}
        </button>

        <input
          ref="importVariantsInput"
          type="file"
          accept=".csv,text/csv"
          class="hidden"
          @change="onImportVariantsCsvFileChange"
        >
      </div>
    </div>

    <div class="rounded-2xl p-4" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <BaseInput
            v-model="search"
            :label="t('admin.common.search')"
            :placeholder="t('admin.pages.inventory.filters.searchPlaceholder')"
          />
        </div>
        <div class="flex items-end gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg [background:var(--brand)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95"
            :disabled="loading"
            @click="fetchVariants"
          >
            <Icon name="lucide:search" class="h-4 w-4" />
            {{ t('admin.common.searchAction') }}
          </button>
          <button
            type="button"
            class="ui-btn ui-btn--secondary text-sm"
            :disabled="loading"
            @click="clearSearch"
          >
            <Icon name="lucide:x" class="h-4 w-4" />
            {{ t('admin.common.clear') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="errorMessage"
      class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
    >
      {{ errorMessage }}
    </div>

    <div class="overflow-hidden rounded-2xl" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
      <div
        v-if="loading"
        class="p-8 text-center text-sm" style="color: var(--text-secondary)"
      >
        {{ t('admin.pages.inventory.loading') }}
      </div>

      <div
        v-else-if="variants.length === 0"
        class="p-10 text-center"
      >
        <Icon name="lucide:package-search" class="mx-auto h-10 w-10" style="color: var(--text-muted)" />
        <p class="mt-3 text-sm" style="color: var(--text-secondary)">
          {{ t('admin.pages.inventory.empty') }}
        </p>
      </div>
 
      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="min-w-full divide-y">
          <thead style="background: var(--surface-2)">
            <tr>
              <th
                class="px-5 py-3 text-start text-xs font-semibold uppercase tracking-wider cursor-pointer transition-colors hover:opacity-80" style="color: var(--text-muted)"
                @click="setSort('productTitle')"
              >
                <div class="flex items-center gap-1">
                  {{ t('admin.pages.inventory.table.variant') }}
                  <Icon v-if="sortBy === 'productTitle'" :name="sortOrder === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'" class="h-3 w-3 [color:var(--brand)]" />
                </div>
              </th>
              <th
                class="px-5 py-3 text-start text-xs font-semibold uppercase tracking-wider cursor-pointer transition-colors hover:opacity-80" style="color: var(--text-muted)"
                @click="setSort('trackInventory')"
              >
                <div class="flex items-center gap-1">
                  {{ t('admin.pages.inventory.table.track') }}
                  <Icon v-if="sortBy === 'trackInventory'" :name="sortOrder === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'" class="h-3 w-3 [color:var(--brand)]" />
                </div>
              </th>
              <th
                class="px-5 py-3 text-start text-xs font-semibold uppercase tracking-wider cursor-pointer transition-colors hover:opacity-80" style="color: var(--text-muted)"
                @click="setSort('stock')"
              >
                <div class="flex items-center gap-1">
                  {{ t('admin.pages.inventory.table.onHand') }}
                  <Icon v-if="sortBy === 'stock'" :name="sortOrder === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'" class="h-3 w-3 [color:var(--brand)]" />
                </div>
              </th>
              <th
                class="px-5 py-3 text-start text-xs font-semibold uppercase tracking-wider cursor-pointer transition-colors hover:opacity-80" style="color: var(--text-muted)"
                @click="setSort('reserved')"
              >
                <div class="flex items-center gap-1">
                  {{ t('admin.pages.inventory.table.reserved') }}
                  <Icon v-if="sortBy === 'reserved'" :name="sortOrder === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'" class="h-3 w-3 [color:var(--brand)]" />
                </div>
              </th>
              <th
                class="px-5 py-3 text-start text-xs font-semibold uppercase tracking-wider cursor-pointer transition-colors hover:opacity-80" style="color: var(--text-muted)"
                @click="setSort('safetyStock')"
              >
                <div class="flex items-center gap-1">
                  {{ t('admin.pages.inventory.table.safety') }}
                  <Icon v-if="sortBy === 'safetyStock'" :name="sortOrder === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'" class="h-3 w-3 [color:var(--brand)]" />
                </div>
              </th>
              <th
                class="px-5 py-3 text-start text-xs font-semibold uppercase tracking-wider cursor-pointer transition-colors hover:opacity-80" style="color: var(--text-muted)"
                @click="setSort('available')"
              >
                <div class="flex items-center gap-1">
                  {{ t('admin.pages.inventory.table.available') }}
                  <Icon v-if="sortBy === 'available'" :name="sortOrder === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'" class="h-3 w-3 [color:var(--brand)]" />
                </div>
              </th>
              <th class="px-5 py-3 text-end text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted)">
                {{ t('admin.common.actions') }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr
              v-for="v in variants"
              :key="v.id"
              class="transition-colors"
            >
              <td class="px-5 py-4">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium" style="color: var(--text-primary)">
                    {{ v.productTitle }} — {{ v.optionTitle }}
                  </p>
                  <p class="mt-0.5 truncate text-xs" style="color: var(--text-muted)">
                    {{ t('admin.pages.inventory.table.sku') }}: {{ v.sku || '—' }}
                  </p>
                </div>
              </td>
              <td class="px-5 py-4">
                <input
                  :checked="v.trackInventory"
                  type="checkbox"
                  class="admin-checkbox"
                  :disabled="savingIds.has(v.id)"
                  @change="(e) => patchVariant(v.id, { trackInventory: (e.target as HTMLInputElement).checked })"
                >
              </td>
              <td class="px-5 py-4">
                <span class="text-sm font-mono" style="color: var(--text-secondary)">
                  {{ v.stock }}
                </span>
              </td>
              <td class="px-5 py-4 text-sm" style="color: var(--text-secondary)">
                <span class="text-sm font-mono" style="color: var(--text-secondary)">
                  {{ v.reserved }}
                </span>
              </td>
              <td class="px-5 py-4">
                <input
                  v-model.number="v.safetyStock"
                  type="number"
                  min="0"
                  class="ui-input w-24 px-2 py-1 text-sm"
                  :disabled="savingIds.has(v.id)"
                  @change="patchVariant(v.id, { safetyStock: v.safetyStock })"
                >
              </td>
              <td class="px-5 py-4 text-sm">
                <span
                  v-if="v.trackInventory"
                  :class="[
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                    v.available <= 0 ? 'bg-red-100 text-red-800' : v.available <= 5 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  ]"
                >
                  {{ v.available }}
                </span>
                <span
                  v-else
                  class="text-xs" style="color: var(--text-muted)"
                >
                  ∞
                </span>
              </td>
              <td class="px-5 py-4 text-end">
                <button
                  type="button"
                  class="ui-btn ui-btn--secondary text-sm"
                  @click="openMovements(v)"
                >
                  <Icon name="lucide:history" class="h-4 w-4" />
                  {{ t('admin.pages.inventory.movements.button') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Movements modal -->
    <Teleport to="body">
      <div
        v-if="movementsVariant"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 py-8"
      >
        <div class="w-full max-w-3xl rounded-2xl flex flex-col max-h-[90vh]" style="background: var(--surface-2); border: 1px solid var(--surface-border); box-shadow: 0 24px 48px rgba(0,0,0,0.5)">
          <div class="flex items-start justify-between gap-4 border-b px-6 py-4 shrink-0">
          <div class="min-w-0">
            <h3 class="truncate text-lg font-semibold" style="color: var(--text-primary)">
              {{ t('admin.pages.inventory.movements.title', { product: movementsVariant.productTitle, option: movementsVariant.optionTitle }) }}
            </h3>
            <p class="mt-0.5 text-sm" style="color: var(--text-tertiary)">
              {{ t('admin.pages.inventory.movements.hint') }}
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg p-2 transition-colors hover:opacity-70" style="color: var(--text-muted)"
            @click="closeMovements"
          >
            <Icon name="lucide:x" class="h-5 w-5" />
          </button>
        </div>

        <div class="overflow-y-auto p-6 flex-1 min-h-0">
          <div
            v-if="movementsLoading"
            class="py-8 text-center text-sm" style="color: var(--text-secondary)"
          >
            {{ t('admin.pages.inventory.movements.loading') }}
          </div>
          <div
            v-else-if="movements.length === 0"
            class="rounded-xl p-6 text-sm" style="background: var(--surface-3); border: 1px solid var(--surface-border); color: var(--text-secondary)"
          >
            {{ t('admin.pages.inventory.movements.empty') }}
          </div>
          <div
            v-else
            class="overflow-x-auto"
          >
            <table class="min-w-full divide-y">
              <thead style="background: var(--surface-3)">
                <tr>
                  <th class="px-4 py-2 text-start text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted)">
                    {{ t('admin.pages.inventory.movements.table.date') }}
                  </th>
                  <th class="px-4 py-2 text-start text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted)">
                    {{ t('admin.pages.inventory.movements.table.type') }}
                  </th>
                  <th class="px-4 py-2 text-start text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted)">
                    {{ t('admin.pages.inventory.movements.table.deltaStock') }}
                  </th>
                  <th class="px-4 py-2 text-start text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted)">
                    {{ t('admin.pages.inventory.movements.table.deltaReserved') }}
                  </th>
                  <th class="px-4 py-2 text-start text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted)">
                    {{ t('admin.pages.inventory.movements.table.deltaSafety') }}
                  </th>
                  <th class="px-4 py-2 text-start text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted)">
                    {{ t('admin.pages.inventory.movements.table.after') }}
                  </th>
                  <th class="px-4 py-2 text-start text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted)">
                    {{ t('admin.pages.inventory.movements.table.by') }}
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y">
                <tr
                  v-for="m in movements"
                  :key="m.id"
                >
                  <td class="px-4 py-2 text-sm" style="color: var(--text-secondary)">
                    {{ formatDate(m.createdAt) }}
                  </td>
                  <td class="px-4 py-2 text-sm" style="color: var(--text-secondary)">
                    <div class="min-w-0">
                      <p class="truncate font-medium">
                        {{ m.type }}
                      </p>
                      <p
                        v-if="m.orderId"
                        class="truncate text-xs" style="color: var(--text-muted)"
                      >
                        {{ t('admin.pages.inventory.movements.table.order') }}: {{ m.orderId }}
                      </p>
                    </div>
                  </td>
                  <td class="px-4 py-2 text-sm" style="color: var(--text-secondary)">
                    {{ m.delta }}
                  </td>
                  <td class="px-4 py-2 text-sm" style="color: var(--text-secondary)">
                    {{ m.reservedDelta }}
                  </td>
                  <td class="px-4 py-2 text-sm" style="color: var(--text-secondary)">
                    {{ m.safetyStockDelta }}
                  </td>
                  <td class="px-4 py-2 text-sm" style="color: var(--text-secondary)">
                    <span v-if="m.stockAfter !== null">S={{ m.stockAfter }}</span>
                    <span v-else>—</span>
                    <span style="color: var(--text-muted)"> · </span>
                    <span v-if="m.reservedAfter !== null">R={{ m.reservedAfter }}</span>
                    <span v-else>—</span>
                    <span style="color: var(--text-muted)"> · </span>
                    <span v-if="m.safetyStockAfter !== null">SS={{ m.safetyStockAfter }}</span>
                    <span v-else>—</span>
                  </td>
                  <td class="px-4 py-2 text-sm" style="color: var(--text-secondary)">
                    {{ m.createdBy?.email || t('admin.pages.inventory.movements.system') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="flex justify-end gap-3 border-t px-6 py-4 shrink-0">
          <button
            type="button"
            class="ui-btn ui-btn--secondary text-sm"
            @click="closeMovements"
          >
            {{ t('admin.common.close') }}
          </button>
        </div>
      </div>
    </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import BaseInput from '~/components/ui/BaseInput.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.inventory.title'
})

type Variant = {
  id: string
  productId: string
  productTitle: string
  optionTitle: string
  sku: string | null
  isActive: boolean
  trackInventory: boolean
  stock: number
  reserved: number
  safetyStock: number
  available: number
}

type Movement = {
  id: string
  type: string
  delta: number
  reservedDelta: number
  safetyStockDelta: number
  reason: string
  note: string | null
  orderId: string | null
  stockAfter: number | null
  reservedAfter: number | null
  safetyStockAfter: number | null
  createdAt: string
  createdBy: { id: string; email: string } | null
}

const authStore = useAuthStore()
const { t } = useI18n({ useScope: 'global' })
const variants = ref<Variant[]>([])
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const importVariantsInput = ref<HTMLInputElement | null>(null)
const sortBy = ref('productTitle')
const sortOrder = ref<'asc' | 'desc'>('asc')

const movementsVariant = ref<Variant | null>(null)
const movements = ref<Movement[]>([])
const movementsLoading = ref(false)

const search = ref('')
const savingIds = ref<Set<string>>(new Set())

const recomputeAvailable = (v: Variant) => {
  v.available = v.trackInventory ? Math.max(v.stock - v.reserved - v.safetyStock, 0) : Number.POSITIVE_INFINITY
}

const fetchVariants = async () => {
  loading.value = true
  errorMessage.value = null
  try {
    const query: any = {}
    if (search.value.trim()) query.search = search.value.trim()
    if (sortBy.value) query.sortBy = sortBy.value
    if (sortOrder.value) query.sortOrder = sortOrder.value

    const data = await $fetch('/api/admin/inventory/variants', {
      headers: { Authorization: `Bearer ${authStore.token}` },
      query
    }) as Variant[]
    variants.value = data
  } catch (e: any) {
    errorMessage.value = e?.data?.statusMessage || t('admin.pages.inventory.errors.loadFailed')
  } finally {
    loading.value = false
  }
}

const clearSearch = () => {
  search.value = ''
  fetchVariants()
}

const exportVariantsCsv = async () => {
  try {
    const csv = await $fetch('/api/admin/inventory/variants/export.csv', {
      headers: { Authorization: `Bearer ${authStore.token}` },
      query: search.value.trim() ? { search: search.value.trim() } : undefined,
      responseType: 'text' as any
    }) as string

	    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
	    const url = URL.createObjectURL(blob)
	    const a = document.createElement('a')
	    a.href = url
	    a.download = `inventory-variants-${new Date().toISOString().slice(0, 10)}.csv`
	    document.body.appendChild(a)
	    a.click()
	    a.remove()
	    URL.revokeObjectURL(url)
	  } catch (e: any) {
	    errorMessage.value = e?.data?.statusMessage || t('admin.pages.inventory.bulk.exportError')
	  }
	}

	const openImportVariantsPicker = () => {
	  importVariantsInput.value?.click()
	}

	const onImportVariantsCsvFileChange = async (event: Event) => {
	  const input = event.target as HTMLInputElement
	  const file = input.files?.[0]
	  if (!file) return

	  loading.value = true
	  errorMessage.value = null
	  try {
	    const form = new FormData()
	    form.append('file', file)

	    await $fetch('/api/admin/inventory/variants/import.csv', {
	      method: 'POST',
	      headers: { Authorization: `Bearer ${authStore.token}` },
	      body: form
	    })

	    await fetchVariants()
	  } catch (e: any) {
	    errorMessage.value = e?.data?.statusMessage || t('admin.pages.inventory.bulk.importError')
	  } finally {
	    loading.value = false
	    if (importVariantsInput.value) importVariantsInput.value.value = ''
	  }
	}

const patchVariant = async (variantId: string, patch: Partial<Pick<Variant, 'safetyStock' | 'trackInventory'>>) => {
  const v = variants.value.find((x) => x.id === variantId)
  if (!v) return

  savingIds.value.add(variantId)
  errorMessage.value = null
  try {
    const updated = await $fetch(`/api/admin/inventory/variants/${variantId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        ...patch,
        reason: 'admin_ui'
      }
    }) as Variant & Record<string, any>

    if (typeof updated?.safetyStock === 'number') v.safetyStock = updated.safetyStock
    if (typeof updated?.trackInventory === 'boolean') v.trackInventory = updated.trackInventory
    recomputeAvailable(v)
  } catch (e: any) {
    errorMessage.value = e?.data?.statusMessage || t('admin.pages.inventory.errors.updateFailed')
    await fetchVariants()
  } finally {
    savingIds.value.delete(variantId)
  }
}

const openMovements = async (v: Variant) => {
  movementsVariant.value = v
  movements.value = []
  movementsLoading.value = true
  try {
    const data = await $fetch(`/api/admin/inventory/variants/${v.id}/movements`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    }) as Movement[]
    movements.value = data
  } catch {
    movements.value = []
  } finally {
    movementsLoading.value = false
  }
}

const closeMovements = () => {
  movementsVariant.value = null
  movements.value = []
}

function setSort(key: string) {
  if (sortBy.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = key
    sortOrder.value = 'asc'
  }
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleString()
}

onMounted(fetchVariants)

watch([sortBy, sortOrder], () => {
  fetchVariants()
})
</script>
