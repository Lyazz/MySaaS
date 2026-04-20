<script setup lang="ts">
import ProductCard from '~/components/storefront/templates/playful/ProductCard.vue'

const props = defineProps<{
    products: any[]
}>()

const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: categoryData } = await useFetch<any[]>(categoriesUrl, {
    headers: useTenantApiHeaders(),
    lazy: true
})

const { format: formatCurrency } = useCurrency()
const { currencyCode } = useCurrency()
const storefrontContent = useStorefrontContent()
const cartStore = useCartStore()
const storeSettings = useState<any>('storeSettings')

const categoryDisplayTitle = (category: any): string => {
    if (!category) return ""
    return category.parentId ? ("→ " + category.title) : category.title
}

const filters = computed(() => ({
    categories: categoryData.value || [],
}))

const selectedCategories = ref<string[]>([])
const searchQuery = ref('')
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
const sidebarProducts = computed(() => props.products.slice(0, 3))

const filteredProducts = computed(() => {
    let result = [...props.products]
    if (selectedCategories.value.length > 0) {
        const selectedIds = selectedCategories.value
        result = result.filter(p => selectedIds.some((id) => [...((Array.isArray(p.categoryIds) ? p.categoryIds : [])), p.categoryId].filter(Boolean).includes(id)))
    }
    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        result = result.filter(p => p.title.toLowerCase().includes(q))
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
    currentPage, totalPages, pageNumbers, paginatedProducts,
    canGoPrev, canGoNext, goToPage, goToPrevPage, goToNextPage
} = useProductPagination(filteredProducts, 12)

const pageTitle = computed(() => {
    const content = storefrontContent.value
    if (selectedCategories.value.length === 1) {
        const cat = filters.value.categories.find(c => c.id === selectedCategories.value[0])
        return cat ? cat.title : content.shop.catalogTitle
    }
    if (selectedCategories.value.length > 1) return content.shop.filteredTitle
    return content.shop.catalogTitle
})

const isFilterDrawerOpen = ref(false)

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

const quickViewIsPromoValid = computed(() => {
    if (!quickViewProduct.value?.isPromotionActive) return false
    const now = new Date().getTime()
    if (quickViewProduct.value.promotionStartDate && new Date(quickViewProduct.value.promotionStartDate).getTime() > now) return false
    if (quickViewProduct.value.promotionEndDate && new Date(quickViewProduct.value.promotionEndDate).getTime() < now) return false
    return true
})

const quickViewDisplayPrice = computed(() =>
    (quickViewIsPromoValid.value && quickViewProduct.value?.promotionalPrice)
        ? Number(quickViewProduct.value.promotionalPrice)
        : Number(quickViewProduct.value?.price ?? 0)
)

const showQuickViewSuccess = ref(false)

function handleQuickViewAddToCart() {
    if (!quickViewProduct.value) return
    const img = quickViewProduct.value.images?.[0] || '/blank.svg?v=2'
    cartStore.addItem({
        productId: quickViewProduct.value.id,
        title: quickViewProduct.value.title,
        slug: quickViewProduct.value.slug,
        price: quickViewDisplayPrice.value,
        bundleDeals: quickViewProduct.value.bundleDeals || [],
        stock: quickViewProduct.value.stock,
        image: img,
        metaPixelIds: quickViewProduct.value?.metaPixelIds
    })
    showQuickViewSuccess.value = true
    setTimeout(() => { showQuickViewSuccess.value = false }, 2000)
}
</script>

<template>
  <div class="bg-[#fffbf0] min-h-screen py-8 lg:py-12 relative" style="font-family: 'DM Sans', sans-serif">

    <!-- Mobile Filter Drawer Overlay -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isFilterDrawerOpen"
        class="fixed inset-0 bg-black/50 z-40 lg:hidden"
        @click="isFilterDrawerOpen = false"
      />
    </Transition>

    <!-- Mobile Filter Drawer -->
    <Transition
      enter-active-class="transition-transform duration-300"
      enter-from-class="-translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-300"
      leave-from-class="translate-x-0"
      leave-to-class="-translate-x-full"
    >
      <aside
        v-if="isFilterDrawerOpen"
        class="fixed inset-y-0 left-0 w-[300px] bg-[#fffbf0] z-50 shadow-2xl p-6 overflow-y-auto lg:hidden border-r-4 border-violet-100"
      >
        <div class="flex items-center justify-between mb-6">
          <h3 class="font-black text-stone-900 text-lg" style="font-family: 'Fredoka', sans-serif">
            {{ storefrontContent.actions.filters }}
          </h3>
          <button
            class="w-9 h-9 bg-violet-100 rounded-full flex items-center justify-center text-violet-700 hover:bg-violet-200 transition-colors"
            @click="isFilterDrawerOpen = false"
          >
            <Icon name="lucide:x" class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-8">
          <!-- Categories -->
          <div>
            <h4 class="font-black text-stone-700 mb-3 text-xs uppercase tracking-wider" style="font-family: 'Fredoka', sans-serif">
              {{ storefrontContent.shop.categories }}
            </h4>
            <div class="flex flex-wrap gap-2">
              <button
                class="px-4 py-2 rounded-full text-sm font-black transition-all border-2 whitespace-nowrap"
                :class="selectedCategories.length === 0 ? 'bg-violet-700 text-white border-violet-700 shadow-[0_3px_0_0_#4c1d95]' : 'bg-white text-stone-600 border-violet-100 hover:border-violet-300'"
                @click="resetFilters"
              >{{ storefrontContent.shop.allProducts }}</button>
              <button
                v-for="cat in filters.categories"
                :key="cat.id"
                class="px-4 py-2 rounded-full text-sm font-black transition-all border-2 whitespace-nowrap"
                :class="selectedCategories.includes(cat.id) ? 'bg-amber-400 text-amber-900 border-amber-300 shadow-[0_3px_0_0_#d97706]' : 'bg-white text-stone-600 border-violet-100 hover:border-amber-300'"
                @click="toggleCategory(cat.id)"
              >{{ categoryDisplayTitle(cat) }}</button>
            </div>
          </div>

          <!-- Price Range -->
          <div>
            <h4 class="font-black text-stone-700 mb-3 text-xs uppercase tracking-wider" style="font-family: 'Fredoka', sans-serif">
              {{ storefrontContent.shop.priceRange.label }}
            </h4>
            <StorefrontPriceRangeFilter
              v-model:min-price="minPriceInput"
              v-model:max-price="maxPriceInput"
              :min-bound="priceRange.min"
              :max-bound="priceRange.max"
              :step="1"
            />
          </div>

          <!-- Apply Button -->
          <div class="pt-6 sticky bottom-0 bg-[#fffbf0] pb-safe border-t-2 border-violet-100">
            <button
              class="w-full py-4 bg-violet-700 text-white font-black rounded-full shadow-[0_5px_0_0_#4c1d95] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none transition-all"
              style="font-family: 'Fredoka', sans-serif"
              @click="isFilterDrawerOpen = false"
            >
              {{ storefrontContent.shop.showResults(filteredProducts.length) }}
            </button>
          </div>
        </div>
      </aside>
    </Transition>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Page Header -->
      <div class="mb-8 lg:mb-10">
        <div class="flex items-center gap-3 mb-2">
          <span class="w-3 h-3 rounded-full bg-amber-400 border-2 border-amber-300 inline-block"></span>
          <span class="w-2 h-2 rounded-full bg-violet-400 border-2 border-violet-300 inline-block"></span>
          <span class="w-2 h-2 rounded-full bg-pink-400 border-2 border-pink-300 inline-block"></span>
        </div>
        <h1 class="text-3xl sm:text-4xl font-black text-stone-900" style="font-family: 'Fredoka', sans-serif">{{ pageTitle }}</h1>
        <p class="text-stone-500 text-sm mt-1">{{ filteredProducts.length }} {{ storefrontContent.shop.results?.count ?? 'products' }}</p>
      </div>

      <div class="flex flex-col lg:flex-row gap-8 xl:gap-10">
        <!-- Desktop Sidebar -->
        <aside class="hidden lg:flex flex-col w-64 flex-shrink-0 gap-5 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">

          <!-- Filter Card -->
          <div class="bg-white rounded-3xl border-3 border-violet-100 p-5 shadow-[0_4px_0_0_#ddd6fe]">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-black text-stone-900 text-base" style="font-family: 'Fredoka', sans-serif">
                {{ storefrontContent.actions.filters }}
              </h3>
              <button
                class="text-xs font-black text-violet-600 hover:text-violet-800 transition-colors"
                @click="resetFilters"
              >{{ storefrontContent.actions.reset }}</button>
            </div>

            <!-- Categories -->
            <div class="mb-5">
              <h4 class="font-black text-stone-600 mb-3 text-[11px] uppercase tracking-widest" style="font-family: 'Fredoka', sans-serif">
                {{ storefrontContent.shop.categories }}
              </h4>
              <div class="space-y-2">
                <label
                  v-for="cat in filters.categories"
                  :key="cat.id"
                  class="flex items-center gap-2.5 cursor-pointer group select-none"
                >
                  <div
                    class="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0"
                    :class="selectedCategories.includes(cat.id) ? 'bg-violet-700 border-violet-700' : 'bg-white border-violet-200 group-hover:border-violet-400'"
                    @click="toggleCategory(cat.id)"
                  >
                    <Icon v-if="selectedCategories.includes(cat.id)" name="lucide:check" class="w-3 h-3 text-white stroke-[3]" />
                  </div>
                  <span
                    class="text-sm transition-colors"
                    :class="selectedCategories.includes(cat.id) ? 'font-black text-violet-700' : 'text-stone-600 group-hover:text-stone-900'"
                    @click="toggleCategory(cat.id)"
                  >{{ categoryDisplayTitle(cat) }}</span>
                </label>
              </div>
            </div>

            <!-- Price Range -->
            <div>
              <h4 class="font-black text-stone-600 mb-3 text-[11px] uppercase tracking-widest" style="font-family: 'Fredoka', sans-serif">
                {{ storefrontContent.shop.priceRange.label }}
              </h4>
              <StorefrontPriceRangeFilter
                v-model:min-price="minPriceInput"
                v-model:max-price="maxPriceInput"
                :min-bound="priceRange.min"
                :max-bound="priceRange.max"
                :step="1"
              />
            </div>
          </div>

          <!-- Best Sellers Widget -->
          <div v-if="sidebarProducts.length > 0" class="bg-white rounded-3xl border-3 border-amber-100 p-5 shadow-[0_4px_0_0_#fde68a]">
            <h4 class="font-black text-stone-900 mb-4 text-base flex items-center gap-2" style="font-family: 'Fredoka', sans-serif">
              <span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
              {{ storefrontContent.shop.sidebar.bestSellers }}
            </h4>
            <div class="space-y-3">
              <NuxtLink
                v-for="p in sidebarProducts"
                :key="p.id"
                :to="`/p/${p.slug}`"
                class="flex gap-3 group items-center"
              >
                <div class="w-14 h-14 bg-violet-50 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-violet-100 group-hover:border-violet-300 transition-colors">
                  <img
                    :src="p.images && p.images[0] ? p.images[0] : '/blank.svg?v=2'"
                    class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    :alt="p.title"
                  >
                </div>
                <div class="min-w-0">
                  <h5 class="text-xs font-black text-stone-900 line-clamp-2 group-hover:text-violet-700 transition-colors leading-snug">{{ p.title }}</h5>
                  <span class="text-xs font-black text-violet-600 mt-0.5 block">{{ formatCurrency(p.price) }}</span>
                </div>
              </NuxtLink>
            </div>
          </div>
        </aside>

        <!-- Main Content -->
        <div class="flex-1 min-w-0">
          <!-- Active Filter Chips -->
          <div v-if="selectedCategories.length > 0" class="flex flex-wrap gap-2 mb-5">
            <div
              v-for="catId in selectedCategories"
              :key="catId"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 text-violet-800 rounded-full text-sm font-black border-2 border-violet-200"
            >
              <span>{{ categoryDisplayTitle(filters.categories.find(c => c.id === catId)) || storefrontContent.shop.categoryFallback }}</span>
              <button class="hover:text-violet-950 ml-0.5" @click="removeCategory(catId)">
                <Icon name="lucide:x" class="w-3.5 h-3.5" />
              </button>
            </div>
            <button class="text-sm font-black text-stone-500 hover:text-violet-700 transition-colors underline underline-offset-2" @click="resetFilters">
              {{ storefrontContent.actions.clearAll }}
            </button>
          </div>

          <!-- Toolbar -->
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-7">
            <!-- Mobile filter button -->
            <button
              class="w-full sm:hidden flex items-center justify-center gap-2 px-4 py-3.5 bg-white border-3 border-violet-100 rounded-full text-stone-700 font-black shadow-[0_3px_0_0_#ddd6fe] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none transition-all text-sm"
              @click="isFilterDrawerOpen = true"
            >
              <Icon name="lucide:sliders-horizontal" class="w-5 h-5" />
              {{ storefrontContent.shop.filtersAndSort }}
            </button>

            <!-- Search -->
            <div class="relative w-full sm:max-w-xs">
              <input
                v-model="searchQuery"
                type="text"
                :placeholder="storefrontContent.shop.searchWithinResultsPlaceholder"
                class="w-full bg-white border-3 border-violet-100 text-stone-900 text-sm rounded-full focus:outline-none focus:border-violet-400 pl-5 pr-10 py-2.5 transition-colors font-medium"
              >
              <div class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <Icon name="lucide:search" class="w-4 h-4 text-stone-400" />
              </div>
            </div>

            <div class="hidden sm:flex items-center gap-3">
              <!-- Sort -->
              <div class="relative">
                <select
                  v-model="sortOption"
                  class="appearance-none bg-white rounded-full border-3 border-violet-100 text-sm py-2.5 pl-4 pr-8 focus:outline-none focus:border-violet-400 cursor-pointer text-stone-700 font-black transition-colors"
                >
                  <option value="relevance">{{ storefrontContent.shop.sort.relevance }}</option>
                  <option value="priceAsc">{{ storefrontContent.shop.sort.priceLowToHigh }}</option>
                  <option value="priceDesc">{{ storefrontContent.shop.sort.priceHighToLow }}</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Icon name="lucide:chevron-down" class="w-4 h-4 text-stone-400" />
                </div>
              </div>

              <!-- View Toggle -->
              <div class="flex items-center bg-white rounded-full border-3 border-violet-100 p-1 gap-0.5">
                <button
                  class="p-2 rounded-full transition-all"
                  :class="viewMode === 'grid' ? 'bg-violet-700 text-white' : 'text-stone-400 hover:text-stone-700'"
                  :title="storefrontContent.shop.view.gridTitle"
                  @click="viewMode = 'grid'"
                >
                  <Icon name="lucide:layout-grid" class="w-4 h-4" />
                </button>
                <button
                  class="p-2 rounded-full transition-all"
                  :class="viewMode === 'list' ? 'bg-violet-700 text-white' : 'text-stone-400 hover:text-stone-700'"
                  :title="storefrontContent.shop.view.listTitle"
                  @click="viewMode = 'list'"
                >
                  <Icon name="lucide:list" class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- Category Pills (horizontal scroll, always visible) -->
          <div class="flex gap-2.5 overflow-x-auto pb-4 mb-6 scrollbar-hide -mx-1 px-1">
            <button
              class="flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-black transition-all border-2 whitespace-nowrap"
              :class="selectedCategories.length === 0
                ? 'bg-violet-700 text-white border-violet-700 shadow-[0_3px_0_0_#4c1d95] -translate-y-0.5'
                : 'bg-white text-stone-600 border-violet-100 hover:border-violet-300 hover:-translate-y-0.5'"
              @click="resetFilters"
            >{{ storefrontContent.shop.allProducts }}</button>
            <button
              v-for="cat in filters.categories"
              :key="cat.id"
              class="flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-black transition-all border-2 whitespace-nowrap"
              :class="selectedCategories.includes(cat.id)
                ? 'bg-amber-400 text-amber-900 border-amber-300 shadow-[0_3px_0_0_#d97706] -translate-y-0.5'
                : 'bg-white text-stone-600 border-violet-100 hover:border-amber-300 hover:-translate-y-0.5'"
              @click="toggleCategory(cat.id)"
            >{{ categoryDisplayTitle(cat) }}</button>
          </div>

          <!-- Empty State -->
          <div
            v-if="filteredProducts.length === 0"
            class="bg-white rounded-3xl border-3 border-violet-100 shadow-[0_4px_0_0_#ddd6fe] p-14 text-center"
          >
            <div class="text-6xl mb-4">🎈</div>
            <h3 class="text-xl font-black text-stone-900 mb-2" style="font-family: 'Fredoka', sans-serif">
              {{ storefrontContent.shop.results.noResults }}
            </h3>
            <p class="text-stone-500 text-sm">{{ storefrontContent.shop.results.noResultsHint }}</p>
            <button
              class="mt-6 px-8 py-3 bg-violet-700 text-white font-black rounded-full shadow-[0_4px_0_0_#4c1d95] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none transition-all"
              style="font-family: 'Fredoka', sans-serif"
              @click="resetFilters"
            >{{ storefrontContent.actions.clearAll }}</button>
          </div>

          <!-- Product Grid -->
          <div
            v-else
            :class="[
              viewMode === 'list'
                ? 'flex flex-col gap-4'
                : 'grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-y-12'
            ]"
          >
            <div
              v-for="(product, index) in paginatedProducts"
              :key="product.id"
              :class="viewMode === 'list' ? '' : (index % 2 === 1 ? 'mt-8 lg:mt-10' : 'mt-0')"
              :style="viewMode === 'grid' ? { transform: `rotate(${index % 3 === 1 ? '-0.6deg' : index % 3 === 2 ? '0.5deg' : '0deg'})` } : {}"
            >
              <ProductCard
                :product="product"
                :view-mode="viewMode"
                @quick-view="openQuickView"
              />
            </div>
          </div>

          <!-- Pagination -->
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
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div v-if="isQuickViewOpen && quickViewProduct" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeQuickView" />
      <div class="bg-[#fffbf0] rounded-3xl border-4 border-violet-100 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto relative z-10 flex flex-col md:flex-row overflow-hidden">
        <!-- Close -->
        <button
          class="absolute top-4 right-4 z-20 w-9 h-9 bg-white rounded-full flex items-center justify-center border-2 border-violet-100 hover:border-violet-300 text-stone-600 transition-colors shadow-sm"
          @click="closeQuickView"
        >
          <Icon name="lucide:x" class="w-5 h-5" />
        </button>

        <!-- Image side -->
        <div class="w-full md:w-5/12 aspect-square md:aspect-auto bg-violet-50 relative flex-shrink-0">
          <img
            :src="quickViewProduct.images?.[0] || '/blank.svg?v=2'"
            class="w-full h-full object-cover"
            :alt="quickViewProduct.title"
          >
          <!-- Promo badge -->
          <div
            v-if="quickViewIsPromoValid"
            class="absolute top-3 left-3 bg-pink-500 text-white text-xs font-black px-3 py-1 rounded-full rotate-[-2deg] border border-pink-400"
          >
            -{{ Math.round(((Number(quickViewProduct.price) - Number(quickViewProduct.promotionalPrice)) / Number(quickViewProduct.price)) * 100) }}%
          </div>
        </div>

        <!-- Info side -->
        <div class="flex-1 p-7 md:p-9 flex flex-col" style="font-family: 'DM Sans', sans-serif">
          <div class="flex-1">
            <span
              v-if="Number(quickViewProduct.stock) > 0"
              class="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-black mb-4 border border-emerald-200"
            >{{ storefrontContent.product.inStock }}</span>
            <span
              v-else
              class="inline-block px-3 py-1 bg-stone-100 text-stone-500 rounded-full text-xs font-black mb-4 border border-stone-200"
            >{{ storefrontContent.product.outOfStock }}</span>

            <h2 class="text-2xl font-black text-stone-900 mb-3 leading-snug" style="font-family: 'Fredoka', sans-serif">
              {{ quickViewProduct.title }}
            </h2>

            <div class="flex items-center gap-3 mb-5">
              <span class="text-2xl font-black text-violet-700">
                {{ quickViewDisplayPrice.toLocaleString() }}
                <span class="text-sm font-bold text-stone-400">{{ currencyCode }}</span>
              </span>
              <span
                v-if="quickViewIsPromoValid && quickViewProduct.promotionalPrice"
                class="text-base text-stone-400 line-through"
              >{{ Number(quickViewProduct.price).toLocaleString() }} {{ currencyCode }}</span>
            </div>

            <p class="text-stone-600 text-sm leading-relaxed">
              {{ quickViewProduct.description || storefrontContent.product.descriptionFallback }}
            </p>
          </div>

          <div class="mt-7 space-y-3">
            <button
              v-if="storeSettings?.cartEnabled !== false"
              :disabled="Number(quickViewProduct.stock) <= 0 || !quickViewProduct.isActive"
              class="w-full py-4 bg-amber-400 text-amber-900 font-black rounded-full border-2 border-amber-300 shadow-[0_5px_0_0_#d97706] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              style="font-family: 'Fredoka', sans-serif; font-size: 1.05rem"
              @click="handleQuickViewAddToCart"
            >
              <Icon name="lucide:shopping-bag" class="w-5 h-5 stroke-[2.5]" />
              <Transition
                enter-active-class="transition duration-150"
                enter-from-class="opacity-0 scale-75"
                enter-to-class="opacity-100 scale-100"
                leave-active-class="transition duration-150"
                leave-from-class="opacity-100 scale-100"
                leave-to-class="opacity-0 scale-75"
                mode="out-in"
              >
                <span v-if="showQuickViewSuccess" key="done">Added!</span>
                <span v-else key="idle">{{ storefrontContent.actions.addToCart }}</span>
              </Transition>
            </button>
            <NuxtLink
              :to="`/p/${quickViewProduct.slug}`"
              class="block w-full py-3.5 border-3 border-violet-100 text-stone-700 font-black rounded-full hover:border-violet-300 hover:bg-violet-50 transition-colors text-center text-sm"
              @click="closeQuickView"
            >{{ storefrontContent.product.viewFullDetails }}</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
