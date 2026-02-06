<template>
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">
          {{ t('admin.nav.products') }}
        </h2>
        <p class="text-gray-600 mt-1">
          {{ t('admin.pages.products.index.subtitle') }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2 justify-end">
        <span
          v-if="selectedIds.length > 0"
          class="text-sm text-gray-600"
        >
          {{ t('admin.pages.products.index.bulk.selected', { count: selectedIds.length }) }}
        </span>

        <button
          type="button"
          class="px-3 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center space-x-2"
          :disabled="loading"
          @click="exportProductsCsv"
        >
          <Icon name="lucide:download" class="w-5 h-5" />
          <span>{{ t('admin.pages.products.index.bulk.export') }}</span>
        </button>

        <button
          type="button"
          class="px-3 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center space-x-2"
          :disabled="loading"
          @click="openImportModal"
        >
          <Icon name="lucide:upload" class="w-5 h-5" />
          <span>{{ t('admin.pages.products.index.bulk.import') }}</span>
        </button>

        <button
          type="button"
          class="px-3 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center space-x-2 disabled:opacity-50"
          :disabled="loading || selectedIds.length === 0"
          @click="openBulkUpdateModal"
        >
          <Icon name="lucide:wand-2" class="w-5 h-5" />
          <span>{{ t('admin.pages.products.index.bulk.update') }}</span>
        </button>

        <button
          type="button"
          class="px-3 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center space-x-2 disabled:opacity-50"
          :disabled="loading || selectedIds.length !== 1"
          @click="duplicateSelectedProduct"
        >
          <Icon name="lucide:copy" class="w-5 h-5" />
          <span>{{ t('admin.pages.products.index.bulk.duplicate') }}</span>
        </button>

        <NuxtLink
          to="/admin/products/create"
          class="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors flex items-center space-x-2"
        >
          <Icon name="lucide:plus" class="w-5 h-5" />
          <span>{{ t('admin.pages.products.index.addProduct') }}</span>
        </NuxtLink>
      </div>
    </div>
 
    <!-- Filters -->
    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('admin.pages.products.index.filters.searchLabel') }}</label>
          <BaseInput
            v-model="searchQuery"
            :placeholder="t('admin.pages.products.index.filters.searchPlaceholder')"
          />
        </div>
        <div>
          <BaseSelect
            v-model="selectedCategory"
            :label="t('admin.pages.products.index.filters.category')"
          >
            <option value="">
              {{ t('admin.pages.products.index.filters.allCategories') }}
            </option>
            <option
              v-for="cat in categories"
              :key="cat.id"
              :value="cat.id"
            >
              {{ cat.title }}
            </option>
          </BaseSelect>
        </div>
        <div>
          <BaseSelect
            v-model="selectedStatus"
            :label="t('admin.pages.products.index.filters.status')"
          >
            <option value="">
              {{ t('admin.pages.products.index.filters.allStatus') }}
            </option>
            <option value="active">
              {{ t('admin.common.active') }}
            </option>
            <option value="inactive">
              {{ t('admin.common.inactive') }}
            </option>
          </BaseSelect>
        </div>
      </div>
    </div>
 
    <!-- Loading State -->
    <div
      v-if="loading"
      class="bg-white rounded-lg shadow p-12 text-center"
    >
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      <p class="mt-2 text-gray-600">
        {{ t('admin.pages.products.index.loading') }}
      </p>
    </div>
 
    <!-- Empty State -->
    <div
      v-else-if="filteredProducts.length === 0"
      class="bg-white rounded-lg shadow p-12 text-center"
    >
      <Icon name="lucide:package" class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">
        {{ t('admin.pages.products.index.empty.title') }}
      </h3>
      <p class="mt-1 text-sm text-gray-500">
        {{ t('admin.pages.products.index.empty.hint') }}
      </p>
      <div class="mt-6">
        <NuxtLink
          to="/admin/products/create"
          class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700"
        >
          <Icon name="lucide:plus" class="w-5 h-5 mr-2" />
          {{ t('admin.pages.products.index.empty.newProduct') }}
        </NuxtLink>
      </div>
    </div>
 
    <!-- Products Table -->
    <div
      v-else
      class="bg-white rounded-lg shadow overflow-hidden"
    >
      <div class="px-4 py-3 bg-gray-50 flex flex-wrap items-center gap-3 justify-between">
        <div class="text-sm text-gray-700">
          {{ t('admin.pages.products.index.sort.sortBy') }}
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="option in sortOptions"
            :key="option.key"
            :class="[
              'inline-flex items-center px-3 py-1 text-sm font-medium border rounded-md transition-colors',
              sortBy === option.key
                ? 'bg-teal-50 border-teal-500 text-teal-700'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
            ]"
            @click="setSort(option.key)"
          >
            <span>{{ t(option.labelKey) }}</span>
            <Icon
              v-if="sortBy === option.key"
              :name="sortOrder === 'asc' ? 'lucide:chevron-up' : 'lucide:chevron-down'"
              class="w-4 h-4 ml-2"
            />
          </button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
	          <thead class="bg-gray-50">
	            <tr>
	              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
	                <input
	                  type="checkbox"
	                  class="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
	                  :checked="allVisibleSelected"
	                  :disabled="paginatedProducts.length === 0"
	                  @change="toggleSelectAllVisible"
	                >
	              </th>
	              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
	                {{ t('admin.pages.products.index.table.product') }}
	              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {{ t('admin.pages.products.index.table.category') }}
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {{ t('admin.pages.products.index.table.price') }}
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {{ t('admin.pages.products.index.table.stock') }}
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {{ t('admin.pages.products.index.table.status') }}
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {{ t('admin.pages.products.index.table.links') }}
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {{ t('admin.pages.products.index.table.actions') }}
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
	            <tr
	              v-for="product in paginatedProducts"
	              :key="product.id"
	              class="hover:bg-gray-50"
	            >
	              <td class="px-6 py-4 whitespace-nowrap">
	                <input
	                  v-model="selectedIds"
	                  type="checkbox"
	                  class="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
	                  :value="product.id"
	                >
	              </td>
	              <td class="px-6 py-4 whitespace-nowrap">
	                <div class="flex items-center">
	                  <div class="flex-shrink-0 h-10 w-10 bg-gray-200 rounded flex items-center justify-center overflow-hidden">
                    <img 
                      v-if="getProductMainImage(product)" 
                      :src="getProductMainImage(product)" 
                      :alt="product.title" 
                      class="h-10 w-10 object-cover" 
                    >
                    <Icon
                      v-else
                      name="lucide:image"
                      class="w-6 h-6 text-gray-400"
                    />
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">
                      {{ product.title }}
                    </div>
                    <div class="text-sm text-gray-500">
                      {{ product.slug }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  v-if="product.category"
                  class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800"
                >
                  {{ product.category.title }}
                </span>
                <span
                  v-else
                  class="text-sm text-gray-400"
                >{{ t('admin.pages.products.index.table.uncategorized') }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatCurrency(product.price) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ product.stock }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="[
                    'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
                    product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  ]"
                >
                  {{ product.isActive ? t('admin.common.active') : t('admin.common.inactive') }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div class="flex flex-col space-y-1">
                  <!-- Product Link -->
                  <div class="flex items-center space-x-2">
                    <span class="text-xs text-gray-400 w-12">{{ t('admin.pages.products.index.links.product') }}:</span>
                    <a
                      :href="getProductUrl(product.slug)"
                      target="_blank"
                      class="text-teal-600 hover:text-teal-900"
                      :title="t('admin.pages.products.index.links.openProduct')"
                    >
                      <Icon name="lucide:external-link" class="w-4 h-4" />
                    </a>
                    <button
                      class="text-gray-400 hover:text-gray-600"
                      :title="t('admin.pages.products.index.links.copyProduct')"
                      @click="copyLink(`/p/${product.slug}`)"
                    >
                      <Icon name="lucide:copy" class="w-4 h-4" />
                    </button>
                  </div>
                  <!-- Landing Link -->
                  <div class="flex items-center space-x-2">
                    <span class="text-xs text-gray-400 w-12">{{ t('admin.pages.products.index.links.landing') }}:</span>
                    <a
                      :href="getLandingUrl(product.slug)"
                      target="_blank"
                      class="text-teal-600 hover:text-teal-900"
                      :title="t('admin.pages.products.index.links.openLanding')"
                    >
                      <Icon name="lucide:external-link" class="w-4 h-4" />
                    </a>
                    <button
                      class="text-gray-400 hover:text-gray-600"
                      :title="t('admin.pages.products.index.links.copyLanding')"
                      @click="copyLink(`/p/${product.slug}?mode=landing`)"
                    >
                      <Icon name="lucide:copy" class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end space-x-3">
                  <NuxtLink
                    :to="`/admin/products/${product.id}`"
                    class="inline-flex items-center text-teal-600 hover:text-teal-900 transition-colors"
                  >
                    <Icon name="lucide:pencil" class="w-4 h-4 mr-1" />
                    <span>{{ t('admin.common.edit') }}</span>
                  </NuxtLink>
                  <button
                    class="inline-flex items-center text-red-600 hover:text-red-900 transition-colors"
                    @click="confirmDelete(product)"
                  >
                    <Icon name="lucide:trash" class="w-4 h-4 mr-1" />
                    <span>{{ t('admin.common.delete') }}</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
 
      <!-- Pagination -->
      <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div class="flex-1 flex justify-between sm:hidden">
          <button
            :disabled="currentPage === 1"
            class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            @click="currentPage--"
          >
            {{ t('admin.common.previous') }}
          </button>
          <button
            :disabled="currentPage === totalPages"
            class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            @click="currentPage++"
          >
            {{ t('admin.common.next') }}
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700">
              {{ t('admin.pages.products.index.pagination.showing', {
                from: (currentPage - 1) * itemsPerPage + 1,
                to: Math.min(currentPage * itemsPerPage, filteredProducts.length),
                total: filteredProducts.length
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
                    ? 'z-10 bg-teal-50 border-teal-500 text-teal-600'
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
	      :title="t('admin.pages.products.index.deleteModal.title')"
	      :message="t('admin.pages.products.index.deleteModal.message', { title: productToDelete?.title || '' })"
	      :confirm-text="t('admin.common.delete')"
	      :cancel-text="t('admin.common.cancel')"
	      @confirm="handleDelete"
	    />

	    <!-- Import CSV modal -->
	    <div
	      v-if="showImportCsvModal"
	      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
	    >
	      <div class="w-full max-w-lg rounded-lg bg-white shadow-xl">
	        <div class="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
	          <div class="min-w-0">
	            <h3 class="truncate text-lg font-semibold text-gray-900">
	              {{ t('admin.pages.products.index.bulk.importTitle') }}
	            </h3>
	            <p class="mt-1 text-sm text-gray-600">
	              {{ t('admin.pages.products.index.bulk.importHint') }}
	            </p>
	          </div>
	          <button
	            type="button"
	            class="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
	            @click="closeImportModal"
	          >
	            <Icon name="lucide:x" class="h-5 w-5" />
	          </button>
	        </div>
	        <div class="px-6 py-5 space-y-4">
	          <input
	            ref="importCsvInput"
	            type="file"
	            accept=".csv,text/csv"
	            class="block w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-teal-700 hover:file:bg-teal-100"
	            :disabled="importingCsv"
	            @change="onImportCsvFileChange"
	          >

	          <div
	            v-if="importCsvResult"
	            class="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700"
	          >
	            <div>{{ t('admin.pages.products.index.bulk.importResult', importCsvResult) }}</div>
	            <div
	              v-if="importCsvResult.errors?.length"
	              class="mt-2 text-xs text-red-700"
	            >
	              {{ t('admin.pages.products.index.bulk.importErrors', { count: importCsvResult.errors.length }) }}
	            </div>
	          </div>
	        </div>
	        <div class="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
	          <button
	            type="button"
	            class="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50"
	            @click="closeImportModal"
	          >
	            {{ t('admin.common.close') }}
	          </button>
	        </div>
	      </div>
	    </div>

	    <!-- Bulk update modal -->
	    <div
	      v-if="showBulkUpdateModal"
	      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
	    >
	      <div class="w-full max-w-lg rounded-lg bg-white shadow-xl">
	        <div class="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
	          <div class="min-w-0">
	            <h3 class="truncate text-lg font-semibold text-gray-900">
	              {{ t('admin.pages.products.index.bulk.updateTitle') }}
	            </h3>
	            <p class="mt-1 text-sm text-gray-600">
	              {{ t('admin.pages.products.index.bulk.updateHint') }}
	            </p>
	          </div>
	          <button
	            type="button"
	            class="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
	            @click="closeBulkUpdateModal"
	          >
	            <Icon name="lucide:x" class="h-5 w-5" />
	          </button>
	        </div>

	        <div class="px-6 py-5 space-y-4">
	          <BaseInput
	            v-model="bulkPrice"
	            :label="t('admin.pages.products.index.bulk.fields.price')"
	            :placeholder="t('admin.pages.products.index.bulk.fields.pricePlaceholder')"
	          />

	          <BaseInput
	            v-model="bulkStock"
	            type="number"
	            :label="t('admin.pages.products.index.bulk.fields.stock')"
	            :placeholder="t('admin.pages.products.index.bulk.fields.stockPlaceholder')"
	          />

	          <BaseSelect
	            v-model="bulkIsActive"
	            :label="t('admin.pages.products.index.bulk.fields.status')"
	          >
	            <option value="">
	              {{ t('admin.pages.products.index.bulk.fields.noChange') }}
	            </option>
	            <option value="true">
	              {{ t('admin.common.active') }}
	            </option>
	            <option value="false">
	              {{ t('admin.common.inactive') }}
	            </option>
	          </BaseSelect>

	          <BaseSelect
	            v-model="bulkCategoryId"
	            :label="t('admin.pages.products.index.bulk.fields.category')"
	          >
	            <option value="">
	              {{ t('admin.pages.products.index.bulk.fields.noChange') }}
	            </option>
	            <option value="__clear__">
	              {{ t('admin.pages.products.index.bulk.fields.clearCategory') }}
	            </option>
	            <option
	              v-for="cat in categories"
	              :key="cat.id"
	              :value="cat.id"
	            >
	              {{ cat.title }}
	            </option>
	          </BaseSelect>

	          <label class="flex items-center gap-2 text-sm text-gray-700">
	            <input
	              v-model="bulkPropagatePriceToVariants"
	              type="checkbox"
	              class="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
	            >
	            {{ t('admin.pages.products.index.bulk.fields.propagatePrice') }}
	          </label>

	          <div
	            v-if="bulkError"
	            class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
	          >
	            {{ bulkError }}
	          </div>
	        </div>

	        <div class="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
	          <button
	            type="button"
	            class="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50"
	            :disabled="bulkSaving"
	            @click="closeBulkUpdateModal"
	          >
	            {{ t('admin.common.cancel') }}
	          </button>
	          <button
	            type="button"
	            class="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50"
	            :disabled="bulkSaving"
	            @click="submitBulkUpdate"
	          >
	            {{ t('admin.common.save') }}
	          </button>
	        </div>
	      </div>
	    </div>
	  </div>
	</template>
 
<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { toTenantHost, useRequestOrigin } from '~/composables/host'

import BaseSelect from '~/components/ui/BaseSelect.vue'
import BaseInput from '~/components/ui/BaseInput.vue'
 
definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.products.index.title'
})
 
const authStore = useAuthStore()
const config = useRuntimeConfig()
const { format: formatCurrency } = useCurrency()
const { t } = useI18n({ useScope: 'global' })
 
interface Product {
  id: string
  title: string
  slug: string
  price: number
  stock: number
  isActive: boolean
  images?: string[]
  productImages?: Array<{ id: string; url: string; isMain: boolean; position: number }>
  category?: { id: string; title: string }
}
 
interface Category {
  id: string
  title: string
}
 
// State
const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const loading = ref(true)
const searchQuery = ref('')
const selectedCategory = ref('')
const selectedStatus = ref('')
const currentPage = ref(1)
const itemsPerPage = 10
const showDeleteModal = ref(false)
const productToDelete = ref<Product | null>(null)
const selectedIds = ref<string[]>([])

const showImportCsvModal = ref(false)
const importingCsv = ref(false)
const importCsvResult = ref<any | null>(null)
const importCsvInput = ref<HTMLInputElement | null>(null)

const showBulkUpdateModal = ref(false)
const bulkPrice = ref('')
const bulkStock = ref('')
const bulkIsActive = ref('')
const bulkCategoryId = ref('')
const bulkPropagatePriceToVariants = ref(true)
const bulkSaving = ref(false)
const bulkError = ref<string | null>(null)

// Helper to get main product image
const getProductMainImage = (product: Product): string | undefined => {
  // Check productImages array first (new structure)
  if (product.productImages && product.productImages.length > 0) {
    const mainImage = product.productImages.find(img => img.isMain)
    return mainImage ? mainImage.url : product.productImages[0].url
  }
  // Fallback to legacy images array
  if (product.images && product.images.length > 0) {
    return product.images[0]
  }
  return undefined
}
const sortBy = ref<'createdAt' | 'title' | 'price' | 'stock' | 'isActive'>('createdAt')
const sortOrder = ref<'asc' | 'desc'>('desc')

const sortOptions = [
  { key: 'createdAt', labelKey: 'admin.pages.products.index.sort.newest' },
  { key: 'title', labelKey: 'admin.pages.products.index.sort.title' },
  { key: 'price', labelKey: 'admin.pages.products.index.sort.price' },
  { key: 'stock', labelKey: 'admin.pages.products.index.sort.stock' },
  { key: 'isActive', labelKey: 'admin.pages.products.index.sort.status' }
] as const
 
// Computed
const filteredProducts = computed(() => {
  let filtered = products.value
 
  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(query) ||
      p.slug.toLowerCase().includes(query)
    )
  }
 
  // Category filter
  if (selectedCategory.value) {
    filtered = filtered.filter(p => p.category?.id === selectedCategory.value)
  }
 
  // Status filter
  if (selectedStatus.value) {
    filtered = filtered.filter(p => 
      selectedStatus.value === 'active' ? p.isActive : !p.isActive
    )
  }
 
  return filtered
})

const totalPages = computed(() => Math.ceil(filteredProducts.value.length / itemsPerPage))

const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredProducts.value.slice(start, end)
})

const allVisibleSelected = computed(() => {
  const visible = paginatedProducts.value.map(p => p.id)
  return visible.length > 0 && visible.every(id => selectedIds.value.includes(id))
})
 
// Methods
async function fetchProducts() {
  loading.value = true
  try {
    const data = await $fetch<Product[]>('/api/admin/products', {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      query: {
        sortBy: sortBy.value,
        sortOrder: sortOrder.value,
        categoryId: selectedCategory.value || undefined
      }
    })
    products.value = data
  } catch (error) {
    console.error('Failed to fetch products:', error)
  } finally {
    loading.value = false
  }
}
 
async function fetchCategories() {
  try {
    const data = await $fetch<Category[]>('/api/admin/categories', {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    categories.value = data
  } catch (error) {
    console.error('Failed to fetch categories:', error)
  }
}
 
function confirmDelete(product: Product) {
  productToDelete.value = product
  showDeleteModal.value = true
}
 
async function handleDelete() {
  if (!productToDelete.value) return
 
  try {
    await $fetch(`/api/admin/products/${productToDelete.value.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
 
    // Remove from local state
    products.value = products.value.filter(p => p.id !== productToDelete.value?.id)
    productToDelete.value = null
  } catch (error) {
    console.error('Failed to delete product:', error)
    alert(t('admin.pages.products.index.deleteModal.error'))
  }
}

function toggleSelectAllVisible() {
  const visible = paginatedProducts.value.map(p => p.id)
  if (visible.length === 0) return

  if (allVisibleSelected.value) {
    selectedIds.value = selectedIds.value.filter(id => !visible.includes(id))
  } else {
    const merged = new Set([...selectedIds.value, ...visible])
    selectedIds.value = Array.from(merged)
  }
}

async function exportProductsCsv() {
  try {
    const csv = await $fetch<string>('/api/admin/products/export.csv', {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      query: selectedIds.value.length ? { ids: selectedIds.value.join(',') } : undefined,
      responseType: 'text' as any
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Failed to export CSV:', error)
    alert(t('admin.pages.products.index.bulk.exportError'))
  }
}

function openImportModal() {
  importCsvResult.value = null
  showImportCsvModal.value = true
}

function closeImportModal() {
  showImportCsvModal.value = false
  importingCsv.value = false
  if (importCsvInput.value) importCsvInput.value.value = ''
}

async function onImportCsvFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  importingCsv.value = true
  importCsvResult.value = null
  try {
    const form = new FormData()
    form.append('file', file)

    const result = await $fetch('/api/admin/products/import.csv', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      body: form
    })

    importCsvResult.value = result
    await fetchProducts()
    await fetchCategories()
  } catch (error) {
    console.error('Failed to import CSV:', error)
    alert(t('admin.pages.products.index.bulk.importError'))
  } finally {
    importingCsv.value = false
  }
}

function openBulkUpdateModal() {
  bulkError.value = null
  bulkPrice.value = ''
  bulkStock.value = ''
  bulkIsActive.value = ''
  bulkCategoryId.value = ''
  bulkPropagatePriceToVariants.value = true
  showBulkUpdateModal.value = true
}

function closeBulkUpdateModal() {
  showBulkUpdateModal.value = false
  bulkSaving.value = false
  bulkError.value = null
}

async function submitBulkUpdate() {
  if (selectedIds.value.length === 0) return
  bulkSaving.value = true
  bulkError.value = null

  try {
    const data: any = {}
    if (bulkPrice.value.trim()) data.price = bulkPrice.value.trim()
    if (bulkStock.value !== '') data.stock = Number(bulkStock.value)
    if (bulkIsActive.value === 'true') data.isActive = true
    if (bulkIsActive.value === 'false') data.isActive = false
    if (bulkCategoryId.value === '__clear__') data.categoryId = null
    if (bulkCategoryId.value && bulkCategoryId.value !== '__clear__') data.categoryId = bulkCategoryId.value

    if (Object.keys(data).length === 0) {
      bulkError.value = t('admin.pages.products.index.bulk.noChanges')
      bulkSaving.value = false
      return
    }

    await $fetch('/api/admin/products/bulk', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      body: {
        ids: selectedIds.value,
        data,
        options: { propagatePriceToVariants: bulkPropagatePriceToVariants.value }
      }
    })

    showBulkUpdateModal.value = false
    await fetchProducts()
  } catch (error: any) {
    console.error('Bulk update failed:', error)
    bulkError.value = error?.data?.statusMessage || t('admin.pages.products.index.bulk.updateError')
  } finally {
    bulkSaving.value = false
  }
}

async function duplicateSelectedProduct() {
  if (selectedIds.value.length !== 1) return

  try {
    await $fetch(`/api/admin/products/${selectedIds.value[0]}/duplicate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      body: {}
    })

    await fetchProducts()
  } catch (error) {
    console.error('Duplicate failed:', error)
    alert(t('admin.pages.products.index.bulk.duplicateError'))
  }
}

// Use same logic as "View Store" button in admin layout
const tenantSlug = computed(() => authStore.user?.tenant?.slug as string | undefined)

function getProductUrl(slug: string): string {
    const tenantSlugValue = tenantSlug.value
    if (!tenantSlugValue) return '/'
    
    const { protocol, host } = useRequestOrigin()
    const tenantHost = toTenantHost(host, tenantSlugValue)
    return `${protocol}://${tenantHost}/p/${slug}`
}

function getLandingUrl(slug: string): string {
    const tenantSlugValue = tenantSlug.value
    if (!tenantSlugValue) return '/'
    
    const { protocol, host } = useRequestOrigin()
    const tenantHost = toTenantHost(host, tenantSlugValue)
    return `${protocol}://${tenantHost}/p/${slug}?mode=landing`
}

async function copyLink(path: string) {
    const tenantSlugValue = tenantSlug.value
    if (!tenantSlugValue) return
    
    const { protocol, host } = useRequestOrigin()
    const tenantHost = toTenantHost(host, tenantSlugValue)
    const url = `${protocol}://${tenantHost}${path}`
    
    try {
        await navigator.clipboard.writeText(url)
        // You could add a toast notification here if you have a toast system
        // alert('Link copied to clipboard')
    } catch (err) {
        console.error('Failed to copy link:', err)
    }
}
 
// Lifecycle
onMounted(() => {
  fetchProducts()
  fetchCategories()
})
 
// Watch for filter changes to reset pagination
watch([searchQuery, selectedCategory, selectedStatus], () => {
  currentPage.value = 1
})

watch([sortBy, sortOrder, selectedCategory], () => {
  fetchProducts()
  currentPage.value = 1
})

function setSort(field: typeof sortOptions[number]['key']) {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = field === 'createdAt' ? 'desc' : 'asc'
  }
}
</script>
