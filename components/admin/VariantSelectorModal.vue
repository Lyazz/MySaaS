<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 py-8">
      <div class="w-full max-w-4xl rounded-2xl flex flex-col max-h-[90vh]" style="background: var(--surface-2); border: 1px solid var(--surface-border); box-shadow: 0 24px 60px rgba(0,0,0,0.5)">
        <!-- Header -->
        <div class="px-6 py-4 flex justify-between items-center" style="border-bottom: 1px solid var(--surface-border)">
          <h3 class="text-[15px] font-semibold" style="color: var(--text-primary)">{{ t('admin.components.variantSelectorModal.title') }}</h3>
          <button @click="close" class="rounded-lg p-1.5 transition-colors" style="color: var(--text-tertiary)"
            @mouseenter="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }"
            @mouseleave="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)' }">
            <Icon name="lucide:x" class="w-5 h-5" />
          </button>
        </div>

        <!-- Search -->
        <div class="p-4" style="border-bottom: 1px solid var(--surface-border); background: var(--surface-1)">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" style="color: var(--text-tertiary)">
              <Icon name="lucide:search" class="h-4 w-4" />
            </div>
            <input
              v-model="searchQuery"
              type="text"
              class="ui-input pl-9"
              :placeholder="t('admin.components.variantSelectorModal.search.placeholder')"
              @input="handleSearch"
            />
          </div>
        </div>

        <!-- List -->
        <div class="flex-1 overflow-y-auto custom-scrollbar">
          <div v-if="loading" class="p-8 text-center">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            <p class="mt-2 text-sm" style="color: var(--text-tertiary)">{{ t('admin.components.variantSelectorModal.loading') }}</p>
          </div>
          <div v-else-if="variants.length === 0" class="p-8 text-center text-sm" style="color: var(--text-tertiary)">
            {{ t('admin.components.variantSelectorModal.empty') }}
          </div>
          <table v-else class="ui-table">
            <thead class="ui-thead sticky top-0">
              <tr>
                <th scope="col" class="ui-th w-10">
                  <input
                    type="checkbox"
                    :checked="allSelected"
                    class="h-4 w-4 text-teal-600 focus:ring-teal-500 rounded"
                    style="border-color: var(--surface-border); background: var(--surface-3)"
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
                    class="h-4 w-4 text-teal-600 focus:ring-teal-500 rounded"
                    style="border-color: var(--surface-border); background: var(--surface-3)"
                    @change="toggleSelection(variant)"
                  />
                </td>
                <td class="ui-td">
                  <div class="text-[13px] font-medium" style="color: var(--text-primary)">{{ variant.productTitle }}</div>
                  <div class="text-[12px]" style="color: var(--text-tertiary)">{{ variant.optionTitle }}</div>
                </td>
                <td class="ui-td whitespace-nowrap text-[13px]" style="color: var(--text-secondary)">
                  {{ variant.sku || '—' }}
                </td>
                <td class="ui-td whitespace-nowrap text-[13px]" style="color: var(--text-secondary)">
                  {{ variant.stock }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 flex justify-between items-center rounded-b-2xl" style="border-top: 1px solid var(--surface-border); background: var(--surface-1)">
          <div class="text-[13px]" style="color: var(--text-secondary)">
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
    const data = await $fetch('/api/admin/inventory/variants', {
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
