<script setup lang="ts">
import ProductCard from '~/components/storefront/templates/embellir/ProductCard.vue'
import { normalizeSearchText } from '~/shared/text/normalize-search'

const props = defineProps<{
    products: any[]
}>()

// Fetch dynamic categories for filters
const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: categoryData } = await useFetch<any[]>(categoriesUrl, {
    headers: useTenantApiHeaders(),
    lazy: true // Non-blocking
})

const { format: formatCurrency } = useCurrency()
const storefrontContent = useStorefrontContent()

const categoryDisplayTitle = (category: any): string => {
    if (!category) return ""
    return category.parentId ? ("-> " + category.title) : category.title
}

// Dynamic Filters
const filters = computed(() => ({
    categories: categoryData.value || [],
}))

// Filtering Logic
const selectedCategories = ref<string[]>([])
const route = useRoute()
const searchQuery = ref((route.query.q as string) || '')

watch(() => route.query.q, (newQ) => {
    if (newQ !== undefined) {
        searchQuery.value = newQ as string
    }
})
const sortOption = ref<'relevance' | 'priceAsc' | 'priceDesc'>('relevance')
const viewMode = ref<'grid' | 'list'>('grid')

// Price Range State
const priceRange = computed(() => {
    const prices = props.products
        .map((product) => Number(product?.price))
        .filter((price): price is number => Number.isFinite(price))

    if (prices.length === 0) {
        return { min: 0, max: 0 }
    }

    return {
        min: Math.min(...prices),
        max: Math.max(...prices),
    }
})
const minPriceInput = ref<number | null>(null)
const maxPriceInput = ref<number | null>(null)

// Quick View State
const isQuickViewOpen = ref(false)
const quickViewProduct = ref<any>(null)
const sidebarProducts = computed(() => props.products.slice(0, 3))

const filteredProducts = computed(() => {
    let result = [...props.products]

    // Filter by Category
    if (selectedCategories.value.length > 0) {
        const selectedIds = selectedCategories.value
        result = result.filter(p => selectedIds.some((id) => [ ...((Array.isArray(p.categoryIds) ? p.categoryIds : [])), p.categoryId ].filter(Boolean).includes(id)))
    }

    // Filter by Search
    if (searchQuery.value) {
        const q = normalizeSearchText(searchQuery.value)
        result = result.filter(p =>
            normalizeSearchText(p.title).includes(q) ||
            (p.searchKeywords && normalizeSearchText(p.searchKeywords).includes(q))
        )
    }

    // Filter by Price
    result = result.filter(p => {
        const price = Number(p.price)
        const minMatches = minPriceInput.value == null ? true : price >= Number(minPriceInput.value)
        const maxMatches = maxPriceInput.value == null ? true : price <= Number(maxPriceInput.value)
        return minMatches && maxMatches
    })

    // Sort
    if (sortOption.value === 'priceAsc') {
        result.sort((a, b) => Number(a.price) - Number(b.price))
    } else if (sortOption.value === 'priceDesc') {
        result.sort((a, b) => Number(b.price) - Number(a.price))
    }

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

const pageTitle = computed(() => {
    const content = storefrontContent.value
    if (selectedCategories.value.length === 1) {
        const cat = filters.value.categories.find(c => c.id === selectedCategories.value[0])
        return cat ? cat.title : content.shop.catalogTitle
    }
    if (selectedCategories.value.length > 1) {
        return content.shop.filteredTitle
    }
    return content.shop.catalogTitle
})

const isFilterDrawerOpen = ref(false)
const mobileCategoriesDropdownOpen = ref(false)
const desktopCategoriesDropdownOpen = ref(true)

const removeCategory = (catId: string) => {
    const idx = selectedCategories.value.indexOf(catId)
    if (idx !== -1) selectedCategories.value.splice(idx, 1)
}

// Reset Filters
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
  <div class="bg-[#F2ECE1] min-h-screen">
    <!-- Mobile Filter Drawer -->
    <Transition
      enter-active-class="transition-opacity duration-300 ease-in-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300 ease-in-out"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isFilterDrawerOpen"
        class="fixed inset-0 bg-[#062622]/55 z-40 lg:hidden"
        @click="isFilterDrawerOpen = false"
      />
    </Transition>

    <Transition
      enter-active-class="transition-transform duration-300 ease-in-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-300 ease-in-out"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <aside
        v-if="isFilterDrawerOpen"
        class="fixed inset-y-0 end-0 w-[310px] bg-[#FDFAF4] z-50 shadow-2xl overflow-y-auto lg:hidden flex flex-col"
      >
        <div class="flex items-center justify-between px-6 py-5 bg-brand-600 text-[#FDFAF4]">
          <span class="emb-label">{{ storefrontContent.actions.filters }}</span>
          <button
            class="p-1 -me-1 text-[#F2ECE1]/70 hover:text-[#DFA254]"
            :aria-label="storefrontContent.actions.reset"
            @click="isFilterDrawerOpen = false"
          >
            <Icon name="lucide:x" class="w-5 h-5" />
          </button>
        </div>

        <div class="p-6 space-y-9 flex-1">
          <!-- Categories -->
          <div>
            <button
              type="button"
              class="w-full flex items-center justify-between text-start pb-2.5 border-b border-[#CBBDAB]"
              @click="mobileCategoriesDropdownOpen = !mobileCategoriesDropdownOpen"
            >
              <span class="emb-label text-[#16211E]">{{ storefrontContent.shop.categories }}</span>
              <Icon
                name="lucide:chevron-down"
                class="w-4 h-4 text-[#8E9793] transition-transform"
                :class="mobileCategoriesDropdownOpen ? 'rotate-180' : ''"
              />
            </button>
            <div v-show="mobileCategoriesDropdownOpen" class="pt-4 space-y-3">
              <label
                v-for="cat in filters.categories"
                :key="cat.id"
                class="flex items-center gap-3 cursor-pointer group select-none"
              >
                <input
                  v-model="selectedCategories"
                  type="checkbox"
                  :value="cat.id"
                  class="h-[18px] w-[18px] rounded-none border-[#CBBDAB] text-brand-600 focus:ring-brand-600"
                >
                <span class="text-sm text-[#5A6763] group-hover:text-brand-700 transition-colors">{{ categoryDisplayTitle(cat) }}</span>
              </label>
            </div>
          </div>

          <div>
            <p class="emb-label text-[#16211E] pb-2.5 border-b border-[#CBBDAB] mb-4">
              {{ storefrontContent.shop.priceRange.label }}
            </p>
            <StorefrontPriceRangeFilter
              v-model:min-price="minPriceInput"
              v-model:max-price="maxPriceInput"
              :min-bound="priceRange.min"
              :max-bound="priceRange.max"
              :step="1"
            />
          </div>
        </div>

        <div class="sticky bottom-0 p-6 pt-4 bg-[#FDFAF4] border-t border-[#CBBDAB]">
          <button
            class="w-full h-12 bg-brand-600 text-[#FDFAF4] emb-label hover:bg-[#DFA254] hover:text-[#062622] transition-colors"
            @click="isFilterDrawerOpen = false"
          >
            {{ storefrontContent.shop.showResults(filteredProducts.length) }}
          </button>
        </div>
      </aside>
    </Transition>

    <!-- Page head, set on the glaze -->
    <div class="relative bg-brand-600 text-[#F2ECE1] overflow-hidden">
      <div class="emb-zellige opacity-[0.09] absolute inset-0 pointer-events-none" />
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <p class="emb-label text-[#DFA254] mb-3">{{ storefrontContent.category.label }}</p>
        <div class="flex items-end justify-between gap-6">
          <h1 class="emb-display text-4xl md:text-[52px] leading-none text-[#FDFAF4]">
            {{ pageTitle }}
          </h1>
          <span class="hidden sm:flex h-12 w-12 shrink-0 border border-[#DFA254] text-[#DFA254] items-center justify-center text-sm font-bold tabular-nums">
            {{ filteredProducts.length }}
          </span>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
      <div class="flex flex-col lg:flex-row gap-10">
        <!-- Desktop sidebar -->
        <aside class="hidden lg:block w-64 flex-shrink-0 sticky top-28 max-h-[calc(100vh-9rem)] overflow-y-auto">
          <div class="border border-[#CBBDAB] bg-[#FDFAF4] p-6 space-y-9">
            <div class="flex items-center justify-between pb-4 border-b border-[#CBBDAB]">
              <span class="emb-label text-[#16211E]">{{ storefrontContent.actions.filters }}</span>
              <button
                class="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700 hover:text-[#DFA254] transition-colors"
                @click="resetFilters"
              >
                {{ storefrontContent.actions.reset }}
              </button>
            </div>

            <!-- Categories -->
            <div>
              <button
                type="button"
                class="w-full flex items-center justify-between text-start"
                @click="desktopCategoriesDropdownOpen = !desktopCategoriesDropdownOpen"
              >
                <span class="emb-label text-[#16211E]">{{ storefrontContent.shop.categories }}</span>
                <Icon
                  name="lucide:chevron-down"
                  class="w-4 h-4 text-[#8E9793] transition-transform"
                  :class="desktopCategoriesDropdownOpen ? 'rotate-180' : ''"
                />
              </button>
              <div v-show="desktopCategoriesDropdownOpen" class="pt-4 space-y-2.5">
                <label
                  v-for="cat in filters.categories"
                  :key="cat.id"
                  class="flex items-center gap-3 cursor-pointer group select-none"
                >
                  <input
                    v-model="selectedCategories"
                    type="checkbox"
                    :value="cat.id"
                    class="h-4 w-4 rounded-none border-[#CBBDAB] text-brand-600 focus:ring-brand-600"
                  >
                  <span class="text-sm text-[#5A6763] group-hover:text-brand-700 transition-colors">{{ categoryDisplayTitle(cat) }}</span>
                </label>
              </div>
            </div>

            <!-- Price -->
            <div>
              <p class="emb-label text-[#16211E] mb-4">{{ storefrontContent.shop.priceRange.label }}</p>
              <StorefrontPriceRangeFilter
                v-model:min-price="minPriceInput"
                v-model:max-price="maxPriceInput"
                :min-bound="priceRange.min"
                :max-bound="priceRange.max"
                :step="1"
              />
            </div>

            <!-- Best sellers -->
            <div v-if="sidebarProducts.length" class="pt-7 border-t border-[#CBBDAB]">
              <p class="emb-label text-[#16211E] mb-4">{{ storefrontContent.shop.sidebar.bestSellers }}</p>
              <div class="space-y-4">
                <NuxtLink
                  v-for="p in sidebarProducts"
                  :key="p.id"
                  :to="`/product/${p.slug}`"
                  class="flex gap-3 group"
                >
                  <div class="w-14 h-14 border border-[#CBBDAB] overflow-hidden flex-shrink-0 bg-[#F2ECE1]">
                    <img
                      :src="p.images && p.images[0] ? p.images[0] : '/blank.svg?v=2'"
                      class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      :alt="p.title"
                    >
                  </div>
                  <div class="min-w-0">
                    <h5 class="text-[13px] font-medium text-[#16211E] line-clamp-2 group-hover:text-brand-700 transition-colors">
                      {{ p.title }}
                    </h5>
                    <span class="emb-display text-sm text-brand-700 tabular-nums">{{ formatCurrency(p.price) }}</span>
                  </div>
                </NuxtLink>
              </div>
            </div>
          </div>
        </aside>

        <!-- Main -->
        <div class="flex-1 min-w-0">
          <!-- Active filter chips -->
          <div v-if="selectedCategories.length > 0" class="flex flex-wrap items-center gap-2 mb-6">
            <button
              v-for="catId in selectedCategories"
              :key="catId"
              type="button"
              class="flex items-center gap-2 px-3 py-1.5 border border-brand-600 text-brand-700 text-xs font-semibold hover:bg-brand-600 hover:text-[#FDFAF4] transition-colors"
              @click="removeCategory(catId)"
            >
              <span>{{ categoryDisplayTitle(filters.categories.find(c => c.id === catId)) || storefrontContent.shop.categoryFallback }}</span>
              <Icon name="lucide:x" class="w-3.5 h-3.5" />
            </button>
            <button
              class="text-xs text-[#5A6763] hover:text-brand-700 underline underline-offset-4"
              @click="resetFilters"
            >
              {{ storefrontContent.actions.clearAll }}
            </button>
          </div>

          <!-- Toolbar -->
          <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-4 border-b border-[#CBBDAB]">
            <button
              class="w-full sm:hidden flex items-center justify-center gap-2 h-12 border border-[#16211E] emb-label text-[#16211E]"
              @click="isFilterDrawerOpen = true"
            >
              <Icon name="lucide:sliders-horizontal" class="w-4 h-4" />
              {{ storefrontContent.shop.filtersAndSort }}
            </button>

            <!-- Search in results -->
            <div class="relative max-w-sm w-full">
              <input
                v-model="searchQuery"
                type="text"
                :placeholder="storefrontContent.shop.searchWithinResultsPlaceholder"
                class="w-full bg-transparent border-0 border-b border-[#CBBDAB] text-[#16211E] text-sm placeholder:text-[#8E9793] focus:ring-0 focus:border-brand-600 block ps-0 pe-8 py-2 transition-colors"
              >
              <Icon name="lucide:search" class="w-4 h-4 text-[#8E9793] absolute end-0 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div class="hidden sm:flex items-end gap-6">
              <!-- Sort -->
              <div class="flex items-center gap-3">
                <span class="emb-label text-[#8E9793] whitespace-nowrap">{{ storefrontContent.shop.sortBy }}</span>
                <div class="relative">
                  <select
                    v-model="sortOption"
                    class="appearance-none bg-transparent border-0 border-b border-[#CBBDAB] text-sm py-2 ps-0 pe-7 focus:border-brand-600 focus:ring-0 cursor-pointer text-[#16211E] font-medium"
                  >
                    <option value="relevance">{{ storefrontContent.shop.sort.relevance }}</option>
                    <option value="priceAsc">{{ storefrontContent.shop.sort.priceLowToHigh }}</option>
                    <option value="priceDesc">{{ storefrontContent.shop.sort.priceHighToLow }}</option>
                  </select>
                  <Icon name="lucide:chevron-down" class="w-4 h-4 text-[#5A6763] absolute end-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <!-- View toggle -->
              <div class="flex items-center gap-px bg-[#CBBDAB]">
                <button
                  class="w-9 h-9 flex items-center justify-center transition-colors"
                  :class="viewMode === 'grid' ? 'bg-brand-600 text-[#FDFAF4]' : 'bg-[#FDFAF4] text-[#8E9793] hover:text-[#16211E]'"
                  :title="storefrontContent.shop.view.gridTitle"
                  @click="viewMode = 'grid'"
                >
                  <Icon name="lucide:layout-grid" class="w-4 h-4" />
                </button>
                <button
                  class="w-9 h-9 flex items-center justify-center transition-colors"
                  :class="viewMode === 'list' ? 'bg-brand-600 text-[#FDFAF4]' : 'bg-[#FDFAF4] text-[#8E9793] hover:text-[#16211E]'"
                  :title="storefrontContent.shop.view.listTitle"
                  @click="viewMode = 'list'"
                >
                  <Icon name="lucide:list" class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- Results -->
          <div
            v-if="filteredProducts.length === 0"
            class="border border-[#CBBDAB] bg-[#FDFAF4] p-12 md:p-16 text-center"
          >
            <span class="emb-star w-10 h-10 text-[#CBBDAB] mx-auto mb-5" />
            <h3 class="emb-display text-2xl text-[#16211E] mb-2">
              {{ storefrontContent.shop.results.noResults }}
            </h3>
            <p class="text-sm text-[#5A6763]">
              {{ storefrontContent.shop.results.noResultsHint }}
            </p>
            <button
              class="mt-7 h-11 px-7 bg-brand-600 text-[#FDFAF4] emb-label hover:bg-[#DFA254] hover:text-[#062622] transition-colors"
              @click="resetFilters"
            >
              {{ storefrontContent.actions.clearAll }}
            </button>
          </div>

          <div
            v-else
            :class="viewMode === 'list'
              ? 'flex flex-col gap-5'
              : 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-7 lg:gap-y-10'"
          >
            <ProductCard
              v-for="product in paginatedProducts"
              :key="product.id"
              :product="product"
              :view-mode="viewMode"
              @quick-view="openQuickView"
            />
          </div>

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
  </div>

  <!-- Quick View -->
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="isQuickViewOpen && quickViewProduct" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-[#062622]/70" @click="closeQuickView" />
      <div class="relative z-10 bg-[#FDFAF4] border border-[#CBBDAB] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col md:flex-row">
        <button
          class="absolute top-3 end-3 z-20 w-9 h-9 flex items-center justify-center bg-[#FDFAF4] border border-[#CBBDAB] text-[#16211E] hover:bg-brand-600 hover:text-[#FDFAF4] hover:border-brand-600 transition-colors"
          :aria-label="storefrontContent.actions.quickView"
          @click="closeQuickView"
        >
          <Icon name="lucide:x" class="w-4 h-4" />
        </button>

        <div class="w-full md:w-1/2 aspect-square md:aspect-auto bg-[#F2ECE1] shrink-0">
          <img
            :src="quickViewProduct.images && quickViewProduct.images[0] ? quickViewProduct.images[0] : '/blank.svg?v=2'"
            :alt="quickViewProduct.title"
            class="w-full h-full object-cover"
          >
        </div>
        <div class="w-full md:w-1/2 p-8 md:p-10 flex flex-col">
          <p class="emb-label text-brand-700 mb-4">{{ storefrontContent.product.inStock }}</p>
          <h2 class="emb-display text-3xl text-[#16211E] mb-3 leading-tight">{{ quickViewProduct.title }}</h2>
          <div class="emb-display text-2xl text-brand-700 tabular-nums mb-6">
            {{ formatCurrency(quickViewProduct.price) }}
          </div>
          <p class="text-sm text-[#5A6763] leading-relaxed line-clamp-6">
            {{ quickViewProduct.description || storefrontContent.product.descriptionFallback }}
          </p>

          <NuxtLink
            :to="`/product/${quickViewProduct.slug}`"
            class="mt-auto pt-8 block"
            @click="closeQuickView"
          >
            <span class="w-full h-12 flex items-center justify-center gap-2 bg-brand-600 text-[#FDFAF4] emb-label hover:bg-[#DFA254] hover:text-[#062622] transition-colors">
              {{ storefrontContent.product.viewFullDetails }}
              <Icon name="lucide:arrow-right" class="w-4 h-4 rtl:rotate-180" />
            </span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </Transition>
</template>
