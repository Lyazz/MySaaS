<script setup lang="ts">
import ProductCard from '~/components/storefront/templates/wellness/ProductCard.vue'
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
const sidebarProducts = computed(() => props.products.slice(0, 2))

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
        result = result.filter(p => normalizeSearchText(p.title).includes(q) || (p.searchKeywords && normalizeSearchText(p.searchKeywords).includes(q)))
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

// Toggle Category Selection
const toggleCategory = (catId: string) => {
    const idx = selectedCategories.value.indexOf(catId)
    if (idx === -1) selectedCategories.value.push(catId)
    else selectedCategories.value.splice(idx, 1)
}

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
  <div class="min-h-screen bg-wl-paper py-8 lg:py-12 font-wellness relative text-wl-ink">
    <!-- Mobile Filter Drawer Overlay -->
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
        class="fixed inset-0 bg-wl-zelligeDeep/50 z-40 lg:hidden"
        @click="isFilterDrawerOpen = false"
      />
    </Transition>

    <!-- Mobile Filter Drawer -->
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
        class="fixed inset-y-0 end-0 w-[320px] bg-wl-paper z-50 shadow-wl-lg overflow-y-auto lg:hidden border-s border-wl-rule"
      >
        <div class="flex items-center justify-between px-6 h-20 bg-wl-card border-b-2 border-wl-olive">
          <h3 class="wl-label text-wl-ink">
            {{ storefrontContent.actions.filters }}
          </h3>
          <button
            class="p-2 -me-2 text-wl-muted hover:text-wl-ink transition-colors"
            @click="isFilterDrawerOpen = false"
          >
            <Icon name="lucide:x" class="w-5 h-5" />
          </button>
        </div>

        <div class="p-6 space-y-8">
          <!-- Categories -->
          <div>
            <h4 class="wl-label text-wl-muted pb-3 mb-4 border-b border-wl-rule">
              {{ storefrontContent.shop.categories }}
            </h4>
            <div class="space-y-3">
              <label
                v-for="cat in filters.categories"
                :key="cat.id"
                class="flex items-center gap-3 cursor-pointer group select-none"
              >
                <input
                  v-model="selectedCategories"
                  type="checkbox"
                  :value="cat.id"
                  class="h-4 w-4 rounded-none border-wl-ruleStrong text-wl-oliveDeep focus:ring-0 focus:ring-offset-0 bg-wl-card transition-colors"
                >
                <span class="text-sm text-wl-muted group-hover:text-wl-oliveDeep transition-colors">{{ categoryDisplayTitle(cat) }}</span>
              </label>
            </div>
          </div>

          <div class="wl-pricefilter">
            <StorefrontPriceRangeFilter
              v-model:min-price="minPriceInput"
              v-model:max-price="maxPriceInput"
              :min-bound="priceRange.min"
              :max-bound="priceRange.max"
              :step="1"
            />
          </div>

          <!-- Apply Button Mobile -->
          <div class="pt-4 sticky bottom-0 pb-safe bg-wl-paper">
            <button
              class="w-full py-4 wl-cta wl-label"
              @click="isFilterDrawerOpen = false"
            >
              {{ storefrontContent.shop.showResults(filteredProducts.length) }}
            </button>
          </div>
        </div>
      </aside>
    </Transition>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header / Title Section -->
      <div class="mb-8 lg:mb-12">
        <div class="wl-ruled wl-ruled--start wl-ruled--olive mb-4">
          <h1 class="wl-display text-3xl lg:text-[2.75rem] text-wl-ink leading-none">
            Shop Collection
          </h1>
        </div>
        <p class="text-wl-muted max-w-xl leading-relaxed">
          Curated essentials for your daily rituals and wellbeing.
        </p>

        <div class="flex flex-wrap gap-2 mt-7">
          <button
            class="px-6 py-2.5 wl-cta wl-label whitespace-nowrap"
            @click="resetFilters"
          >
            {{ storefrontContent.shop.allProducts }}
          </button>
        </div>
      </div>

      <div class="flex flex-col lg:flex-row gap-10">
        <!-- Tablet/Desktop Sidebar Filters -->
        <aside class="hidden lg:block w-64 flex-shrink-0 space-y-6 sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pe-1 custom-scrollbar">
          <div class="wl-plate p-6">
            <!-- Filter Header -->
            <div class="flex items-center justify-between gap-3 mb-6 border-b border-wl-rule pb-4">
              <h3 class="wl-label text-wl-ink">
                {{ storefrontContent.actions.filters }}
              </h3>
              <button
                class="wl-label text-wl-muted hover:text-wl-ink transition-colors"
                @click="resetFilters"
              >
                {{ storefrontContent.actions.reset }}
              </button>
            </div>

            <div class="space-y-8">
              <!-- Categories -->
              <div>
                <h4 class="wl-label text-wl-muted mb-4">
                  {{ storefrontContent.shop.categories }}
                </h4>
                <div class="space-y-3">
                  <label
                    v-for="cat in filters.categories"
                    :key="cat.id"
                    class="flex items-center gap-3 cursor-pointer group select-none"
                  >
                    <input
                      v-model="selectedCategories"
                      type="checkbox"
                      :value="cat.id"
                      class="h-4 w-4 rounded-none border-wl-ruleStrong text-wl-oliveDeep focus:ring-0 focus:ring-offset-0 bg-wl-paper transition-colors"
                    >
                    <span class="text-sm text-wl-muted group-hover:text-wl-oliveDeep transition-colors">{{ categoryDisplayTitle(cat) }}</span>
                  </label>
                </div>
              </div>

              <!-- Price Filter -->
              <div>
                <h4 class="wl-label text-wl-muted mb-4">
                  {{ storefrontContent.shop.priceRange.label }}
                </h4>
                <div class="wl-pricefilter">
                <StorefrontPriceRangeFilter
                  v-model:min-price="minPriceInput"
                  v-model:max-price="maxPriceInput"
                  :min-bound="priceRange.min"
                  :max-bound="priceRange.max"
                  :step="1"
                />
                </div>
              </div>
            </div>
          </div>

          <!-- Best Sellers Widget -->
          <div class="wl-plate p-6">
             <h4 class="wl-label text-wl-muted pb-4 mb-4 border-b border-wl-rule">
               {{ storefrontContent.shop.sidebar.bestSellers }}
             </h4>
             <div class="space-y-4">
                <NuxtLink
                  v-for="p in sidebarProducts"
                  :key="p.id"
                  :to="`/product/${p.slug}`"
                  class="flex gap-3 group"
                >
                  <div class="w-14 h-14 bg-wl-paper border border-wl-rule overflow-hidden flex-shrink-0">
                    <img
                      :src="p.images && p.images[0] ? p.images[0] : '/blank.svg?v=2'"
                      class="w-full h-full object-cover"
                      :alt="p.title"
                    >
                  </div>
                  <div class="min-w-0">
                    <h5 class="wl-display-sm text-sm text-wl-ink line-clamp-2 leading-snug mb-1">
                      <span class="wl-underline">{{ p.title }}</span>
                    </h5>
                    <span class="wl-num text-xs text-wl-muted">{{ formatCurrency(p.price) }}</span>
                  </div>
                </NuxtLink>
             </div>
          </div>
        </aside>

        <!-- Main Content -->
        <div class="flex-1 min-w-0">
          <!-- Active Filters Chips -->
          <div v-if="selectedCategories.length > 0" class="flex flex-wrap items-center gap-2 mb-6">
              <div
                v-for="catId in selectedCategories"
                :key="catId"
                class="wl-chip wl-chip--olive wl-label px-3 py-1.5"
              >
                  <span>{{ categoryDisplayTitle(filters.categories.find(c => c.id === catId)) || storefrontContent.shop.categoryFallback }}</span>
                  <button @click="removeCategory(catId)" class="hover:opacity-70 transition-opacity">
                      <Icon name="lucide:x" class="w-3 h-3" />
                  </button>
              </div>
              <button @click="resetFilters" class="px-2 py-1.5 wl-label text-wl-muted hover:text-wl-ink transition-colors">
                  {{ storefrontContent.actions.clearAll }}
              </button>
          </div>

          <!-- Toolbar -->
          <div class="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-8 pb-6 border-b border-wl-rule">
            <!-- Mobile Filter Toggle -->
            <button
              class="wl-cta-ghost w-full sm:hidden flex items-center justify-center gap-2 px-6 py-3.5 bg-wl-card wl-label"
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
                class="wl-field w-full text-sm block ps-11 pe-4 py-3 placeholder:text-wl-muted/60"
              >
              <div class="absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none">
                <Icon name="lucide:search" class="w-4 h-4 text-wl-muted" />
              </div>
            </div>

            <div class="hidden sm:flex items-center gap-3 flex-shrink-0">
              <!-- Sort Dropdown -->
              <span class="wl-label text-wl-muted whitespace-nowrap">{{ storefrontContent.shop.sortBy }}</span>
              <div class="relative w-48">
                <select
                  v-model="sortOption"
                  class="wl-field w-full appearance-none text-sm py-3 ps-4 pe-10 cursor-pointer"
                >
                  <option value="relevance">{{ storefrontContent.shop.sort.relevance }}</option>
                  <option value="priceAsc">{{ storefrontContent.shop.sort.priceLowToHigh }}</option>
                  <option value="priceDesc">{{ storefrontContent.shop.sort.priceHighToLow }}</option>
                </select>
                <div class="absolute inset-y-0 end-0 flex items-center pe-3 pointer-events-none">
                  <Icon name="lucide:chevron-down" class="w-4 h-4 text-wl-muted" />
                </div>
              </div>

              <!-- View Toggle -->
              <div class="flex items-center border border-wl-rule">
                  <button
                      class="p-3 transition-colors"
                      :class="viewMode === 'grid' ? 'bg-wl-ink text-wl-paper shadow-[inset_0_-3px_0_0_theme(colors.wl.olive)]' : 'bg-wl-card text-wl-muted hover:text-wl-oliveDeep hover:bg-wl-oliveWash'"
                      @click="viewMode = 'grid'"
                      :title="storefrontContent.shop.view.gridTitle"
                  >
                      <Icon name="lucide:layout-grid" class="w-4 h-4" />
                  </button>
                  <button
                      class="p-3 border-s border-wl-rule transition-colors"
                      :class="viewMode === 'list' ? 'bg-wl-ink text-wl-paper shadow-[inset_0_-3px_0_0_theme(colors.wl.olive)]' : 'bg-wl-card text-wl-muted hover:text-wl-oliveDeep hover:bg-wl-oliveWash'"
                      @click="viewMode = 'list'"
                      :title="storefrontContent.shop.view.listTitle"
                  >
                      <Icon name="lucide:list" class="w-4 h-4" />
                  </button>
              </div>
            </div>
          </div>

          <!-- Grid -->
          <div
            v-if="filteredProducts.length === 0"
            class="wl-plate p-16 text-center"
          >
            <div class="w-14 h-14 bg-wl-oliveWash border border-wl-oliveSoft flex items-center justify-center mx-auto mb-6">
              <Icon name="lucide:package-open" class="w-6 h-6 text-wl-oliveDeep" />
            </div>
            <h3 class="wl-display text-2xl text-wl-ink mb-3">
              {{ storefrontContent.shop.results.noResults }}
            </h3>
            <p class="text-wl-muted max-w-sm mx-auto leading-relaxed">
              {{ storefrontContent.shop.results.noResultsHint }}
            </p>
            <button
              class="mt-8 px-8 py-3.5 wl-cta wl-label"
              @click="resetFilters"
            >
              {{ storefrontContent.actions.clearAll }}
            </button>
          </div>

          <div
            v-else
            :class="[
                viewMode === 'list'
                    ? 'flex flex-col'
                    : 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6 lg:gap-y-10'
            ]"
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

  <!-- Quick View Modal -->
  <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
  >
      <div v-if="isQuickViewOpen && quickViewProduct" class="wl-root fixed inset-0 z-[60] flex items-center justify-center p-4 font-wellness">
          <div class="absolute inset-0 bg-wl-zelligeDeep/60" @click="closeQuickView"></div>
          <div class="wl-plate wl-plate-lg max-w-4xl w-full max-h-[90vh] relative z-10 flex flex-col md:flex-row overflow-hidden">
              <button @click="closeQuickView" class="absolute top-4 end-4 z-20 p-2 bg-wl-card border border-wl-rule hover:bg-wl-oliveWash transition-colors text-wl-muted hover:text-wl-oliveDeep">
                  <Icon name="lucide:x" class="w-4 h-4" />
              </button>

              <div class="wl-specimen w-full md:w-1/2 aspect-square md:aspect-auto bg-wl-paper relative flex-shrink-0 overflow-hidden">
                  <img
                    :src="quickViewProduct.images && quickViewProduct.images[0] ? quickViewProduct.images[0] : '/blank.svg?v=2'"
                    :alt="quickViewProduct.title"
                    class="w-full h-full object-cover"
                  >
              </div>
              <div class="w-full md:w-1/2 p-8 md:p-10 flex flex-col overflow-y-auto">
                  <div>
                    <span class="wl-eyebrow wl-label mb-5">{{ storefrontContent.product.inStock }}</span>
                    <h2 class="wl-display text-3xl md:text-4xl text-wl-ink mb-4 leading-tight">{{ quickViewProduct.title }}</h2>
                    <div class="wl-num text-xl font-medium text-wl-ink mb-6 pb-6 border-b border-wl-rule">
                        {{ formatCurrency(quickViewProduct.price) }}
                    </div>
                    <p class="text-wl-muted leading-relaxed mb-8">
                        {{ quickViewProduct.description || storefrontContent.product.descriptionFallback }}
                    </p>
                  </div>

                  <div class="mt-auto space-y-2">
                      <button class="wl-cta w-full py-4 wl-label flex items-center justify-center gap-3">
                        <Icon name="lucide:shopping-bag" class="w-4 h-4" />
                        {{ storefrontContent.actions.addToCart }}
                      </button>
                      <NuxtLink :to="`/product/${quickViewProduct.slug}`" class="wl-cta-ghost block w-full py-4 wl-label text-center" @click="closeQuickView">
                        {{ storefrontContent.product.viewFullDetails }}
                      </NuxtLink>
                  </div>
              </div>
          </div>
      </div>
  </Transition>
</template>
