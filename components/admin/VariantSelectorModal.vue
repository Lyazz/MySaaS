<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh]">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 class="text-lg font-semibold text-slate-900">{{ t('admin.components.variantSelectorModal.title') }}</h3>
          <button @click="close" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <Icon name="lucide:x" class="w-6 h-6" />
          </button>
        </div>

        <!-- Search -->
        <div class="p-4 border-b border-slate-200 bg-slate-50">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon name="lucide:search" class="h-5 w-5 text-slate-400" />
            </div>
            <input
              v-model="searchQuery"
              type="text"
              class="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
              :placeholder="t('admin.components.variantSelectorModal.search.placeholder')"
              @input="handleSearch"
            />
          </div>
        </div>

        <!-- List -->
        <div class="flex-1 overflow-y-auto">
          <div v-if="loading" class="p-8 text-center">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            <p class="mt-2 text-slate-500">{{ t('admin.components.variantSelectorModal.loading') }}</p>
          </div>
          <div v-else-if="variants.length === 0" class="p-8 text-center text-slate-500">
            {{ t('admin.components.variantSelectorModal.empty') }}
          </div>
          <table v-else class="ui-table">
            <thead class="ui-thead sticky top-0">
              <tr>
                <th scope="col" class="ui-th w-10">
                  <input
                    type="checkbox"
                    :checked="allSelected"
                    class="h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300 rounded"
                    @change="toggleAll"
                  />
                </th>
                <th scope="col" class="ui-th">
                  {{ t('admin.components.variantSelectorModal.table.productVariant') }}
                </th>
                <th scope="col" class="ui-th">
                  {{ t('admin.components.variantSelectorModal.table.sku') }}
                </th>
                <th scope="col" class="ui-th">
                  {{ t('admin.components.variantSelectorModal.table.currentStock') }}
                </th>
              </tr>
            </thead>
            <tbody class="ui-tbody">
              <tr
                v-for="variant in variants"
                :key="variant.id"
                class="ui-tr cursor-pointer"
                @click="toggleSelection(variant)"
              >
                <td class="ui-td whitespace-nowrap" @click.stop>
                  <input
                    type="checkbox"
                    :checked="isSelected(variant)"
                    class="h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300 rounded"
                    @change="toggleSelection(variant)"
                  />
                </td>
                <td class="ui-td">
                  <div class="text-sm font-medium text-slate-900">{{ variant.productTitle }}</div>
                  <div class="text-sm text-slate-500">{{ variant.optionTitle }}</div>
                </td>
                <td class="ui-td whitespace-nowrap text-sm text-slate-600">
                  {{ variant.sku || '—' }}
                </td>
                <td class="ui-td whitespace-nowrap text-sm text-slate-600">
                  {{ variant.stock }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-slate-200 flex justify-between items-center bg-slate-50 rounded-b-2xl">
          <div class="text-sm text-slate-700">
            {{ t('admin.components.variantSelectorModal.selectedCount', { count: selectedVariants.length }) }}
          </div>
          <div class="flex space-x-3">
            <button
              @click="close"
              class="ui-btn ui-btn--secondary ui-btn--md"
            >
              {{ t('admin.common.cancel') }}
            </button>
            <button
              @click="confirm"
              :disabled="selectedVariants.length === 0"
              class="ui-btn ui-btn--primary ui-btn--md"
            >
              {{ t('admin.components.variantSelectorModal.actions.addSelected') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
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
