<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-medium text-gray-900">
        Variants
      </h3>
      <p class="text-sm text-gray-500">
        Variants stay in sync with your options automatically.
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
              Variant
            </th>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              Price
            </th>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              Stock
            </th>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              SKU
            </th>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              Active
            </th>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              Images
            </th>
            <th
              scope="col"
              class="relative py-3.5 pl-3 pr-4 sm:pr-6"
            >
              <span class="sr-only">Actions</span>
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
                @change="updateVariant(variant)"
              >
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
              <input 
                v-model.number="variant.stock" 
                type="number"
                class="block w-24 rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border px-2 py-1" 
                @change="updateVariant(variant)"
              >
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
              <input 
                v-model="variant.sku" 
                type="text"
                class="block w-32 rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border px-2 py-1" 
                @change="updateVariant(variant)"
              >
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
              <input 
                v-model="variant.isActive" 
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" 
                @change="updateVariant(variant)"
              >
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
              <button
                type="button"
                class="text-teal-600 hover:text-teal-900 font-medium"
                @click="openImageEditor(variant)"
              >
                Manage ({{ variant.images?.length || 0 }})
              </button>
            </td>
            <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
              <!-- Placeholder for future row actions -->
            </td>
          </tr>
        </tbody>
      </table>
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
              Select images for this variant
            </h4>
            <p class="text-sm text-gray-500">
              Images come from the product gallery. Check to attach.
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
          No product images available. Upload images to the product first, then attach them here.
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
                :alt="img.label || 'Image'"
              >
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="truncate text-gray-700">{{ img.label || 'Image' }}</span>
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
            Cancel
          </button>
          <button
            type="button"
            :disabled="savingImages"
            class="px-4 py-2 bg-teal-600 text-white rounded-md text-sm hover:bg-teal-700 disabled:opacity-50"
            @click="saveVariantImages"
          >
            {{ savingImages ? 'Saving...' : 'Save images' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

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
    if (!variant.optionValues || variant.optionValues.length === 0) return 'Default'
    
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

async function updateVariant(variant: any) {
    try {
        await $fetch(`/api/admin/variants/${variant.id}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${authStore.token}` },
            body: {
                price: variant.price,
                stock: variant.stock,
                sku: variant.sku,
                isActive: variant.isActive
            }
        })
    } catch (e) {
        console.error(e)
        alert('Failed to update variant')
    }
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
                label: img.alt || img.label || `Image ${idx + 1}`
            })
        })
    }

    if (props.legacyImages && props.legacyImages.length > 0) {
        props.legacyImages.forEach((url: string, idx: number) => {
            if (!url) return
            list.push({
                id: null,
                url,
                label: `Image ${idx + 1}`
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
        const message = (e as any)?.data?.statusMessage || (e as any)?.message || 'Failed to save images'
        alert(message)
    } finally {
        savingImages.value = false
    }
}
</script>
