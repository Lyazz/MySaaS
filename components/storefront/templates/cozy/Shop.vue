<script setup lang="ts">
import ProductCard from './ProductCard.vue'
import { normalizeSearchText } from '~/shared/text/normalize-search'

const props = defineProps<{
  products: any[]
}>()

const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: categoryData } = await useFetch<any[]>(categoriesUrl, {
  headers: useTenantApiHeaders(),
  lazy: true
})

const { format: formatCurrency } = useCurrency()
const storefrontContent = useStorefrontContent()

const categoryDisplayTitle = (category: any): string => {
  if (!category) return ''
  return category.parentId ? '— ' + category.title : category.title
}

const filters = computed(() => ({ categories: categoryData.value || [] }))

const selectedCategories = ref<string[]>([])
const route = useRoute()
const searchQuery = ref((route.query.q as string) || '')
watch(() => route.query.q, (newQ) => {
  if (newQ !== undefined) searchQuery.value = newQ as string
})
const sortOption = ref<'relevance' | 'priceAsc' | 'priceDesc'>('relevance')
const viewMode = ref<'grid' | 'list'>('grid')

const priceRange = computed(() => {
  const prices = props.products
    .map((product) => Number(product?.price))
    .filter((price): price is number => Number.isFinite(price))
  if (prices.length === 0) return { min: 0, max: 0 }
  return { min: Math.min(...prices), max: Math.max(...prices) }
})
const minPriceInput = ref<number | null>(null)
const maxPriceInput = ref<number | null>(null)

const isQuickViewOpen = ref(false)
const quickViewProduct = ref<any>(null)

/* One panel serves every breakpoint — there is no permanent sidebar. */
const isFilterPanelOpen = ref(false)

const activeFilterCount = computed(() => {
  let n = selectedCategories.value.length
  if (minPriceInput.value != null) n++
  if (maxPriceInput.value != null) n++
  return n
})

const filteredProducts = computed(() => {
  let result = [...props.products]

  if (selectedCategories.value.length > 0) {
    const selectedIds = selectedCategories.value
    result = result.filter(p => selectedIds.some((id) => [...((Array.isArray(p.categoryIds) ? p.categoryIds : [])), p.categoryId].filter(Boolean).includes(id)))
  }

  if (searchQuery.value) {
    const q = normalizeSearchText(searchQuery.value)
    result = result.filter(p => normalizeSearchText(p.title).includes(q) || (p.searchKeywords && normalizeSearchText(p.searchKeywords).includes(q)))
  }

  result = result.filter(p => {
    const price = Number(p.price)
    const minMatches = minPriceInput.value == null ? true : price >= Number(minPriceInput.value)
    const maxMatches = maxPriceInput.value == null ? true : price <= Number(maxPriceInput.value)
    return minMatches && maxMatches
  })

  if (sortOption.value === 'priceAsc') result.sort((a, b) => Number(a.price) - Number(b.price))
  else if (sortOption.value === 'priceDesc') result.sort((a, b) => Number(b.price) - Number(a.price))

  return result
})

const {
  currentPage,
  totalPages,
  pageNumbers,
  paginatedProducts,
  canGoPrev,
  canGoNext,
  goToPage,
  goToPrevPage,
  goToNextPage
} = useProductPagination(filteredProducts, 12)

/* Every third cell opens a row wide, so the grid never reads as a catalogue. */
const isWideCell = (index: number) => index % 3 === 0

const toggleCategory = (catId: string) => {
  const idx = selectedCategories.value.indexOf(catId)
  if (idx === -1) selectedCategories.value.push(catId)
  else selectedCategories.value.splice(idx, 1)
}
const removeCategory = (catId: string) => {
  const idx = selectedCategories.value.indexOf(catId)
  if (idx !== -1) selectedCategories.value.splice(idx, 1)
}
const resetFilters = () => {
  selectedCategories.value = []
  searchQuery.value = ''
  sortOption.value = 'relevance'
  minPriceInput.value = null
  maxPriceInput.value = null
}

const openQuickView = (product: any) => {
  quickViewProduct.value = product
  isQuickViewOpen.value = true
}
const closeQuickView = () => {
  isQuickViewOpen.value = false
  quickViewProduct.value = null
}
</script>

<template>
  <div class="ed-theme">
    <div class="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 py-10 md:py-14">
      <!-- Masthead -->
      <div class="border-b border-[#262019] pb-6 mb-8">
        <p class="ed-kicker mb-3">{{ storefrontContent.common.collection }}</p>
        <div class="flex items-end justify-between gap-6 flex-wrap">
          <h1 class="ed-display text-4xl md:text-6xl text-[#262019]">{{ storefrontContent.shop.catalogTitle }}</h1>
          <span class="ed-ui text-[13px] text-[#8A7E6E] tabular-nums">
            {{ storefrontContent.category.showingResults(filteredProducts.length) }}
          </span>
        </div>
      </div>

      <!-- Rayons: the departments run across the page, not down a sidebar -->
      <div v-if="filters.categories.length" class="flex flex-wrap items-center gap-x-7 gap-y-2 mb-7">
        <button
          class="ed-ui text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors"
          :class="selectedCategories.length === 0 ? 'text-[#B8532E]' : 'text-[#8A7E6E] hover:text-[#262019]'"
          @click="selectedCategories = []"
        >{{ storefrontContent.shop.allProducts }}</button>
        <button
          v-for="(cat, index) in filters.categories"
          :key="cat.id"
          class="ed-ui text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors flex items-baseline gap-2"
          :class="selectedCategories.includes(cat.id) ? 'text-[#B8532E]' : 'text-[#8A7E6E] hover:text-[#262019]'"
          @click="toggleCategory(cat.id)"
        >
          <span class="tabular-nums opacity-50">{{ String(index + 1).padStart(2, '0') }}</span>
          {{ categoryDisplayTitle(cat) }}
        </button>
      </div>

      <!-- Toolbar -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 pb-4 border-b border-[#DAD2C4]">
        <div class="relative flex-1">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="storefrontContent.shop.searchWithinResultsPlaceholder"
            class="w-full bg-transparent border-0 border-b border-transparent ed-ui text-sm text-[#262019] placeholder:text-[#8A7E6E] focus:ring-0 focus:border-[#B8532E] ps-0 pe-8 py-2 transition-colors"
          >
          <Icon name="lucide:search" class="w-4 h-4 text-[#8A7E6E] absolute end-0 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div class="flex items-center gap-4 shrink-0">
          <button
            class="ed-ui text-[11px] font-semibold uppercase tracking-[0.16em] flex items-center gap-2 transition-colors"
            :class="isFilterPanelOpen || activeFilterCount ? 'text-[#B8532E]' : 'text-[#4A4038] hover:text-[#262019]'"
            @click="isFilterPanelOpen = !isFilterPanelOpen"
          >
            <Icon name="lucide:sliders-horizontal" class="w-4 h-4" />
            {{ storefrontContent.actions.filters }}
            <span v-if="activeFilterCount" class="tabular-nums">({{ activeFilterCount }})</span>
          </button>

          <span class="h-4 w-px bg-[#DAD2C4]" />

          <div class="relative">
            <select
              v-model="sortOption"
              class="ed-select ed-select--bare"
            >
              <option value="relevance">{{ storefrontContent.shop.sort.relevance }}</option>
              <option value="priceAsc">{{ storefrontContent.shop.sort.priceLowToHigh }}</option>
              <option value="priceDesc">{{ storefrontContent.shop.sort.priceHighToLow }}</option>
            </select>
            <Icon name="lucide:chevron-down" class="w-3.5 h-3.5 text-[#8A7E6E] absolute end-0 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div class="hidden md:flex border border-[#C4B8A4]">
            <button
              class="w-8 h-8 flex items-center justify-center transition-colors"
              :class="viewMode === 'grid' ? 'bg-[#262019] text-[#F4EFE6]' : 'text-[#8A7E6E] hover:text-[#262019]'"
              :title="storefrontContent.shop.view.gridTitle"
              @click="viewMode = 'grid'"
            >
              <Icon name="lucide:layout-grid" class="w-3.5 h-3.5" />
            </button>
            <button
              class="w-8 h-8 flex items-center justify-center transition-colors border-s border-[#C4B8A4]"
              :class="viewMode === 'list' ? 'bg-[#262019] text-[#F4EFE6]' : 'text-[#8A7E6E] hover:text-[#262019]'"
              :title="storefrontContent.shop.view.listTitle"
              @click="viewMode = 'list'"
            >
              <Icon name="lucide:rows-3" class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <!-- Filter panel: unfolds in place, full width, same on every screen -->
      <Transition name="panel">
        <div v-if="isFilterPanelOpen" class="overflow-hidden border-b border-[#DAD2C4]">
          <div class="grid grid-cols-1 md:grid-cols-12 gap-8 py-8">
            <div class="md:col-span-7">
              <h4 class="ed-label">{{ storefrontContent.shop.categories }}</h4>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5">
                <label v-for="cat in filters.categories" :key="cat.id" class="flex items-center gap-3 cursor-pointer group select-none">
                  <input v-model="selectedCategories" type="checkbox" :value="cat.id" class="ed-check">
                  <span class="ed-ui text-[13px] text-[#4A4038] group-hover:text-[#97401F] transition-colors">{{ categoryDisplayTitle(cat) }}</span>
                </label>
              </div>
            </div>
            <div class="md:col-span-5">
              <h4 class="ed-label">{{ storefrontContent.shop.priceRange.label }}</h4>
              <StorefrontPriceRangeFilter
                v-model:min-price="minPriceInput"
                v-model:max-price="maxPriceInput"
                :min-bound="priceRange.min"
                :max-bound="priceRange.max"
                :step="1"
              />
              <button class="ed-link ed-ui text-[10px] font-semibold uppercase tracking-[0.16em] mt-5" @click="resetFilters">
                {{ storefrontContent.actions.reset }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Active chips -->
      <div v-if="selectedCategories.length > 0" class="flex flex-wrap gap-2 mt-6">
        <button
          v-for="catId in selectedCategories"
          :key="catId"
          class="flex items-center gap-2 px-3 py-1.5 border border-[#C4B8A4] ed-ui text-[11px] uppercase tracking-[0.12em] text-[#4A4038] hover:border-[#262019] transition-colors"
          @click="removeCategory(catId)"
        >
          {{ categoryDisplayTitle(filters.categories.find(c => c.id === catId)) || storefrontContent.shop.categoryFallback }}
          <Icon name="lucide:x" class="w-3.5 h-3.5" />
        </button>
        <button class="ed-link ed-ui text-[11px] uppercase tracking-[0.12em] text-[#8A7E6E]" @click="resetFilters">
          {{ storefrontContent.actions.clearAll }}
        </button>
      </div>

      <!-- Results -->
      <div class="mt-10 md:mt-14">
        <div v-if="filteredProducts.length === 0" class="border border-dashed border-[#C4B8A4] py-16 text-center">
          <Icon name="lucide:package-open" class="w-8 h-8 mx-auto mb-4 text-[#C4B8A4]" />
          <h3 class="ed-display text-xl text-[#262019]">{{ storefrontContent.shop.results.noResults }}</h3>
          <p class="ed-ui text-sm text-[#8A7E6E] mt-1">{{ storefrontContent.shop.results.noResultsHint }}</p>
          <button class="ed-btn-line mt-6" @click="resetFilters">{{ storefrontContent.actions.clearAll }}</button>
        </div>

        <!-- Staggered plate -->
        <div
          v-else-if="viewMode === 'grid'"
          class="grid grid-cols-2 md:grid-cols-12 gap-x-5 gap-y-10 md:gap-x-8 md:gap-y-14 items-start"
        >
          <div
            v-for="(product, index) in paginatedProducts"
            :key="product.id"
            :class="isWideCell(index) ? 'col-span-2 md:col-span-6' : 'col-span-1 md:col-span-3'"
          >
            <ProductCard
              :product="product"
              :view-mode="isWideCell(index) ? 'feature' : 'grid'"
              @quick-view="openQuickView"
            />
          </div>
        </div>

        <!-- Editorial rows -->
        <div v-else class="border-t border-[#262019] max-w-4xl">
          <div v-for="product in paginatedProducts" :key="product.id" class="py-6 md:py-7 border-b border-[#DAD2C4]">
            <ProductCard :product="product" view-mode="list" @quick-view="openQuickView" />
          </div>
        </div>

        <div v-if="filteredProducts.length > 0" class="mt-14">
          <StorefrontProductPagination
            :current-page="currentPage"
            :total-pages="totalPages"
            :page-numbers="pageNumbers"
            :can-go-prev="canGoPrev"
            :can-go-next="canGoNext"
            @go-to-page="goToPage"
            @go-prev="goToPrevPage"
            @go-next="goToNextPage"
          />
        </div>
      </div>
    </div>

    <!-- Quick view -->
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isQuickViewOpen && quickViewProduct" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-[#1E1912]/60" @click="closeQuickView" />
        <div class="bg-[#F4EFE6] border border-[#C4B8A4] max-w-4xl w-full max-h-[90vh] overflow-y-auto relative z-10 flex flex-col md:flex-row">
          <button class="absolute top-3 end-3 z-20 p-2 bg-[#F4EFE6] border border-[#C4B8A4] hover:bg-[#262019] hover:text-[#F4EFE6] transition-colors" @click="closeQuickView">
            <Icon name="lucide:x" class="w-5 h-5" />
          </button>
          <div class="w-full md:w-1/2 aspect-square md:aspect-auto bg-[#FBF8F2] relative border-b md:border-b-0 md:border-e border-[#DAD2C4]">
            <img :src="quickViewProduct.images && quickViewProduct.images[0] ? quickViewProduct.images[0] : '/blank.svg?v=2'" class="w-full h-full object-cover">
          </div>
          <div class="w-full md:w-1/2 p-8 flex flex-col">
            <div>
              <span class="ed-ui text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8A7E6E]">{{ quickViewProduct.category?.title || storefrontContent.common.collection }}</span>
              <h2 class="ed-display text-2xl md:text-3xl text-[#262019] mt-2 mb-4">{{ quickViewProduct.title }}</h2>
              <div class="ed-display text-xl text-[#B8532E] mb-6">{{ formatCurrency(quickViewProduct.price) }}</div>
              <p class="text-[15px] text-[#4A4038] leading-relaxed mb-8">
                {{ quickViewProduct.description || quickViewProduct.miniDescription || storefrontContent.product.descriptionFallback }}
              </p>
            </div>
            <NuxtLink :to="`/product/${quickViewProduct.slug}`" class="ed-btn-solid mt-auto" @click="closeQuickView">
              {{ storefrontContent.product.viewFullDetails }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.ed-check {
  appearance: none;
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border: 1px solid var(--ed-rule-strong, #C4B8A4);
  background: var(--ed-card, #FBF8F2);
  flex-shrink: 0;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}
.ed-check:checked {
  background-color: var(--ed-ink, #262019);
  border-color: var(--ed-ink, #262019);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%23F4EFE6' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 8.5l3.2 3.2L13 5'/%3E%3C/svg%3E");
  background-size: 12px;
  background-position: center;
  background-repeat: no-repeat;
}
.ed-check:focus-visible {
  outline: 2px solid rgb(var(--brand-rgb, 184 83 46) / 1);
  outline-offset: 2px;
}

.panel-enter-active, .panel-leave-active { transition: max-height 0.32s ease, opacity 0.32s ease; }
.panel-enter-from, .panel-leave-to { opacity: 0; max-height: 0; }
.panel-enter-to, .panel-leave-from { opacity: 1; max-height: 720px; }

@media (prefers-reduced-motion: reduce) {
  .panel-enter-active, .panel-leave-active { transition: none; }
}
</style>
