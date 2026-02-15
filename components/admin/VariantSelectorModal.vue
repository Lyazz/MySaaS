<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div class="w-full max-w-4xl bg-white rounded-lg shadow-xl flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 class="text-lg font-semibold text-gray-900">{{ t('admin.components.variantSelectorModal.title') }}</h3>
        <button @click="close" class="text-gray-400 hover:text-gray-500 transition-colors">
          <Icon name="lucide:x" class="w-6 h-6" />
        </button>
      </div>

      <!-- Search -->
      <div class="p-4 border-b border-gray-200 bg-gray-50">
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon name="lucide:search" class="h-5 w-5 text-gray-400" />
          </div>
          <input
            v-model="searchQuery"
            type="text"
            class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
            :placeholder="t('admin.components.variantSelectorModal.search.placeholder')"
            @input="handleSearch"
          />
        </div>
      </div>

      <!-- List -->
      <div class="flex-1 overflow-y-auto">
        <div v-if="loading" class="p-8 text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <p class="mt-2 text-gray-500">{{ t('admin.components.variantSelectorModal.loading') }}</p>
        </div>
        <div v-else-if="variants.length === 0" class="p-8 text-center text-gray-500">
          {{ t('admin.components.variantSelectorModal.empty') }}
        </div>
        <table v-else class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50 sticky top-0">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                <input
                  type="checkbox"
                  :checked="allSelected"
                  class="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                  @change="toggleAll"
                />
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {{ t('admin.components.variantSelectorModal.table.productVariant') }}
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {{ t('admin.components.variantSelectorModal.table.sku') }}
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {{ t('admin.components.variantSelectorModal.table.currentStock') }}
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="variant in variants"
              :key="variant.id"
              class="hover:bg-gray-50 cursor-pointer"
              @click="toggleSelection(variant)"
            >
              <td class="px-6 py-4 whitespace-nowrap" @click.stop>
                <input
                  type="checkbox"
                  :checked="isSelected(variant)"
                  class="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                  @change="toggleSelection(variant)"
                />
              </td>
              <td class="px-6 py-4">
                <div class="text-sm font-medium text-gray-900">{{ variant.productTitle }}</div>
                <div class="text-sm text-gray-500">{{ variant.optionTitle }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ variant.sku || '—' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ variant.stock }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-200 flex justify-between items-center bg-gray-50 rounded-b-lg">
        <div class="text-sm text-gray-700">
          {{ t('admin.components.variantSelectorModal.selectedCount', { count: selectedVariants.length }) }}
        </div>
        <div class="flex space-x-3">
          <button
            @click="close"
            class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
          >
            {{ t('admin.common.cancel') }}
          </button>
          <button
            @click="confirm"
            :disabled="selectedVariants.length === 0"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ t('admin.components.variantSelectorModal.actions.addSelected') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'select', variants: any[]): void
}>()

const authStore = useAuthStore()
const { t } = useI18n({ useScope: 'global' })
const searchQuery = ref('')
const variants = ref<any[]>([])
const loading = ref(false)
const selectedVariants = ref<any[]>([])

// Create a debounced search function
let searchTimeout: NodeJS.Timeout
const handleSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    fetchVariants()
  }, 300)
}

const fetchVariants = async () => {
  loading.value = true
  try {
    const data = await $fetch<any[]>('/api/admin/inventory/variants', {
      headers: { Authorization: `Bearer ${authStore.token}` },
      query: { search: searchQuery.value }
    })
    variants.value = data
  } catch (error) {
    console.error('Failed to fetch variants:', error)
  } finally {
    loading.value = false
  }
}

const isSelected = (variant: any) => {
  return selectedVariants.value.some(v => v.id === variant.id)
}

const toggleSelection = (variant: any) => {
  const index = selectedVariants.value.findIndex(v => v.id === variant.id)
  if (index === -1) {
    selectedVariants.value.push(variant)
  } else {
    selectedVariants.value.splice(index, 1)
  }
}

const allSelected = computed(() => {
  return variants.value.length > 0 && variants.value.every(v => isSelected(v))
})

const toggleAll = () => {
  if (allSelected.value) {
    // Deselect all visible
    variants.value.forEach(v => {
      const index = selectedVariants.value.findIndex(sv => sv.id === v.id)
      if (index !== -1) selectedVariants.value.splice(index, 1)
    })
  } else {
    // Select all visible
    variants.value.forEach(v => {
      if (!isSelected(v)) selectedVariants.value.push(v)
    })
  }
}

const close = () => {
  emit('update:modelValue', false)
  searchQuery.value = ''
  selectedVariants.value = []
}

const confirm = () => {
  emit('select', selectedVariants.value)
  close()
}

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    fetchVariants()
    selectedVariants.value = []
  }
})
</script>
