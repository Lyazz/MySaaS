<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-medium text-gray-900">
        {{ t('admin.variantsTable.title') }}
      </h3>
      <p class="text-sm text-gray-500">
        {{ t('admin.variantsTable.subtitle') }}
      </p>
    </div>

    <div class="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
      <table class="min-w-full divide-y divide-gray-300">
        <thead class="bg-gray-50">
          <tr>
            <th
              scope="col"
              class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
            >
              {{ t('admin.variantsTable.columns.variant') }}
            </th>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              {{ t('admin.variantsTable.columns.price') }}
            </th>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              {{ t('admin.variantsTable.columns.track') }}
            </th>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              {{ t('admin.variantsTable.columns.onHand') }}
            </th>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              {{ t('admin.variantsTable.columns.reserved') }}
            </th>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              {{ t('admin.variantsTable.columns.safety') }}
            </th>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              {{ t('admin.variantsTable.columns.available') }}
            </th>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              {{ t('admin.variantsTable.columns.sku') }}
            </th>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              {{ t('admin.variantsTable.columns.active') }}
            </th>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              {{ t('admin.variantsTable.columns.images') }}
            </th>
            <th
              scope="col"
              class="relative py-3.5 pl-3 pr-4 sm:pr-6"
            >
              <span class="sr-only">{{ t('admin.common.actions') }}</span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 bg-white">
          <tr
            v-for="variant in variants"
            :key="variant.id"
          >
            <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
              {{ getVariantTitle(variant) }}
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
              <input 
                v-model.number="variant.price" 
                type="number"
                class="block w-24 rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border px-2 py-1" 
                @change="updateVariantInfo(variant)"
              >
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
              <input
                v-model="variant.trackInventory"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                :disabled="savingInventoryIds.has(variant.id)"
                @change="updateVariantInventory(variant, { trackInventory: Boolean(variant.trackInventory) })"
              >
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
              <span class="font-mono text-gray-700">
                {{ Number(variant.stock || 0) }}
              </span>
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-700">
              {{ Number(variant.reserved || 0) }}
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
              <input
                v-model.number="variant.safetyStock"
                type="number"
                min="0"
                class="block w-24 rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border px-2 py-1"
                :disabled="savingInventoryIds.has(variant.id)"
                @change="updateVariantInventory(variant, { safetyStock: Number(variant.safetyStock) })"
              >
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-700">
              <span v-if="variant.trackInventory !== false">
                {{ getAvailable(variant) }}
              </span>
              <span v-else class="text-gray-400">∞</span>
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
              <input 
                v-model="variant.sku" 
                type="text"
                class="block w-32 rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border px-2 py-1" 
                @change="updateVariantInfo(variant)"
              >
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
              <input 
                v-model="variant.isActive" 
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" 
                @change="updateVariantInfo(variant)"
              >
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
              <button
                type="button"
                class="text-teal-600 hover:text-teal-900 font-medium"
                @click="openImageEditor(variant)"
              >
                {{ t('admin.variantsTable.actions.manageImages', { count: variant.images?.length || 0 }) }}
              </button>
            </td>
            <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
              <button
                type="button"
                class="text-gray-600 hover:text-gray-900"
                @click="openMovements(variant)"
              >
                {{ t('admin.variantsTable.actions.movements') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Movements modal -->
    <div
      v-if="movementsVariant"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <div class="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 space-y-4">
        <div class="flex items-start justify-between">
          <div class="min-w-0">
            <h4 class="text-lg font-semibold text-gray-900 truncate">
              {{ t('admin.variantsTable.movements.title') }} — {{ getVariantTitle(movementsVariant) }}
            </h4>
            <p class="text-sm text-gray-500">
              {{ t('admin.variantsTable.movements.subtitle') }}
            </p>
          </div>
          <button
            type="button"
            class="text-gray-400 hover:text-gray-600"
            @click="closeMovements"
          >
            ✕
          </button>
        </div>

        <div
          v-if="movementsLoading"
          class="text-sm text-gray-600 bg-gray-50 p-3 rounded border border-dashed border-gray-200"
        >
          {{ t('admin.variantsTable.movements.loading') }}
        </div>

        <div
          v-else-if="movements.length === 0"
          class="text-sm text-gray-600 bg-gray-50 p-3 rounded border border-dashed border-gray-200"
        >
          {{ t('admin.variantsTable.movements.empty') }}
        </div>

        <div
          v-else
          class="overflow-x-auto"
        >
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{{ t('admin.variantsTable.movements.columns.date') }}</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{{ t('admin.variantsTable.movements.columns.type') }}</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{{ t('admin.variantsTable.movements.columns.deltaStock') }}</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{{ t('admin.variantsTable.movements.columns.deltaReserved') }}</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{{ t('admin.variantsTable.movements.columns.deltaSafety') }}</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{{ t('admin.variantsTable.movements.columns.after') }}</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{{ t('admin.variantsTable.movements.columns.by') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              <tr v-for="m in movements" :key="m.id">
                <td class="px-3 py-2 text-sm text-gray-700">{{ formatDate(m.createdAt) }}</td>
                <td class="px-3 py-2 text-sm text-gray-700">
                  <div class="min-w-0">
                    <p class="truncate font-medium">{{ m.type }}</p>
                    <p v-if="m.orderId" class="truncate text-xs text-gray-500">{{ t('admin.variantsTable.movements.order', { id: m.orderId }) }}</p>
                  </div>
                </td>
                <td class="px-3 py-2 text-sm text-gray-700">{{ m.delta }}</td>
                <td class="px-3 py-2 text-sm text-gray-700">{{ m.reservedDelta }}</td>
                <td class="px-3 py-2 text-sm text-gray-700">{{ m.safetyStockDelta }}</td>
                <td class="px-3 py-2 text-sm text-gray-700">
                  <span v-if="m.stockAfter !== null">S={{ m.stockAfter }}</span><span v-else>—</span>
                  <span class="text-gray-400"> · </span>
                  <span v-if="m.reservedAfter !== null">R={{ m.reservedAfter }}</span><span v-else>—</span>
                  <span class="text-gray-400"> · </span>
                  <span v-if="m.safetyStockAfter !== null">SS={{ m.safetyStockAfter }}</span><span v-else>—</span>
                </td>
                <td class="px-3 py-2 text-sm text-gray-700">{{ m.createdBy?.email || t('admin.variantsTable.movements.system') }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button
            type="button"
            class="px-4 py-2 rounded-md border text-sm"
            @click="closeMovements"
          >
            {{ t('admin.common.close') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Image picker modal -->
    <div
      v-if="editingVariantId"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <div class="bg-white rounded-lg shadow-xl w-full max-w-xl p-6 space-y-4">
        <div class="flex items-start justify-between">
          <div>
            <h4 class="text-lg font-semibold text-gray-900">
              {{ t('admin.variantsTable.imagePicker.title') }}
            </h4>
            <p class="text-sm text-gray-500">
              {{ t('admin.variantsTable.imagePicker.subtitle') }}
            </p>
          </div>
          <button
            type="button"
            class="text-gray-400 hover:text-gray-600"
            @click="closeImageEditor"
          >
            ✕
          </button>
        </div>

        <div
          v-if="availableImages.length === 0"
          class="text-sm text-gray-600 bg-gray-50 p-3 rounded border border-dashed border-gray-200"
        >
          {{ t('admin.variantsTable.imagePicker.empty') }}
        </div>

        <div
          v-else
          class="grid grid-cols-2 sm:grid-cols-3 gap-3"
        >
          <label
            v-for="img in availableImages"
            :key="img.url"
            class="border rounded-lg p-2 flex flex-col gap-2 cursor-pointer hover:border-teal-400"
          >
            <div class="aspect-square overflow-hidden rounded-md bg-gray-50 border">
              <img
                :src="img.url"
                class="w-full h-full object-cover"
                :alt="img.label || t('admin.variantsTable.imagePicker.imageFallback')"
              >
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="truncate text-gray-700">{{ img.label || t('admin.variantsTable.imagePicker.imageFallback') }}</span>
              <input
                type="checkbox"
                class="h-4 w-4 text-teal-600 border-gray-300 rounded"
                :checked="selectedImageUrls.has(img.url)"
                @change="toggleImage(img.url)"
              >
            </div>
          </label>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button
            type="button"
            class="px-4 py-2 rounded-md border text-sm"
            @click="closeImageEditor"
          >
            {{ t('admin.common.cancel') }}
          </button>
          <button
            type="button"
            :disabled="savingImages"
            class="px-4 py-2 bg-teal-600 text-white rounded-md text-sm hover:bg-teal-700 disabled:opacity-50"
            @click="saveVariantImages"
          >
            {{ savingImages ? t('admin.common.saving') : t('admin.variantsTable.imagePicker.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps<{
    productId: string
    variants: any[]
    options?: any[] // Added options to help sort title
    productImages?: any[]
    legacyImages?: string[]
}>()

const emit = defineEmits(['refresh'])
const authStore = useAuthStore()

function getVariantTitle(variant: any) {
    if (!variant.optionValues || variant.optionValues.length === 0) return t('admin.variantsTable.defaultVariant')
    
    // If we have options metadata, sort values by option position
    let values = [...variant.optionValues]
    if (props.options && props.options.length > 0) {
        // Map optionId -> Position
        const optionPos = new Map(props.options.map((o: any) => [o.id, o.position]))
        
        values.sort((a: any, b: any) => {
            const posA = optionPos.get(a.optionValue?.optionId) ?? 999
            const posB = optionPos.get(b.optionValue?.optionId) ?? 999
            return posA - posB
        })
    }

    return values.map((ov: any) => ov.optionValue?.label || '?').join(' / ')
}

function getAvailable(variant: any) {
    const stock = Number(variant.stock || 0)
    const reserved = Number(variant.reserved || 0)
    const safetyStock = Number(variant.safetyStock || 0)
    return Math.max(stock - reserved - safetyStock, 0)
}

async function updateVariantInfo(variant: any) {
    try {
        await $fetch(`/api/admin/variants/${variant.id}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${authStore.token}` },
            body: {
                price: variant.price,
                sku: variant.sku,
                isActive: variant.isActive,
                compareAtPrice: variant.compareAtPrice
            }
        })
    } catch (e) {
        console.error(e)
        alert(t('admin.variantsTable.errors.updateVariantFailed'))
    }
}

const savingInventoryIds = ref<Set<string>>(new Set())

async function updateVariantInventory(variant: any, patch: any) {
    savingInventoryIds.value.add(variant.id)
    try {
        const updated = await $fetch(`/api/admin/inventory/variants/${variant.id}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${authStore.token}` },
            body: {
                ...patch,
                reason: 'admin_product_variants'
            }
        })

        if (updated && typeof updated === 'object') {
            if (typeof (updated as any).stock === 'number') variant.stock = (updated as any).stock
            if (typeof (updated as any).reserved === 'number') variant.reserved = (updated as any).reserved
            if (typeof (updated as any).safetyStock === 'number') variant.safetyStock = (updated as any).safetyStock
            if (typeof (updated as any).trackInventory === 'boolean') variant.trackInventory = (updated as any).trackInventory
        }
    } catch (e) {
        console.error(e)
        alert(t('admin.variantsTable.errors.updateInventoryFailed'))
        emit('refresh')
    } finally {
        savingInventoryIds.value.delete(variant.id)
    }
}

type Movement = {
    id: string
    type: string
    delta: number
    reservedDelta: number
    safetyStockDelta: number
    orderId: string | null
    stockAfter: number | null
    reservedAfter: number | null
    safetyStockAfter: number | null
    createdAt: string
    createdBy: { id: string; email: string } | null
}

const movementsVariant = ref<any | null>(null)
const movements = ref<Movement[]>([])
const movementsLoading = ref(false)

async function openMovements(variant: any) {
    movementsVariant.value = variant
    movements.value = []
    movementsLoading.value = true
    try {
        const data = await $fetch<Movement[]>(`/api/admin/inventory/variants/${variant.id}/movements`, {
            headers: { Authorization: `Bearer ${authStore.token}` }
        })
        movements.value = data
    } catch (e) {
        console.error(e)
        movements.value = []
    } finally {
        movementsLoading.value = false
    }
}

function closeMovements() {
    movementsVariant.value = null
    movements.value = []
}

function formatDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleString()
}

const editingVariantId = ref<string | null>(null)
const selectedImageUrls = ref<Set<string>>(new Set())
const savingImages = ref(false)

const availableImages = computed(() => {
    const list: { id: string | null; url: string; label: string }[] = []

    if (props.productImages && props.productImages.length > 0) {
        props.productImages.forEach((img: any, idx: number) => {
            if (!img?.url) return
            list.push({
                id: img.id ?? null,
                url: img.url,
                label: img.alt || img.label || t('admin.variantsTable.imagePicker.imageWithIndex', { index: idx + 1 })
            })
        })
    }

    if (props.legacyImages && props.legacyImages.length > 0) {
        props.legacyImages.forEach((url: string, idx: number) => {
            if (!url) return
            list.push({
                id: null,
                url,
                label: t('admin.variantsTable.imagePicker.imageWithIndex', { index: idx + 1 })
            })
        })
    }

    // Dedupe by URL while preserving order
    const seen = new Set<string>()
    return list.filter((img) => {
        if (seen.has(img.url)) return false
        seen.add(img.url)
        return true
    })
})

function openImageEditor(variant: any) {
    editingVariantId.value = variant.id
    const current = (variant.images || []).map((vi: any) => vi.image?.url || vi.url).filter(Boolean)
    selectedImageUrls.value = new Set(current)
}

function closeImageEditor() {
    editingVariantId.value = null
    selectedImageUrls.value = new Set()
}

function toggleImage(url: string) {
    const next = new Set(selectedImageUrls.value)
    if (next.has(url)) {
        next.delete(url)
    } else {
        next.add(url)
    }
    selectedImageUrls.value = next
}

async function saveVariantImages() {
    if (!editingVariantId.value) return
    savingImages.value = true
    try {
        const imageUrls = Array.from(selectedImageUrls.value)
        await $fetch(`/api/admin/variants/${editingVariantId.value}/images`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${authStore.token}` },
            body: { imageUrls }
        })
        closeImageEditor()
        emit('refresh')
    } catch (e) {
        console.error('Failed to save variant images', e)
        const message = (e as any)?.data?.statusMessage || (e as any)?.message || t('admin.variantsTable.errors.saveImagesFailed')
        alert(message)
    } finally {
        savingImages.value = false
    }
}
</script>
