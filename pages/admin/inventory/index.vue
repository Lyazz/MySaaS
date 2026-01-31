<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
          Inventory
        </h2>
        <p class="mt-1 text-slate-600">
          Track on-hand stock, reserved units, and safety stock per variant.
        </p>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        :disabled="loading"
        @click="fetchVariants"
      >
        <Icon
          name="lucide:refresh-cw"
          class="h-4 w-4"
          :class="loading ? 'animate-spin' : ''"
        />
        Refresh
      </button>
    </div>

    <div class="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <BaseInput
            v-model="search"
            label="Search"
            placeholder="Product title or SKU…"
          />
        </div>
        <div class="flex items-end gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg bg-[rgb(var(--brand-rgb))] px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95"
            :disabled="loading"
            @click="fetchVariants"
          >
            <Icon name="lucide:search" class="h-4 w-4" />
            Search
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            :disabled="loading"
            @click="clearSearch"
          >
            <Icon name="lucide:x" class="h-4 w-4" />
            Clear
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

    <div class="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
      <div
        v-if="loading"
        class="p-8 text-center text-sm text-slate-600"
      >
        Loading inventory…
      </div>

      <div
        v-else-if="filteredVariants.length === 0"
        class="p-10 text-center"
      >
        <Icon name="lucide:package-search" class="mx-auto h-10 w-10 text-slate-300" />
        <p class="mt-3 text-sm text-slate-600">
          No variants found.
        </p>
      </div>

      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="min-w-full divide-y divide-slate-200/70">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Variant
              </th>
              <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Track
              </th>
              <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                On-hand
              </th>
              <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Reserved
              </th>
              <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Safety
              </th>
              <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Available
              </th>
              <th class="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200/70 bg-white">
            <tr
              v-for="v in filteredVariants"
              :key="v.id"
              class="hover:bg-slate-50"
            >
              <td class="px-5 py-4">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-slate-900">
                    {{ v.productTitle }} — {{ v.optionTitle }}
                  </p>
                  <p class="mt-0.5 truncate text-xs text-slate-500">
                    SKU: {{ v.sku || '—' }}
                  </p>
                </div>
              </td>
              <td class="px-5 py-4">
                <input
                  :checked="v.trackInventory"
                  type="checkbox"
                  class="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  :disabled="savingIds.has(v.id)"
                  @change="(e) => patchVariant(v.id, { trackInventory: (e.target as HTMLInputElement).checked })"
                >
              </td>
              <td class="px-5 py-4">
                <input
                  v-model.number="v.stock"
                  type="number"
                  min="0"
                  class="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm shadow-sm focus:border-teal-500 focus:ring-teal-500"
                  :disabled="savingIds.has(v.id)"
                  @change="patchVariant(v.id, { stock: v.stock })"
                >
              </td>
              <td class="px-5 py-4 text-sm text-slate-700">
                <input
                  v-model.number="v.reserved"
                  type="number"
                  min="0"
                  class="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm shadow-sm focus:border-teal-500 focus:ring-teal-500"
                  :disabled="savingIds.has(v.id)"
                  @change="patchVariant(v.id, { reserved: v.reserved })"
                >
              </td>
              <td class="px-5 py-4">
                <input
                  v-model.number="v.safetyStock"
                  type="number"
                  min="0"
                  class="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm shadow-sm focus:border-teal-500 focus:ring-teal-500"
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
                  class="text-xs text-slate-500"
                >
                  ∞
                </span>
              </td>
              <td class="px-5 py-4 text-right">
                <button
                  type="button"
                  class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  @click="openMovements(v)"
                >
                  <Icon name="lucide:history" class="h-4 w-4" />
                  Movements
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Movements modal -->
    <div
      v-if="movementsVariant"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <div class="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        <div class="flex items-start justify-between gap-4 border-b border-slate-200/70 px-6 py-4">
          <div class="min-w-0">
            <h3 class="truncate text-lg font-semibold text-slate-900">
              Movements — {{ movementsVariant.productTitle }} / {{ movementsVariant.optionTitle }}
            </h3>
            <p class="mt-0.5 text-sm text-slate-500">
              Latest changes affecting stock / reserved / safety stock.
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            @click="closeMovements"
          >
            <Icon name="lucide:x" class="h-5 w-5" />
          </button>
        </div>

        <div class="max-h-[70vh] overflow-y-auto p-6">
          <div
            v-if="movementsLoading"
            class="py-8 text-center text-sm text-slate-600"
          >
            Loading movements…
          </div>
          <div
            v-else-if="movements.length === 0"
            class="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600"
          >
            No movements recorded yet.
          </div>
          <div
            v-else
            class="overflow-x-auto"
          >
            <table class="min-w-full divide-y divide-slate-200/70">
              <thead class="bg-slate-50">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Date
                  </th>
                  <th class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Type
                  </th>
                  <th class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Δ stock
                  </th>
                  <th class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Δ reserved
                  </th>
                  <th class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Δ safety
                  </th>
                  <th class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    After
                  </th>
                  <th class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    By
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200/70">
                <tr
                  v-for="m in movements"
                  :key="m.id"
                >
                  <td class="px-4 py-2 text-sm text-slate-700">
                    {{ formatDate(m.createdAt) }}
                  </td>
                  <td class="px-4 py-2 text-sm text-slate-700">
                    <div class="min-w-0">
                      <p class="truncate font-medium">
                        {{ m.type }}
                      </p>
                      <p
                        v-if="m.orderId"
                        class="truncate text-xs text-slate-500"
                      >
                        Order: {{ m.orderId }}
                      </p>
                    </div>
                  </td>
                  <td class="px-4 py-2 text-sm text-slate-700">
                    {{ m.delta }}
                  </td>
                  <td class="px-4 py-2 text-sm text-slate-700">
                    {{ m.reservedDelta }}
                  </td>
                  <td class="px-4 py-2 text-sm text-slate-700">
                    {{ m.safetyStockDelta }}
                  </td>
                  <td class="px-4 py-2 text-sm text-slate-700">
                    <span v-if="m.stockAfter !== null">S={{ m.stockAfter }}</span>
                    <span v-else>—</span>
                    <span class="text-slate-400"> · </span>
                    <span v-if="m.reservedAfter !== null">R={{ m.reservedAfter }}</span>
                    <span v-else>—</span>
                    <span class="text-slate-400"> · </span>
                    <span v-if="m.safetyStockAfter !== null">SS={{ m.safetyStockAfter }}</span>
                    <span v-else>—</span>
                  </td>
                  <td class="px-4 py-2 text-sm text-slate-700">
                    {{ m.createdBy?.email || 'system' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="flex justify-end gap-3 border-t border-slate-200/70 px-6 py-4">
          <button
            type="button"
            class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            @click="closeMovements"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import BaseInput from '~/components/ui/BaseInput.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Inventory'
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
const variants = ref<Variant[]>([])
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const search = ref('')
const savingIds = ref<Set<string>>(new Set())

const movementsVariant = ref<Variant | null>(null)
const movements = ref<Movement[]>([])
const movementsLoading = ref(false)

const filteredVariants = computed(() => {
  if (!search.value.trim()) return variants.value
  const q = search.value.trim().toLowerCase()
  return variants.value.filter((v) =>
    v.productTitle.toLowerCase().includes(q) || (v.sku || '').toLowerCase().includes(q)
  )
})

const recomputeAvailable = (v: Variant) => {
  v.available = v.trackInventory ? Math.max(v.stock - v.reserved - v.safetyStock, 0) : Number.POSITIVE_INFINITY
}

const fetchVariants = async () => {
  loading.value = true
  errorMessage.value = null
  try {
    const data = await $fetch<Variant[]>('/api/admin/inventory/variants', {
      headers: { Authorization: `Bearer ${authStore.token}` },
      query: search.value.trim() ? { search: search.value.trim() } : undefined
    })
    variants.value = data
  } catch (e: any) {
    errorMessage.value = e?.data?.statusMessage || 'Failed to load inventory'
  } finally {
    loading.value = false
  }
}

const clearSearch = () => {
  search.value = ''
  fetchVariants()
}

const patchVariant = async (variantId: string, patch: Partial<Pick<Variant, 'stock' | 'reserved' | 'safetyStock' | 'trackInventory'>>) => {
  const v = variants.value.find((x) => x.id === variantId)
  if (!v) return

  savingIds.value.add(variantId)
  errorMessage.value = null
  try {
    const updated = await $fetch<Variant & Record<string, any>>(`/api/admin/inventory/variants/${variantId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        ...patch,
        reason: 'admin_ui'
      }
    })

    if (typeof updated?.stock === 'number') v.stock = updated.stock
    if (typeof updated?.reserved === 'number') v.reserved = updated.reserved
    if (typeof updated?.safetyStock === 'number') v.safetyStock = updated.safetyStock
    if (typeof updated?.trackInventory === 'boolean') v.trackInventory = updated.trackInventory
    recomputeAvailable(v)
  } catch (e: any) {
    errorMessage.value = e?.data?.statusMessage || 'Failed to update inventory'
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
    const data = await $fetch<Movement[]>(`/api/admin/inventory/variants/${v.id}/movements`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
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

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleString()
}

onMounted(fetchVariants)
</script>
