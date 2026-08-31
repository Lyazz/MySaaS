<script setup lang="ts">
import ProductCard from './ProductCard.vue'
import CategoryPlaceholder from '~/components/storefront/CategoryPlaceholder.vue'
import { normalizeSearchText } from '~/shared/text/normalize-search'

const props = defineProps<{
  products: any[]
}>()

const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: categoryData } = await useFetch<any[]>(categoriesUrl, {
  headers: useTenantApiHeaders(),
  lazy: true
})

const { format: formatCurrency, currencyCode, formatAmount } = useCurrency()
const storefrontContent = useStorefrontContent()
const cartStore = useCartStore()
const storeSettings = useState<any>('storeSettings')

const categoryDisplayTitle = (category: any): string => {
  if (!category) return ''
  return category.parentId ? ('→ ' + category.title) : category.title
}

const filters = computed(() => ({
  categories: categoryData.value || [],
}))

/* Shortcut tiles at the top of the listing — the babyshop entry pattern. */
const shortcutCategories = computed(() => {
  const all = categoryData.value || []
  const roots = all.filter((c) => !c.parentId)
  return (roots.length > 0 ? roots : all).slice(0, 12)
})

const tileTints = ['var(--kw-pink-soft)', 'var(--kw-sky-soft)', 'var(--kw-lemon-soft)', 'var(--kw-mint-soft)', 'var(--kw-lilac-soft)']
const tintAt = (index: number) => tileTints[index % tileTints.length]

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

const quickViewDiscountPercent = computed(() => {
  const full = Number(quickViewProduct.value?.price ?? 0)
  if (!quickViewIsPromoValid.value || !Number.isFinite(full) || full <= 0) return 0
  return Math.round(((full - quickViewDisplayPrice.value) / full) * 100)
})

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
  <div class="bg-[var(--kw-cream)] min-h-screen pb-16">
    <!-- ══ Page head + shortcut tiles ═════════════════════════════════ -->
    <section class="kw-band-lilac kw-scallop pt-10 pb-16 md:pt-14 md:pb-20 mb-10">
      <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <p class="kw-kicker mb-3">
          {{ storefrontContent.shop.title }}
        </p>
        <h1 class="kw-display text-3xl md:text-[2.8rem] mb-2">
          {{ pageTitle }}
        </h1>
        <p class="kw-lede">
          {{ storefrontContent.common.productsCount(filteredProducts.length) }}
        </p>

        <div
          v-if="shortcutCategories.length"
          class="mt-9 flex gap-4 md:gap-6 overflow-x-auto kw-hide-scroll pt-2 pb-4 snap-x"
        >
          <NuxtLink
            v-for="(cat, index) in shortcutCategories"
            :key="cat.id"
            :to="`/category/${cat.slug}`"
            class="group snap-start flex-shrink-0 w-[4.5rem] sm:w-20 text-center"
          >
            <div
              class="w-[4.5rem] h-[4.5rem] sm:w-20 sm:h-20 kw-blob kw-blob-hover overflow-hidden mb-2 group-hover:-translate-y-1"
              :style="{ background: tintAt(index), boxShadow: '0 0 0 2px rgba(255,255,255,.9)' }"
            >
              <img
                v-if="cat.imageUrl"
                :src="cat.imageUrl"
                :alt="cat.title"
                class="w-full h-full object-cover"
              >
              <CategoryPlaceholder
                v-else
                :title="cat.title"
                class="w-full h-full"
              />
            </div>
            <p class="text-[11px] font-extrabold leading-tight line-clamp-2 group-hover:text-[var(--kw-pink-deep)] transition-colors">
              {{ cat.title }}
            </p>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ══ Mobile filter drawer ═══════════════════════════════════════ -->
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
        class="fixed inset-0 bg-[#4A2E4D]/45 z-40 lg:hidden"
        @click="isFilterDrawerOpen = false"
      />
    </Transition>

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
        class="fixed inset-y-0 start-0 w-[310px] bg-[var(--kw-cream)] z-50 shadow-2xl p-6 overflow-y-auto lg:hidden"
      >
        <div class="flex items-center justify-between mb-7">
          <h3 class="kw-title text-lg">
            {{ storefrontContent.actions.filters }}
          </h3>
          <button
            class="kw-icon-btn w-9 h-9"
            @click="isFilterDrawerOpen = false"
          >
            <Icon
              name="lucide:x"
              class="w-5 h-5"
            />
          </button>
        </div>

        <div class="space-y-8">
          <div>
            <h4 class="kw-kicker mb-4">
              {{ storefrontContent.shop.categories }}
            </h4>
            <div class="flex flex-wrap gap-2">
              <button
                class="kw-chip"
                :class="selectedCategories.length === 0 ? 'kw-chip-on' : ''"
                @click="resetFilters"
              >
                {{ storefrontContent.shop.allProducts }}
              </button>
              <button
                v-for="cat in filters.categories"
                :key="cat.id"
                class="kw-chip"
                :class="selectedCategories.includes(cat.id) ? 'kw-chip-on' : ''"
                @click="toggleCategory(cat.id)"
              >
                {{ categoryDisplayTitle(cat) }}
              </button>
            </div>
          </div>

          <div>
            <h4 class="kw-kicker mb-4">
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

          <div class="pt-4 sticky bottom-0 bg-[var(--kw-cream)] pb-2">
            <button
              class="kw-btn w-full"
              @click="isFilterDrawerOpen = false"
            >
              {{ storefrontContent.shop.showResults(filteredProducts.length) }}
            </button>
          </div>
        </div>
      </aside>
    </Transition>

    <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex flex-col lg:flex-row gap-8 xl:gap-10">
        <!-- ══ Sidebar ══════════════════════════════════════════════════ -->
        <aside class="hidden lg:flex flex-col w-64 flex-shrink-0 gap-5 sticky top-[9.5rem] max-h-[calc(100vh-11rem)] overflow-y-auto kw-hide-scroll">
          <div class="kw-card p-5">
            <div class="flex items-center justify-between mb-5">
              <h3 class="kw-title text-base">
                {{ storefrontContent.actions.filters }}
              </h3>
              <button
                class="text-xs font-extrabold text-[var(--kw-pink-deep)] hover:underline"
                @click="resetFilters"
              >
                {{ storefrontContent.actions.reset }}
              </button>
            </div>

            <div class="mb-6">
              <h4 class="kw-kicker mb-3">
                {{ storefrontContent.shop.categories }}
              </h4>
              <div class="space-y-1">
                <button
                  v-for="cat in filters.categories"
                  :key="cat.id"
                  type="button"
                  class="w-full flex items-center gap-2.5 py-1.5 text-start group"
                  @click="toggleCategory(cat.id)"
                >
                  <span
                    class="w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0"
                    :class="selectedCategories.includes(cat.id)
                      ? 'bg-[var(--kw-pink-deep)] border-[var(--kw-pink-deep)]'
                      : 'bg-white border-[var(--kw-line)] group-hover:border-[var(--kw-pink)]'"
                  >
                    <Icon
                      v-if="selectedCategories.includes(cat.id)"
                      name="lucide:check"
                      class="w-3 h-3 text-white"
                    />
                  </span>
                  <span
                    class="text-sm font-bold transition-colors"
                    :class="selectedCategories.includes(cat.id) ? 'text-[var(--kw-pink-deep)]' : 'text-[var(--kw-ink-soft)] group-hover:text-[var(--kw-ink)]'"
                  >{{ categoryDisplayTitle(cat) }}</span>
                </button>
              </div>
            </div>

            <div>
              <h4 class="kw-kicker mb-3">
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

          <div
            v-if="sidebarProducts.length > 0"
            class="kw-card p-5"
          >
            <h4 class="kw-title text-base mb-4">
              {{ storefrontContent.shop.sidebar.bestSellers }}
            </h4>
            <div class="space-y-3">
              <NuxtLink
                v-for="p in sidebarProducts"
                :key="p.id"
                :to="`/product/${p.slug}`"
                class="flex gap-3 group items-center"
              >
                <div
                  class="w-14 h-14 kw-blob overflow-hidden flex-shrink-0"
                  style="background: var(--kw-pink-soft)"
                >
                  <img
                    :src="p.images && p.images[0] ? p.images[0] : '/blank.svg?v=2'"
                    class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    :alt="p.title"
                  >
                </div>
                <div class="min-w-0">
                  <h5 class="text-xs font-extrabold line-clamp-2 leading-snug group-hover:text-[var(--kw-pink-deep)] transition-colors">
                    {{ p.title }}
                  </h5>
                  <span class="kw-num text-xs text-[var(--kw-pink-deep)] mt-0.5 block">{{ formatCurrency(p.price) }}</span>
                </div>
              </NuxtLink>
            </div>
          </div>
        </aside>

        <!-- ══ Results ══════════════════════════════════════════════════ -->
        <div class="flex-1 min-w-0">
          <div
            v-if="selectedCategories.length > 0"
            class="flex flex-wrap items-center gap-2 mb-5"
          >
            <span
              v-for="catId in selectedCategories"
              :key="catId"
              class="kw-chip kw-chip-on"
            >
              {{ categoryDisplayTitle(filters.categories.find(c => c.id === catId)) || storefrontContent.shop.categoryFallback }}
              <button
                class="ms-0.5 opacity-70 hover:opacity-100"
                @click="removeCategory(catId)"
              >
                <Icon
                  name="lucide:x"
                  class="w-3.5 h-3.5"
                />
              </button>
            </span>
            <button
              class="text-sm font-extrabold text-[var(--kw-ink-soft)] hover:text-[var(--kw-pink-deep)] underline underline-offset-4"
              @click="resetFilters"
            >
              {{ storefrontContent.actions.clearAll }}
            </button>
          </div>

          <!-- Toolbar -->
          <div class="kw-card-flat p-2.5 mb-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              class="kw-btn kw-btn-sm kw-btn-ghost sm:!hidden"
              @click="isFilterDrawerOpen = true"
            >
              <Icon
                name="lucide:sliders-horizontal"
                class="w-4 h-4"
              />
              {{ storefrontContent.shop.filtersAndSort }}
            </button>

            <div class="relative flex-1 min-w-0">
              <input
                v-model="searchQuery"
                type="text"
                :placeholder="storefrontContent.shop.searchWithinResultsPlaceholder"
                class="kw-field h-11 pe-11 bg-[var(--kw-cream-2)] border-transparent"
              >
              <Icon
                name="lucide:search"
                class="w-4 h-4 text-[var(--kw-ink-faint)] absolute end-4 top-1/2 -translate-y-1/2 pointer-events-none"
              />
            </div>

            <div class="hidden sm:flex items-center gap-2.5 flex-shrink-0">
              <div class="relative">
                <select
                  v-model="sortOption"
                  class="kw-field h-11 pe-10 appearance-none cursor-pointer bg-[var(--kw-cream-2)] border-transparent"
                >
                  <option value="relevance">
                    {{ storefrontContent.shop.sort.relevance }}
                  </option>
                  <option value="priceAsc">
                    {{ storefrontContent.shop.sort.priceLowToHigh }}
                  </option>
                  <option value="priceDesc">
                    {{ storefrontContent.shop.sort.priceHighToLow }}
                  </option>
                </select>
                <Icon
                  name="lucide:chevron-down"
                  class="w-4 h-4 text-[var(--kw-ink-faint)] absolute end-4 top-1/2 -translate-y-1/2 pointer-events-none"
                />
              </div>

              <div class="flex items-center bg-[var(--kw-cream-2)] rounded-full p-1 gap-1">
                <button
                  class="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                  :class="viewMode === 'grid' ? 'bg-white text-[var(--kw-pink-deep)] shadow-sm' : 'text-[var(--kw-ink-faint)]'"
                  :title="storefrontContent.shop.view.gridTitle"
                  @click="viewMode = 'grid'"
                >
                  <Icon
                    name="lucide:layout-grid"
                    class="w-4 h-4"
                  />
                </button>
                <button
                  class="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                  :class="viewMode === 'list' ? 'bg-white text-[var(--kw-pink-deep)] shadow-sm' : 'text-[var(--kw-ink-faint)]'"
                  :title="storefrontContent.shop.view.listTitle"
                  @click="viewMode = 'list'"
                >
                  <Icon
                    name="lucide:list"
                    class="w-4 h-4"
                  />
                </button>
              </div>
            </div>
          </div>

          <!-- Category chips -->
          <div class="flex gap-2.5 overflow-x-auto kw-hide-scroll pb-4 mb-7 -mx-1 px-1">
            <button
              class="kw-chip flex-shrink-0"
              :class="selectedCategories.length === 0 ? 'kw-chip-on' : ''"
              @click="resetFilters"
            >
              {{ storefrontContent.shop.allProducts }}
            </button>
            <button
              v-for="cat in filters.categories"
              :key="cat.id"
              class="kw-chip flex-shrink-0"
              :class="selectedCategories.includes(cat.id) ? 'kw-chip-on' : ''"
              @click="toggleCategory(cat.id)"
            >
              {{ categoryDisplayTitle(cat) }}
            </button>
          </div>

          <!-- Empty -->
          <div
            v-if="filteredProducts.length === 0"
            class="kw-card p-14 text-center"
          >
            <span
              class="w-20 h-20 kw-blob mx-auto mb-6 flex items-center justify-center"
              style="background: var(--kw-lemon-soft)"
            >
              <Icon
                name="lucide:search-x"
                class="w-9 h-9 text-[var(--kw-lemon-deep)]"
              />
            </span>
            <h3 class="kw-title text-xl mb-2">
              {{ storefrontContent.shop.results.noResults }}
            </h3>
            <p class="kw-lede mb-7">
              {{ storefrontContent.shop.results.noResultsHint }}
            </p>
            <button
              class="kw-btn"
              @click="resetFilters"
            >
              {{ storefrontContent.actions.clearAll }}
            </button>
          </div>

          <!-- Grid -->
          <div
            v-else
            :class="viewMode === 'list'
              ? 'flex flex-col gap-4'
              : 'grid grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-10'"
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

  <!-- ══ Quick view ═══════════════════════════════════════════════════ -->
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="isQuickViewOpen && quickViewProduct"
      class="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <div
        class="absolute inset-0 bg-[#4A2E4D]/55 backdrop-blur-sm"
        @click="closeQuickView"
      />
      <div class="kw-card relative z-10 max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col md:flex-row !overflow-hidden">
        <button
          class="kw-icon-btn absolute top-4 end-4 z-20 w-9 h-9"
          @click="closeQuickView"
        >
          <Icon
            name="lucide:x"
            class="w-5 h-5"
          />
        </button>

        <div
          class="w-full md:w-5/12 aspect-square md:aspect-auto relative flex-shrink-0"
          style="background: var(--kw-pink-soft)"
        >
          <img
            :src="quickViewProduct.images?.[0] || '/blank.svg?v=2'"
            class="w-full h-full object-cover"
            :alt="quickViewProduct.title"
          >
          <span
            v-if="quickViewDiscountPercent > 0"
            class="kw-badge kw-badge-sale absolute top-4 start-4"
          >-{{ quickViewDiscountPercent }}%</span>
        </div>

        <div class="flex-1 p-7 md:p-9 flex flex-col">
          <div class="flex-1">
            <span
              v-if="Number(quickViewProduct.stock) > 0"
              class="kw-badge kw-badge-new mb-5"
            >{{ storefrontContent.product.inStock }}</span>
            <span
              v-else
              class="kw-badge kw-badge-out mb-5"
            >{{ storefrontContent.actions.outOfStock }}</span>

            <h2 class="kw-display text-2xl md:text-3xl mb-4 leading-tight">
              {{ quickViewProduct.title }}
            </h2>

            <div class="flex items-baseline gap-3 mb-6">
              <span class="kw-num text-3xl text-[var(--kw-pink-deep)]">
                {{ formatAmount(quickViewDisplayPrice) }}
                <span class="text-sm text-[var(--kw-ink-faint)]">{{ currencyCode }}</span>
              </span>
              <span
                v-if="quickViewDiscountPercent > 0"
                class="text-base font-bold text-[var(--kw-ink-faint)] line-through"
              >
                {{ formatAmount(quickViewProduct.price) }}
              </span>
            </div>

            <p class="kw-lede">
              {{ quickViewProduct.description || storefrontContent.product.descriptionFallback }}
            </p>
          </div>

          <div class="mt-8 space-y-3">
            <button
              v-if="storeSettings?.cartEnabled !== false"
              :disabled="Number(quickViewProduct.stock) <= 0 || !quickViewProduct.isActive"
              class="kw-btn kw-btn-lg w-full"
              @click="handleQuickViewAddToCart"
            >
              <Icon
                name="lucide:shopping-bag"
                class="w-5 h-5"
              />
              <span>{{ showQuickViewSuccess ? storefrontContent.toasts.addedToCart.title : storefrontContent.actions.addToCart }}</span>
            </button>
            <NuxtLink
              :to="`/product/${quickViewProduct.slug}`"
              class="kw-btn kw-btn-ghost w-full"
              @click="closeQuickView"
            >
              {{ storefrontContent.product.viewFullDetails }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
