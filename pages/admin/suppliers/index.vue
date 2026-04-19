<template>
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold" style="color: var(--text-primary)">
          {{ t('admin.nav.suppliers') }}
        </h2>
        <p class="mt-1" style="color: var(--text-secondary)">
          {{ t('admin.pages.suppliers.index.subtitle') }}
        </p>
      </div>
      <NuxtLink
        to="/admin/suppliers/create"
        class="px-4 py-2 [background:var(--brand)] text-white rounded-md hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] transition-colors flex items-center space-x-2"
      >
        <Icon name="lucide:plus" class="w-5 h-5" />
        <span>{{ t('admin.pages.suppliers.index.addSupplier') }}</span>
      </NuxtLink>
    </div>

    <!-- Filters -->
    <div class="p-4 rounded-lg mb-6" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="ui-label mb-1 block">{{ t('admin.pages.suppliers.index.filters.searchLabel') }}</label>
          <BaseInput
            v-model="searchQuery"
            type="text"
            :placeholder="t('admin.pages.suppliers.index.filters.searchPlaceholder')"
          />
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="ui-card p-12 text-center"
    >
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 [border-color:var(--brand)]" />
      <p class="mt-2" style="color: var(--text-secondary)">
        {{ t('admin.pages.suppliers.index.loading') }}
      </p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredSuppliers.length === 0"
      class="ui-card p-12 text-center"
    >
      <Icon name="lucide:users" class="mx-auto h-12 w-12" style="color: var(--text-muted)" />
      <h3 class="mt-2 text-sm font-medium" style="color: var(--text-primary)">
        {{ t('admin.pages.suppliers.index.empty.title') }}
      </h3>
      <p class="mt-1 text-sm" style="color: var(--text-tertiary)">
        {{ t('admin.pages.suppliers.index.empty.hint') }}
      </p>
      <div class="mt-6">
        <NuxtLink
          to="/admin/suppliers/create"
          class="ui-btn ui-btn--primary ui-btn--md"
        >
          <Icon name="lucide:plus" class="w-5 h-5 mr-2" />
          {{ t('admin.pages.suppliers.index.empty.newSupplier') }}
        </NuxtLink>
      </div>
    </div>

    <!-- Suppliers Table -->
    <div
      v-else
      class="ui-card overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="ui-table">
          <thead class="ui-thead">
            <tr>
              <th class="ui-th cursor-pointer transition-colors hover:opacity-80" @click="setSort('name')">
                <div class="flex items-center gap-1">
                  {{ t('admin.pages.suppliers.index.table.name') }}
                  <Icon v-if="sortBy === 'name'" :name="sortOrder === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'" class="w-3 h-3 [color:var(--brand)]" />
                </div>
              </th>
              <th class="ui-th cursor-pointer transition-colors hover:opacity-80" @click="setSort('email')">
                <div class="flex items-center gap-1">
                  {{ t('admin.pages.suppliers.index.table.info') }}
                  <Icon v-if="sortBy === 'email'" :name="sortOrder === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'" class="w-3 h-3 [color:var(--brand)]" />
                </div>
              </th>
              <th class="ui-th cursor-pointer transition-colors hover:opacity-80" @click="setSort('address')">
                <div class="flex items-center gap-1">
                  {{ t('admin.pages.suppliers.index.table.address') }}
                  <Icon v-if="sortBy === 'address'" :name="sortOrder === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'" class="w-3 h-3 [color:var(--brand)]" />
                </div>
              </th>
              <th class="ui-th text-right">
                {{ t('admin.common.actions') }}
              </th>
            </tr>
          </thead>
          <tbody class="ui-tbody">
            <tr
              v-for="supplier in paginatedSuppliers"
              :key="supplier.id"
              class="ui-tr"
            >
              <td class="ui-td whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10 [background:rgba(var(--brand-rgb)/0.12)] rounded-full flex items-center justify-center [color:var(--brand)] font-bold uppercase">
                     {{ supplier.name.charAt(0) }}
                  </div>
                  <div class="ml-4">
                    <NuxtLink
                      :to="`/admin/suppliers/${supplier.id}`"
                      class="font-medium hover:[color:rgba(var(--brand-rgb)/0.85)] transition-colors" style="color: var(--text-primary)"
                    >
                      {{ supplier.name }}
                    </NuxtLink>
                  </div>
                </div>
              </td>
              <td class="ui-td whitespace-nowrap">
                <div class="flex flex-col text-sm" style="color: var(--text-secondary)">
                   <div v-if="supplier.email" class="flex items-center gap-1">
                     <Icon name="lucide:mail" class="w-3 h-3" style="color: var(--text-muted)" />
                     <a
                       :href="`mailto:${supplier.email}`"
                       class="hover:[color:var(--brand)] transition-colors"
                     >
                       {{ supplier.email }}
                     </a>
                   </div>
                   <div v-if="supplier.phone" class="flex items-center gap-1 mt-1">
                     <Icon name="lucide:phone" class="w-3 h-3" style="color: var(--text-muted)" />
                     <a
                       :href="`tel:${supplier.phone}`"
                       class="hover:[color:var(--brand)] transition-colors"
                     >
                       {{ supplier.phone }}
                     </a>
                   </div>
                   <span v-if="!supplier.email && !supplier.phone" style="color: var(--text-muted)">—</span>
                </div>
              </td>
              <td class="ui-td whitespace-nowrap text-sm" style="color: var(--text-secondary)">
                 <a
                   v-if="supplier.address"
                   :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(supplier.address)}`"
                   target="_blank"
                   class="hover:[color:var(--brand)] transition-colors"
                 >
                   {{ supplier.address }}
                 </a>
                 <span v-else style="color: var(--text-muted)">—</span>
              </td>
              <td class="ui-td whitespace-nowrap text-right">
                <div class="flex items-center justify-end space-x-1">
                  <NuxtLink
                    :to="`/admin/suppliers/${supplier.id}`"
                    class="p-2 rounded-md transition-colors hover:[color:rgba(var(--brand-rgb)/0.85)]" style="color: var(--text-muted)"
                    :title="t('admin.common.edit')"
                  >
                    <Icon name="lucide:pencil" class="w-4 h-4" />
                  </NuxtLink>
                  <button
                    class="p-2 rounded-md transition-colors hover:text-red-400" style="color: var(--text-muted)"
                    :title="t('admin.common.delete')"
                    @click="confirmDelete(supplier)"
                  >
                    <Icon name="lucide:trash" class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-slate-200 sm:px-6">
        <div class="flex flex-1 items-center justify-between sm:hidden">
          <button
            :disabled="currentPage === 1"
            class="ui-btn ui-btn--secondary ui-btn--sm"
            @click="currentPage--"
          >
            <Icon name="lucide:chevron-left" class="w-4 h-4" />
          </button>
          <span class="text-sm text-slate-600">
            {{ t('admin.common.page', { page: currentPage, total: totalPages }) }}
          </span>
          <button
            :disabled="currentPage === totalPages"
            class="ui-btn ui-btn--secondary ui-btn--sm"
            @click="currentPage++"
          >
            <Icon name="lucide:chevron-right" class="w-4 h-4" />
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-slate-700">
              {{ t('admin.pages.suppliers.index.pagination.showing', {
                from: (currentPage - 1) * itemsPerPage + 1,
                to: Math.min(currentPage * itemsPerPage, filteredSuppliers.length),
                total: filteredSuppliers.length
              }) }}
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                :disabled="currentPage === 1"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                @click="currentPage--"
              >
                {{ t('admin.common.previous') }}
              </button>
              <button
                v-for="page in totalPages"
                :key="page"
                :class="[
                  'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
                  currentPage === page
                    ? 'z-10 [background:rgba(var(--brand-rgb)/0.08)] [border-color:var(--brand)] [color:var(--brand)]'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                ]"
                @click="currentPage = page"
              >
                {{ page }}
              </button>
              <button
                :disabled="currentPage === totalPages"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                @click="currentPage++"
              >
                {{ t('admin.common.next') }}
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <AdminConfirmModal
      v-model="showDeleteModal"
      :title="t('admin.pages.suppliers.index.deleteModal.title')"
      :message="deleteMessage"
      :confirm-text="t('admin.common.delete')"
      :cancel-text="t('admin.common.cancel')"
      :error="deleteError"
      @confirm="handleDelete"
      @update:model-value="val => { if (!val) deleteError = null }"
    />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import BaseInput from '~/components/ui/BaseInput.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.suppliers.index.title'
})

const authStore = useAuthStore()
const { t } = useI18n({ useScope: 'global' })

interface Supplier {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
}

const suppliers = ref<Supplier[]>([])
const loading = ref(true)
const searchQuery = ref('')
const sortBy = ref<string>('name')
const sortOrder = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)
const itemsPerPage = 25
const showDeleteModal = ref(false)
const supplierToDelete = ref<Supplier | null>(null)
const deleteError = ref<string | null>(null)

const deleteMessage = computed(() => {
  if (supplierToDelete.value?.name) {
    return t('admin.pages.suppliers.index.deleteModal.messageWithName', { name: supplierToDelete.value.name })
  }
  return t('admin.pages.suppliers.index.deleteModal.message')
})

const filteredSuppliers = computed(() => {
  let filtered = suppliers.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter((s) =>
      s.name.toLowerCase().includes(query) ||
      (s.email && s.email.toLowerCase().includes(query)) ||
      (s.phone && s.phone.includes(query))
    )
  }

  return filtered
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredSuppliers.value.length / itemsPerPage)))

const paginatedSuppliers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredSuppliers.value.slice(start, end)
})

async function fetchSuppliers() {
  loading.value = true
  try {
    const data = await $fetch('/api/admin/suppliers', {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      query: {
        sortBy: sortBy.value,
        sortOrder: sortOrder.value
      }
    }) as Supplier[]
    suppliers.value = data
  } catch (error) {
    console.error('Failed to fetch suppliers:', error)
  } finally {
    loading.value = false
  }
}

function confirmDelete(supplier: Supplier) {
  supplierToDelete.value = supplier
  showDeleteModal.value = true
}

async function handleDelete() {
  if (!supplierToDelete.value) return

  try {
    await $fetch(`/api/admin/suppliers/${supplierToDelete.value.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })

    suppliers.value = suppliers.value.filter((s) => s.id !== supplierToDelete.value?.id)
    supplierToDelete.value = null
    showDeleteModal.value = false
    deleteError.value = null
  } catch (error: any) {
    console.error('Failed to delete supplier:', error)
    const status = error?.response?.status || error?.statusCode
    const msg = error?.data?.statusMessage || error?.response?.data?.statusMessage
    if (status === 409 || msg === 'HAS_TRANSACTIONS') {
      deleteError.value = t('admin.pages.suppliers.index.deleteModal.errorHasTransactions')
    } else {
      deleteError.value = t('admin.pages.suppliers.index.deleteModal.error')
    }
  }
}

function setSort(field: string) {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = 'asc'
  }
  fetchSuppliers()
}

watch([searchQuery], () => {
  currentPage.value = 1
})

onMounted(() => {
  fetchSuppliers()
})
</script>
