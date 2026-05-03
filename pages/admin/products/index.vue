<template>
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <AdminPageHeader
      :title="t('admin.nav.products')"
      :subtitle="t('admin.pages.products.index.subtitle')"
      :stats="productStats"
    >
      <Menu as="div" class="relative inline-block text-left">
        <MenuButton class="ui-btn ui-btn--secondary ui-btn--md">
          <Icon name="lucide:arrow-down-up" class="w-5 h-5" />
          <span>Import/Export</span>
          <Icon name="lucide:chevron-down" class="w-4 h-4 ml-1 -mr-1" style="color: var(--text-tertiary)" />
        </MenuButton>
        <transition
          enter-active-class="transition ease-out duration-100"
          enter-from-class="transform opacity-0 scale-95"
          enter-to-class="transform opacity-100 scale-100"
          leave-active-class="transition ease-in duration-75"
          leave-from-class="transform opacity-100 scale-100"
          leave-to-class="transform opacity-0 scale-95"
        >
          <MenuItems class="absolute right-0 z-10 mx-auto mt-2 w-48 origin-top-right rounded-md shadow-lg focus:outline-none" style="background: var(--surface-2); border: 1px solid var(--surface-border)">
            <div class="py-1">
              <MenuItem v-slot="{ active }">
                <button
                  :class="['group flex w-full items-center px-4 py-2 text-sm']"
                  :style="active ? 'background: var(--surface-3); color: var(--text-primary)' : 'color: var(--text-secondary)'"
                  :disabled="loading"
                  @click="openImportModal"
                >
                  <Icon name="lucide:download" class="mr-3 h-5 w-5" style="color: var(--text-tertiary)" aria-hidden="true" />
                  {{ t('admin.pages.products.index.bulk.import') }}
                </button>
              </MenuItem>
              <MenuItem v-slot="{ active }">
                <button
                  :class="['group flex w-full items-center px-4 py-2 text-sm']"
                  :style="active ? 'background: var(--surface-3); color: var(--text-primary)' : 'color: var(--text-secondary)'"
                  :disabled="loading"
                  @click="exportProductsCsv"
                >
                  <Icon name="lucide:upload" class="mr-3 h-5 w-5" style="color: var(--text-tertiary)" aria-hidden="true" />
                  {{ t('admin.pages.products.index.bulk.export') }}
                </button>
              </MenuItem>
            </div>
          </MenuItems>
        </transition>
      </Menu>

      <NuxtLink
        data-tour="products-create-btn"
        to="/admin/products/create"
        class="ui-btn ui-btn--primary ui-btn--md"
      >
        <Icon name="lucide:plus" class="w-5 h-5" />
        <span>{{ t('admin.pages.products.index.addProduct') }}</span>
      </NuxtLink>
    </AdminPageHeader>

    <!-- Tab filter -->
    <AdminTabFilter v-model="activeTab" :tabs="productTabs" />
 
    <!-- Filters -->
    <div data-tour="products-search" class="ui-card p-4 mb-6">
      <div class="flex flex-wrap items-end gap-4">
        <div class="flex-1 min-w-[200px]">
          <label class="ui-label mb-1">{{ t('admin.pages.products.index.filters.searchLabel') }}</label>
          <BaseInput
            v-model="searchQuery"
            :placeholder="t('admin.pages.products.index.filters.searchPlaceholder')"
          />
        </div>
        <div class="w-full sm:w-auto min-w-[200px]">
          <BaseSelect
            v-model="selectedCategory"
            :label="t('admin.pages.products.index.filters.category')"
          >
            <option value="">
              {{ t('admin.pages.products.index.filters.allCategories') }}
            </option>
            <option
              v-for="cat in orderedCategories"
              :key="cat.id"
              :value="cat.id"
            >
              {{ categoryOptionLabel(cat) }}
            </option>
          </BaseSelect>
        </div>
        <div class="w-full sm:w-auto min-w-[200px]">
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
            <option value="lowStock">
              {{ t('admin.pages.products.index.filters.lowStock') }}
            </option>
          </BaseSelect>
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
        {{ t('admin.pages.products.index.loading') }}
      </p>
    </div>
 
    <!-- Empty State -->
    <div
      v-else-if="filteredProducts.length === 0"
      class="ui-card p-12 text-center"
    >
      <Icon name="lucide:package" class="mx-auto h-12 w-12" style="color: var(--text-tertiary)" />
      <h3 class="mt-2 text-sm font-medium" style="color: var(--text-primary)">
        {{ t('admin.pages.products.index.empty.title') }}
      </h3>
      <p class="mt-1 text-sm" style="color: var(--text-tertiary)">
        {{ t('admin.pages.products.index.empty.hint') }}
      </p>
      <div class="mt-6">
        <NuxtLink
          to="/admin/products/create"
          class="ui-btn ui-btn--primary ui-btn--md"
        >
          <Icon name="lucide:plus" class="w-5 h-5 mr-2" />
          {{ t('admin.pages.products.index.empty.newProduct') }}
        </NuxtLink>
      </div>
    </div>
 
    <!-- Products Table -->
    <div
      v-else
      data-tour="products-table"
      class="ui-card overflow-hidden"
    >
      <div v-if="selectedIds.length > 0" class="ui-card-header flex flex-wrap items-center gap-3 justify-between" style="background: var(--surface-2)">
        <div class="text-sm font-medium" style="color: var(--text-secondary)">
          {{ t('admin.pages.products.index.bulk.selected', { count: selectedIds.length }) }}
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="ui-btn ui-btn--secondary ui-btn--sm"
            :disabled="loading || selectedIds.length === 0"
            @click="openBulkUpdateModal"
          >
            <Icon name="lucide:wand-2" class="w-4 h-4 mr-1" />
            <span>{{ t('admin.pages.products.index.bulk.update') }}</span>
          </button>

          <button
            type="button"
            class="ui-btn ui-btn--secondary ui-btn--sm"
            :disabled="loading || selectedIds.length !== 1"
            @click="duplicateSelectedProduct"
          >
            <Icon name="lucide:copy" class="w-4 h-4 mr-1" />
            <span>{{ t('admin.pages.products.index.bulk.duplicate') }}</span>
          </button>

          <button
            type="button"
            class="ui-btn ui-btn--danger ui-btn--sm"
            :disabled="loading || selectedIds.length === 0"
            @click="confirmBulkDelete"
          >
            <Icon name="lucide:trash" class="w-4 h-4 mr-1" />
            <span>{{ t('admin.pages.products.index.bulk.delete') || t('admin.common.delete') }}</span>
          </button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="ui-table">
	          <thead class="ui-thead">
	            <tr>
	              <th class="ui-th w-10">
	                <input
	                  type="checkbox"
	                  class="admin-checkbox"
                 
	                  :checked="allVisibleSelected"
	                  :disabled="paginatedProducts.length === 0"
	                  @change="toggleSelectAllVisible"
	                >
	              </th>
	              <th class="ui-th cursor-pointer transition-colors" @click="setSort('title')">
	                <div class="flex items-center gap-1">
	                  {{ t('admin.pages.products.index.table.product') }}
	                  <Icon v-if="sortBy === 'title'" :name="sortOrder === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'" class="w-3 h-3 [color:var(--brand)]" />
	                </div>
	              </th>
              <th class="ui-th">
                {{ t('admin.pages.products.index.table.category') }}
              </th>
              <th class="ui-th cursor-pointer transition-colors" @click="setSort('price')">
                <div class="flex items-center gap-1">
                  {{ t('admin.pages.products.index.table.price') }}
                  <Icon v-if="sortBy === 'price'" :name="sortOrder === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'" class="w-3 h-3 [color:var(--brand)]" />
                </div>
              </th>
              <th class="ui-th cursor-pointer transition-colors" @click="setSort('stock')">
                <div class="flex items-center gap-1">
                  {{ t('admin.pages.products.index.table.stock') }}
                  <Icon v-if="sortBy === 'stock'" :name="sortOrder === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'" class="w-3 h-3 [color:var(--brand)]" />
                </div>
              </th>
              <th class="ui-th cursor-pointer transition-colors" @click="setSort('isActive')">
                <div class="flex items-center gap-1">
                  {{ t('admin.pages.products.index.table.status') }}
                  <Icon v-if="sortBy === 'isActive'" :name="sortOrder === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'" class="w-3 h-3 [color:var(--brand)]" />
                </div>
              </th>
              <th class="ui-th text-center">
                {{ t('admin.pages.products.index.table.links') }}
              </th>
              <th class="ui-th text-right">
                {{ t('admin.pages.products.index.table.actions') }}
              </th>
            </tr>
          </thead>
          <tbody class="ui-tbody">
	            <tr
	              v-for="product in paginatedProducts"
	              :key="product.id"
	              class="ui-tr"
	            >
	              <td class="ui-td whitespace-nowrap">
	                <input
	                  v-model="selectedIds"
	                  type="checkbox"
	                  class="admin-checkbox"
                 
	                  :value="product.id"
	                >
	              </td>
	              <td class="ui-td whitespace-nowrap">
	                <div class="flex items-center">
	                  <div class="flex-shrink-0 h-10 w-10 rounded-md flex items-center justify-center overflow-hidden" style="background: var(--surface-2); border: 1px solid var(--surface-border)">
                    <img 
                      v-if="getProductMainImage(product)" 
                      :src="getProductMainImage(product)" 
                      :alt="product.title" 
                      class="h-10 w-10 object-cover" 
                    >
                    <Icon
                      v-else
                      name="lucide:image"
                      class="w-5 h-5" style="color: var(--text-tertiary)"
                    />
                  </div>
                  <div class="ml-4">
                    <div class="font-medium" style="color: var(--text-primary)">
                      {{ product.title }}
                    </div>
                    <div class="text-sm" style="color: var(--text-tertiary)">
                      {{ product.slug }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="ui-td whitespace-nowrap">
                <div
                  v-if="(product.categories && product.categories.length > 0) || product.category"
                  class="flex flex-wrap gap-1"
                >
                  <span
                    v-for="cat in (product.categories && product.categories.length > 0 ? product.categories : (product.category ? [product.category] : []))"
                    :key="cat.id"
                    class="ui-badge ui-badge--emerald"
                  >
                    {{ categoryBadgeLabel(cat) }}
                  </span>
                </div>
                <span
                  v-else
                  class="text-sm" style="color: var(--text-tertiary)"
                >{{ t('admin.pages.products.index.table.uncategorized') }}</span>
              </td>
              <td class="ui-td whitespace-nowrap">
                <template v-if="buildProductPricing(product).promotionApplied">
                  <div class="flex items-center gap-1.5">
                    <span class="font-medium" style="color: var(--brand)">{{ formatCurrency(buildProductPricing(product).effectivePrice) }}</span>
                    <span class="text-xs line-through" style="color: var(--text-tertiary)">{{ formatCurrency(buildProductPricing(product).originalPrice) }}</span>
                  </div>
                  <div v-if="product.promotionEndDate" class="text-xs mt-0.5" style="color: var(--text-tertiary)">
                    exp. {{ new Date(product.promotionEndDate).toLocaleDateString() }}
                  </div>
                </template>
                <span v-else style="color: var(--text-primary)">{{ formatCurrency(buildProductPricing(product).effectivePrice) }}</span>
              </td>
              <td class="ui-td whitespace-nowrap">
                <!-- Out of stock -->
                <span
                  v-if="product.stock === 0"
                  class="ui-badge ui-badge--red"
                >
                  {{ t('admin.pages.products.index.table.outOfStock') }}
                </span>
                <!-- Low stock -->
                <span
                  v-else-if="product.stock <= (product.lowStockThreshold ?? 5)"
                  class="ui-badge ui-badge--amber inline-flex items-center gap-1"
                >
                  <Icon name="lucide:triangle-alert" class="w-3 h-3" />
                  {{ product.stock }} en stock
                </span>
                <!-- Normal stock -->
                <span v-else style="color: var(--text-secondary)">{{ product.stock }} en stock</span>
              </td>
              <td class="ui-td whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <BaseToggle
                    :model-value="product.isActive"
                    :disabled="loading || !!statusUpdating[product.id]"
                    :sr-label="`${t('admin.forms.product.isActive.label')} ${product.title}`"
                    @update:model-value="(nextValue) => toggleProductStatus(product, nextValue)"
                  />
                  <span class="text-xs" style="color: var(--text-secondary)">
                    {{ product.isActive ? t('admin.common.active') : t('admin.common.inactive') }}
                  </span>
                </div>
              </td>
              <td class="ui-td whitespace-nowrap text-center">
                <Menu as="div" class="relative inline-block text-left text-sm">
                  <MenuButton class="p-1.5 hover:[color:var(--brand)] hover:[background:rgba(var(--brand-rgb)/0.08)] rounded-md transition-colors" style="color: var(--text-tertiary)">
                    <Icon name="lucide:globe" class="w-5 h-5" />
                  </MenuButton>
                  <transition
                    enter-active-class="transition ease-out duration-100"
                    enter-from-class="transform opacity-0 scale-95"
                    enter-to-class="transform opacity-100 scale-100"
                    leave-active-class="transition ease-in duration-75"
                    leave-from-class="transform opacity-100 scale-100"
                    leave-to-class="transform opacity-0 scale-95"
                  >
                    <MenuItems class="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md shadow-lg focus:outline-none" style="background: var(--surface-2); border: 1px solid var(--surface-border)">
                      <div class="py-1">
                        <!-- Product Links -->
                        <div class="flex items-center px-1">
                          <MenuItem v-slot="{ active }" class="flex-1">
                            <a
                              :href="getProductUrl(product.slug)"
                              target="_blank"
                              :class="['group flex items-center px-3 py-2 text-sm rounded-md transition-colors']"
                              :style="active ? 'background: var(--surface-3); color: var(--text-primary)' : 'color: var(--text-secondary)'"
                            >
                              <Icon name="lucide:external-link" class="mr-3 h-4 w-4" style="color: var(--text-tertiary)" />
                              {{ t('admin.pages.products.index.links.openProduct') }}
                            </a>
                          </MenuItem>
                          <MenuItem v-slot="{ active }">
                            <button
                              @click="copyLink(`/product/${product.slug}`)"
                              :class="['p-2 rounded-md hover:[color:var(--brand)] transition-colors']"
                              :style="active ? 'background: var(--surface-3); color: var(--text-primary)' : 'color: var(--text-secondary)'"
                              :title="t('admin.pages.products.index.links.copyProduct')"
                            >
                              <Icon name="lucide:copy" class="h-4 w-4" />
                            </button>
                          </MenuItem>
                        </div>

                        <div class="my-1" style="border-top: 1px solid var(--surface-border)"></div>

                        <!-- Landing Links -->
                        <div class="flex items-center px-1">
                          <MenuItem v-slot="{ active }" class="flex-1">
                            <a
                              :href="getLandingUrl(product.slug)"
                              target="_blank"
                              :class="['group flex items-center px-3 py-2 text-sm rounded-md transition-colors']"
                              :style="active ? 'background: var(--surface-3); color: var(--text-primary)' : 'color: var(--text-secondary)'"
                            >
                              <Icon name="lucide:external-link" class="mr-3 h-4 w-4" style="color: var(--text-tertiary)" />
                              {{ t('admin.pages.products.index.links.openLanding') }}
                            </a>
                          </MenuItem>
                          <MenuItem v-slot="{ active }">
                            <button
                              @click="copyLink(`/product/${product.slug}?mode=landing`)"
                              :class="['p-2 rounded-md hover:[color:var(--brand)] transition-colors']"
                              :style="active ? 'background: var(--surface-3); color: var(--text-primary)' : 'color: var(--text-secondary)'"
                              :title="t('admin.pages.products.index.links.copyLanding')"
                            >
                              <Icon name="lucide:copy" class="h-4 w-4" />
                            </button>
                          </MenuItem>
                        </div>
                      </div>
                    </MenuItems>
                  </transition>
                </Menu>
              </td>
              <td class="ui-td whitespace-nowrap text-right">
                <div class="flex items-center justify-end space-x-1">
                  <NuxtLink
                    :to="`/admin/products/${product.id}`"
                    class="p-2 hover:[color:var(--brand)] hover:[background:rgba(var(--brand-rgb)/0.08)] rounded-md transition-colors" style="color: var(--text-tertiary)"
                    :title="t('admin.common.edit')"
                  >
                    <Icon name="lucide:pencil" class="w-4 h-4" />
                  </NuxtLink>
                  <button
                    class="p-2 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" style="color: var(--text-tertiary)"
                    :title="t('admin.common.delete')"
                    @click="confirmDelete(product)"
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
      <div class="px-4 py-3 flex items-center justify-between sm:px-6" style="border-top: 1px solid var(--surface-border)">
        <div class="flex flex-1 items-center justify-between sm:hidden">
          <button
            :disabled="currentPage === 1"
            class="ui-btn ui-btn--secondary ui-btn--sm"
            @click="currentPage--"
          >
            <Icon name="lucide:chevron-left" class="w-4 h-4" />
          </button>
          <span class="text-sm" style="color: var(--text-secondary)">
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
            <p class="text-sm" style="color: var(--text-secondary)">
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
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium disabled:opacity-50"
                style="border-color: var(--surface-border); background: var(--surface-2); color: var(--text-tertiary)"
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
                    : ''
                ]"
                :style="currentPage !== page ? 'border-color: var(--surface-border); background: var(--surface-2); color: var(--text-tertiary)' : ''"
                @click="currentPage = page"
              >
                {{ page }}
              </button>
              <button
                :disabled="currentPage === totalPages"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium disabled:opacity-50"
                style="border-color: var(--surface-border); background: var(--surface-2); color: var(--text-tertiary)"
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
	      :title="productToDelete?.id === 'bulk' ? t('admin.pages.products.index.bulk.deleteTitle') : t('admin.pages.products.index.deleteModal.title')"
	      :message="productToDelete?.id === 'bulk' ? t('admin.pages.products.index.bulk.deleteMessage', { count: selectedIds.length }) : t('admin.pages.products.index.deleteModal.message', { title: productToDelete?.title || '' })"
	      :confirm-text="t('admin.common.delete')"
	      :cancel-text="t('admin.common.cancel')"
	      :error="deleteError"
	      @confirm="productToDelete?.id === 'bulk' ? submitBulkDelete() : handleDelete()"
	      @update:model-value="val => { if (!val) deleteError = null }"
	    />

	    <!-- Import CSV modal -->
	    <Teleport to="body">
	    <div
	      v-if="showImportCsvModal"
	      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
	    >
	      <div class="w-full max-w-lg rounded-lg shadow-xl flex flex-col max-h-[90vh]" style="background: var(--surface-1)">
	        <div class="flex items-start justify-between gap-4 px-6 py-4 shrink-0" style="border-bottom: 1px solid var(--surface-border)">
	          <div class="min-w-0">
	            <h3 class="truncate text-lg font-semibold" style="color: var(--text-primary)">
	              {{ t('admin.pages.products.index.bulk.importTitle') }}
	            </h3>
	            <p class="mt-1 text-sm" style="color: var(--text-secondary)">
	              {{ t('admin.pages.products.index.bulk.importHint') }}
	            </p>
	          </div>
	          <button
	            type="button"
	            class="rounded-md p-2" style="color: var(--text-tertiary)"
	            @click="closeImportModal"
	          >
	            <Icon name="lucide:x" class="h-5 w-5" />
	          </button>
	        </div>
	        <div class="px-6 py-5 space-y-4 overflow-y-auto">
	          <input
	            ref="importCsvInput"
	            type="file"
	            accept=".csv,text/csv"
	            class="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:[background:rgba(var(--brand-rgb)/0.08)] file:px-4 file:py-2 file:text-sm file:font-semibold file:[color:var(--brand)] hover:file:[background:rgba(var(--brand-rgb)/0.12)]" style="color: var(--text-secondary)"
	            :disabled="importingCsv"
	            @change="onImportCsvFileChange"
	          >

	          <div class="rounded-md p-4" style="border: 1px solid var(--surface-border); background: var(--surface-1)">
	            <div class="flex items-start justify-between gap-3">
	              <div class="min-w-0">
	                <div class="text-sm font-semibold" style="color: var(--text-primary)">
	                  {{ t('admin.pages.products.index.bulk.importTemplateTitle') }}
	                </div>
	                <div class="mt-1 text-xs" style="color: var(--text-secondary)">
	                  {{ t('admin.pages.products.index.bulk.importTemplateHint') }}
	                </div>
	              </div>
	              <button
	                type="button"
	                class="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium" style="border: 1px solid var(--surface-border); background: var(--surface-2); color: var(--text-secondary)"
	                @click="downloadProductsImportTemplate"
	              >
	                {{ t('admin.pages.products.index.bulk.importTemplateDownload') }}
	              </button>
	            </div>

	            <pre class="mt-3 overflow-auto rounded-md p-3 text-xs" style="background: var(--surface-2); color: var(--text-primary)"><code>{{ productsImportTemplateCsv }}</code></pre>
	          </div>

	          <div
	            v-if="importCsvResult"
	            class="rounded-md p-3 text-sm" style="border: 1px solid var(--surface-border); background: var(--surface-2); color: var(--text-secondary)"
	          >
	            <div>{{ t('admin.pages.products.index.bulk.importResult', importCsvResult) }}</div>
	            <div v-if="importCsvResult.warnings?.length" class="mt-3">
	              <details class="rounded-md border border-amber-200 bg-amber-50 p-3">
	                <summary class="cursor-pointer text-xs font-semibold text-amber-900">
	                  Warnings ({{ importCsvResult.warnings.length }})
	                </summary>
	                <ul class="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-900">
	                  <li v-for="(w, idx) in importCsvResult.warnings.slice(0, 20)" :key="idx">
	                    Row {{ w.row }}: {{ w.message }}
	                  </li>
	                  <li v-if="importCsvResult.warnings.length > 20" class="list-none text-amber-800">
	                    …and {{ importCsvResult.warnings.length - 20 }} more
	                  </li>
	                </ul>
	              </details>
	            </div>

	            <div v-if="importCsvResult.errors?.length" class="mt-3">
	              <details open class="rounded-md border border-red-200 bg-red-50 p-3">
	                <summary class="cursor-pointer text-xs font-semibold text-red-900">
	                  Errors ({{ importCsvResult.errors.length }})
	                </summary>
	                <div class="mt-1 text-xs text-red-800">
	                  {{ t('admin.pages.products.index.bulk.importErrors', { count: importCsvResult.errors.length }) }}
	                </div>
	                <ul class="mt-2 list-disc space-y-1 pl-5 text-xs text-red-900">
	                  <li v-for="(e, idx) in importCsvResult.errors.slice(0, 50)" :key="idx">
	                    Row {{ e.row }}: {{ e.message }}
	                  </li>
	                  <li v-if="importCsvResult.errors.length > 50" class="list-none text-red-800">
	                    …and {{ importCsvResult.errors.length - 50 }} more
	                  </li>
	                </ul>
	              </details>
	            </div>
	          </div>
	        </div>
	        <div class="flex justify-end gap-2 px-6 py-4" style="border-top: 1px solid var(--surface-border)">
	          <button
	            type="button"
	            class="px-4 py-2 rounded-md" style="border: 1px solid var(--surface-border); background: var(--surface-2); color: var(--text-secondary)"
	            @click="closeImportModal"
	          >
	            {{ t('admin.common.close') }}
	          </button>
	        </div>
	      </div>
	    </div>
	    </Teleport>

	    <!-- Bulk update modal -->
	    <Teleport to="body">
	    <div
	      v-if="showBulkUpdateModal"
	      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
	    >
	      <div class="w-full max-w-lg rounded-lg shadow-xl flex flex-col max-h-[90vh]" style="background: var(--surface-1)">
	        <div class="flex items-start justify-between gap-4 px-6 py-4 shrink-0" style="border-bottom: 1px solid var(--surface-border)">
	          <div class="min-w-0">
	            <h3 class="truncate text-lg font-semibold" style="color: var(--text-primary)">
	              {{ t('admin.pages.products.index.bulk.updateTitle') }}
	            </h3>
	            <p class="mt-1 text-sm" style="color: var(--text-secondary)">
	              {{ t('admin.pages.products.index.bulk.updateHint') }}
	            </p>
	          </div>
	          <button
	            type="button"
	            class="rounded-md p-2" style="color: var(--text-tertiary)"
	            @click="closeBulkUpdateModal"
	          >
	            <Icon name="lucide:x" class="h-5 w-5" />
	          </button>
	        </div>


	        <div class="px-6 py-5 space-y-4 overflow-y-auto">
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
		            disabled
		            hint="Stock is system-managed (set only at creation)."
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
	                v-for="cat in orderedCategories"
	                :key="cat.id"
	                :value="cat.id"
	              >
	                {{ categoryOptionLabel(cat) }}
	              </option>
	          </BaseSelect>

	          <label class="flex items-center gap-2 text-sm" style="color: var(--text-secondary)">
	            <input
	              v-model="bulkPropagatePriceToVariants"
	              type="checkbox"
	              class="admin-checkbox"
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

	        <div class="flex justify-end gap-2 px-6 py-4" style="border-top: 1px solid var(--surface-border)">
	          <button
	            type="button"
	            class="px-4 py-2 rounded-md" style="border: 1px solid var(--surface-border); background: var(--surface-2); color: var(--text-secondary)"
	            :disabled="bulkSaving"
	            @click="closeBulkUpdateModal"
	          >
	            {{ t('admin.common.cancel') }}
	          </button>
	          <button
	            type="button"
	            class="px-4 py-2 [background:var(--brand)] text-white rounded-md hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] disabled:opacity-50"
	            :disabled="bulkSaving"
	            @click="submitBulkUpdate"
	          >
	            {{ t('admin.common.save') }}
	          </button>
	        </div>
	      </div>
	    </div>
	    </Teleport>
	  </div>
	</template>
 
<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { toTenantHost, useRequestOrigin } from '~/composables/host'
import { usePlatformBaseDomain } from '~/composables/platformBaseDomain'

import BaseSelect from '~/components/ui/BaseSelect.vue'
import BaseInput from '~/components/ui/BaseInput.vue'
import BaseToggle from '~/components/ui/BaseToggle.vue'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { useToast } from '~/composables/useToast'
import { buildProductPricing } from '~/shared/pricing/product-pricing'
 
definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.products.index.title'
})
 
const authStore = useAuthStore()
const { format: formatCurrency } = useCurrency()
const { showToast } = useToast()
const { t } = useI18n({ useScope: 'global' })
 
interface Product {
  id: string
  title: string
  slug: string
  price: number
  promotionalPrice?: number | string | null
  isPromotionActive?: boolean
  promotionStartDate?: string | Date | null
  promotionEndDate?: string | Date | null
  stock: number
  lowStockThreshold: number
  isActive: boolean
  images?: string[]
  productImages?: Array<{ id: string; url: string; isMain: boolean; position: number }>
  category?: { id: string; title: string }
  categories?: Array<{ id: string; title: string; slug?: string }>
  categoryIds?: string[]
}
 
interface Category {
  id: string
  title: string
  displayTitle?: string
  parentId?: string | null
  parent?: { id: string; title: string } | null
}
type CategoryOption = Category & { depth: number }
 
// State
const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const loading = ref(true)
const searchQuery = ref('')
const selectedCategory = ref('')
const selectedStatus = ref('')
const activeTab = ref('all')
const currentPage = ref(1)
const itemsPerPage = 25
const showDeleteModal = ref(false)
const productToDelete = ref<Product | null>(null)
const deleteError = ref<string | null>(null)
const selectedIds = ref<string[]>([])
const statusUpdating = reactive<Record<string, boolean>>({})

const showImportCsvModal = ref(false)
const importingCsv = ref(false)
const importCsvResult = ref<any | null>(null)
const importCsvInput = ref<HTMLInputElement | null>(null)

const productsImportTemplateHeader =
  'id,slug,title,price,stock,isActive,categoryId,categorySlug,categoryIds,categorySlugs,description,miniDescription,images'
const productsImportTemplateExample =
  ',my-product,My product,1990,10,true,,,,,,,"image1.jpg|https://example.com/image2.jpg"'
const productsImportTemplateCsv = `${productsImportTemplateHeader}\n${productsImportTemplateExample}\n`

const showBulkUpdateModal = ref(false)
const bulkPrice = ref('')
const bulkStock = ref('')
const bulkIsActive = ref('')
const bulkCategoryId = ref('')
const bulkPropagatePriceToVariants = ref(true)
const bulkSaving = ref(false)
const bulkError = ref<string | null>(null)

const orderedCategories = computed<CategoryOption[]>(() => {
  const byParent = new Map<string | null, Category[]>()
  for (const category of categories.value) {
    const key = category.parentId ?? null
    const group = byParent.get(key) ?? []
    group.push(category)
    byParent.set(key, group)
  }
  for (const group of byParent.values()) {
    group.sort((a, b) => a.title.localeCompare(b.title))
  }

  const ordered: CategoryOption[] = []
  const seen = new Set<string>()
  const visit = (node: Category, depth = 0) => {
    if (seen.has(node.id)) return
    seen.add(node.id)
    ordered.push({ ...node, depth })
    for (const child of byParent.get(node.id) || []) {
      visit(child, depth + 1)
    }
  }

  for (const root of byParent.get(null) || []) {
    visit(root, 0)
  }
  for (const category of categories.value) {
    if (!seen.has(category.id)) visit(category, 0)
  }

  return ordered
})

const categoriesById = computed(() => new Map(categories.value.map((category) => [category.id, category])))
const categoryOptionLabel = (category: CategoryOption) => `${'-> '.repeat(category.depth)}${category.title}`
const categoryBadgeLabel = (category: { id: string; title: string }) => {
  const resolved = categoriesById.value.get(category.id)
  if (resolved?.parentId) return `-> ${resolved.title}`
  return resolved?.title || category.title
}

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

const effectivePriceFor = (product: Product) => buildProductPricing(product).effectivePrice
 
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
    filtered = filtered.filter((p) => {
      const ids = Array.from(
        new Set([
          ...(Array.isArray(p.categoryIds) ? p.categoryIds : []),
          p.category?.id
        ].filter((id): id is string => typeof id === 'string' && id.length > 0))
      )
      return ids.includes(selectedCategory.value)
    })
  }
 
  // Tab filter
  if (activeTab.value === 'active') {
    filtered = filtered.filter(p => p.isActive)
  } else if (activeTab.value === 'draft') {
    filtered = filtered.filter(p => !p.isActive)
  } else if (activeTab.value === 'lowStock') {
    filtered = filtered.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold ?? 5))
  } else if (activeTab.value === 'outOfStock') {
    filtered = filtered.filter(p => p.stock === 0)
  }

  // Status filter
  if (selectedStatus.value) {
    if (selectedStatus.value === 'lowStock') {
      filtered = filtered.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold ?? 5))
    } else {
      filtered = filtered.filter(p =>
        selectedStatus.value === 'active' ? p.isActive : !p.isActive
      )
    }
  }

  if (sortBy.value === 'price') {
    filtered = [...filtered].sort((a, b) => {
      const left = effectivePriceFor(a)
      const right = effectivePriceFor(b)
      return sortOrder.value === 'asc' ? left - right : right - left
    })
  }
 
  return filtered
})

const productStats = computed(() => [
  { label: 'total', value: products.value.length },
  { label: 'active', value: products.value.filter(p => p.isActive).length, tone: 'green' as const },
  { label: 'low stock', value: products.value.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold ?? 5)).length, tone: 'amber' as const },
  { label: 'out of stock', value: products.value.filter(p => p.stock === 0).length, tone: 'red' as const },
])

const productTabs = computed(() => [
  { key: 'all', label: 'All', count: products.value.length },
  { key: 'active', label: 'Active', count: products.value.filter(p => p.isActive).length },
  { key: 'draft', label: 'Draft', count: products.value.filter(p => !p.isActive).length },
  { key: 'lowStock', label: 'Low Stock', count: products.value.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold ?? 5)).length },
  { key: 'outOfStock', label: 'Out of Stock', count: products.value.filter(p => p.stock === 0).length },
])

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

async function toggleProductStatus(product: Product, nextValue: boolean) {
  if (product.isActive === nextValue) return

  const previousValue = product.isActive
  product.isActive = nextValue
  statusUpdating[product.id] = true

  try {
    await $fetch(`/api/admin/products/${product.id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      body: {
        isActive: nextValue
      }
    })
  } catch (error: any) {
    product.isActive = previousValue
    console.error('Failed to update product status:', error)
    showToast(error?.data?.statusMessage || t('admin.pages.products.index.bulk.updateError'), 'error')
  } finally {
    delete statusUpdating[product.id]
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
    showDeleteModal.value = false
    deleteError.value = null
  } catch (error: any) {
    console.error('Failed to delete product:', error)
    const status = error?.response?.status || error?.statusCode
    const msg = error?.data?.statusMessage || error?.response?.data?.statusMessage
    if (status === 409 || msg === 'HAS_TRANSACTIONS') {
      deleteError.value = t('admin.pages.products.index.deleteModal.errorHasTransactions')
    } else {
      deleteError.value = t('admin.pages.products.index.deleteModal.error')
    }
  }
}

function confirmBulkDelete() {
  if (selectedIds.value.length === 0) return
  // We can reuse the same modal, just change the state
  productToDelete.value = {
    id: 'bulk',
    title: t('admin.pages.products.index.bulk.selected', { count: selectedIds.value.length })
  } as unknown as Product
  showDeleteModal.value = true
}

async function submitBulkDelete() {
  if (selectedIds.value.length === 0) return
  try {
    await $fetch('/api/admin/products/bulk', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      body: {
        ids: selectedIds.value
      }
    })

    await fetchProducts()
    selectedIds.value = []
    showDeleteModal.value = false
    productToDelete.value = null
    deleteError.value = null
  } catch (error: any) {
    console.error('Failed to bulk delete products:', error)
    deleteError.value = error?.data?.statusMessage || t('admin.pages.products.index.deleteModal.error')
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

function downloadProductsImportTemplate() {
  const blob = new Blob([productsImportTemplateCsv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'products-import-template.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
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
    const msg =
      (error as any)?.data?.statusMessage ||
      (error as any)?.data?.message ||
      (error as any)?.message ||
      t('admin.pages.products.index.bulk.importError')
    showToast(String(msg), 'error')
    importCsvResult.value = {
      created: 0,
      updated: 0,
      skipped: 0,
      warnings: [],
      errors: [{ row: 1, message: String(msg) }]
    }
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
    const platformBaseDomain = usePlatformBaseDomain()
    const tenantHost = toTenantHost(host, tenantSlugValue, { platformBaseDomain })
    return `${protocol}://${tenantHost}/product/${slug}`
}

function getLandingUrl(slug: string): string {
    const tenantSlugValue = tenantSlug.value
    if (!tenantSlugValue) return '/'
    
    const { protocol, host } = useRequestOrigin()
    const platformBaseDomain = usePlatformBaseDomain()
    const tenantHost = toTenantHost(host, tenantSlugValue, { platformBaseDomain })
    return `${protocol}://${tenantHost}/product/${slug}?mode=landing`
}

async function copyLink(path: string) {
    const tenantSlugValue = tenantSlug.value
    if (!tenantSlugValue) return
    
    const { protocol, host } = useRequestOrigin()
    const platformBaseDomain = usePlatformBaseDomain()
    const tenantHost = toTenantHost(host, tenantSlugValue, { platformBaseDomain })
    const url = `${protocol}://${tenantHost}${path}`
    
    try {
        await navigator.clipboard.writeText(url)
        showToast(t('admin.common.copied'), 'success')
    } catch (err) {
        console.error('Failed to copy link:', err)
    }
}
 
// Lifecycle
const { autoStartIfNeeded } = useTour()
onMounted(() => {
  fetchProducts()
  fetchCategories()
  autoStartIfNeeded('products')
})
 
// Watch for filter changes to reset pagination
watch([searchQuery, selectedCategory, selectedStatus, activeTab], () => {
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
