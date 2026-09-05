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

const storefrontContent = useStorefrontContent()
const { t } = useI18n({ useScope: 'global' })

const categoryDisplayTitle = (category: any): string => {
    if (!category) return ""
    return category.parentId ? ("-> " + category.title) : category.title
}

const filters = computed(() => ({ categories: categoryData.value || [] }))

const selectedCategories = ref<string[]>([])
const route = useRoute()
const searchQuery = ref((route.query.q as string) || '')

watch(() => route.query.q, (newQ) => {
    if (newQ !== undefined) {
        searchQuery.value = newQ as string
    }
})
const sortOption = ref<'relevance' | 'priceAsc' | 'priceDesc'>('relevance')
const minPriceInput = ref<number | null>(null)
const maxPriceInput = ref<number | null>(null)
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
const isFilterDrawerOpen = ref(false)

const filteredProducts = computed(() => {
  let result = [...props.products]
  if (selectedCategories.value.length > 0) {
    result = result.filter(p => selectedCategories.value.some((id) => [ ...((Array.isArray(p.categoryIds) ? p.categoryIds : [])), p.categoryId ].filter(Boolean).includes(id)))
  }
  if (searchQuery.value) {
    const q = normalizeSearchText(searchQuery.value)
    result = result.filter(p => normalizeSearchText(p.title).includes(q) || (p.searchKeywords && normalizeSearchText(p.searchKeywords).includes(q)))
  }
  result = result.filter(p => {
    const price = Number(p.price)
    const minOk = minPriceInput.value == null ? true : price >= Number(minPriceInput.value)
    const maxOk = maxPriceInput.value == null ? true : price <= Number(maxPriceInput.value)
    return minOk && maxOk
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
</script>

<template>
  <div class="shop">
    <!-- Page header -->
    <div class="shop__header">
      <div class="shop__header-inner">
        <span class="at-label" style="--delay:0ms;animation:at-fade-up 0.6s ease forwards">{{ storefrontContent.shop.title }}</span>
        <h1 class="shop__title">{{ storefrontContent.shop.catalogTitle }}</h1>
      </div>
    </div>

    <div class="shop__body">
      <!-- Mobile filter toggle -->
      <button class="shop__filter-toggle" @click="isFilterDrawerOpen = true">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 3h12M3 7h8M5 11h4" stroke="currentColor" stroke-width="0.85"/>
        </svg>
        {{ storefrontContent.actions.filters }}
        <span v-if="selectedCategories.length" class="shop__filter-count">{{ selectedCategories.length }}</span>
      </button>

      <div class="shop__layout">
        <!-- Desktop sidebar -->
        <aside class="shop__sidebar">
          <div class="shop__sidebar-head">
            <span class="at-label">{{ storefrontContent.actions.filters }}</span>
            <button class="shop__reset-btn" @click="resetFilters">{{ storefrontContent.actions.reset }}</button>
          </div>

          <div class="shop__filter-section">
            <h4 class="shop__filter-title">{{ storefrontContent.shop.categories }}</h4>
            <div class="shop__filter-list">
              <label
                v-for="cat in filters.categories"
                :key="cat.id"
                class="shop__filter-item"
              >
                <input
                  v-model="selectedCategories"
                  type="checkbox"
                  :value="cat.id"
                  class="shop__checkbox"
                >
                <span class="shop__filter-label">{{ categoryDisplayTitle(cat) }}</span>
              </label>
            </div>
          </div>

          <div class="shop__filter-section">
            <h4 class="shop__filter-title">{{ storefrontContent.shop.priceRange.label }}</h4>
            <StorefrontPriceRangeFilter
              v-model:min-price="minPriceInput"
              v-model:max-price="maxPriceInput"
              :min-bound="priceRange.min"
              :max-bound="priceRange.max"
              :step="1"
            />
          </div>
        </aside>

        <!-- Main grid area -->
        <div class="shop__main">
          <!-- Toolbar -->
          <div class="shop__toolbar">
            <div class="shop__active-filters">
              <div
                v-for="catId in selectedCategories"
                :key="catId"
                class="shop__active-tag"
              >
                <span>{{ categoryDisplayTitle(filters.categories.find(c => c.id === catId)) }}</span>
                <button class="shop__active-tag-remove" @click="removeCategory(catId)">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" stroke-width="0.85"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="shop__toolbar-right">
              <div class="shop__search-wrap">
                <input
                  v-model="searchQuery"
                  type="text"
                  :placeholder="storefrontContent.shop.searchWithinResultsPlaceholder"
                  class="at-input shop__search"
                >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" class="shop__search-icon">
                  <circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="0.85"/>
                  <path d="M10 10l2.5 2.5" stroke="currentColor" stroke-width="0.85"/>
                </svg>
              </div>

              <div class="shop__sort-wrap">
                <select v-model="sortOption" class="at-select shop__sort">
                  <option value="relevance">{{ storefrontContent.shop.sort.relevance }}</option>
                  <option value="priceAsc">{{ storefrontContent.shop.sort.priceLowToHigh }}</option>
                  <option value="priceDesc">{{ storefrontContent.shop.sort.priceHighToLow }}</option>
                </select>
                <svg width="8" height="5" viewBox="0 0 8 5" fill="none" class="shop__sort-icon">
                  <path d="M1 1l3 3 3-3" stroke="currentColor" stroke-width="0.85"/>
                </svg>
              </div>
            </div>
          </div>

          <p class="shop__count">{{ filteredProducts.length }} produits</p>

          <!-- Empty -->
          <div v-if="filteredProducts.length === 0" class="shop__empty">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" class="shop__empty-icon">
              <rect x="4" y="4" width="32" height="32" stroke="currentColor" stroke-width="0.75"/>
              <path d="M12 20h16M20 12v16" stroke="currentColor" stroke-width="0.75"/>
            </svg>
            <p class="shop__empty-title">{{ storefrontContent.shop.results.noResults }}</p>
            <p class="shop__empty-sub">{{ storefrontContent.shop.results.noResultsHint }}</p>
            <button class="at-btn-ghost" style="width:auto;padding:12px 24px" @click="resetFilters">
              {{ storefrontContent.actions.clearAll }}
            </button>
          </div>

          <div v-else class="shop__grid">
            <ProductCard v-for="product in paginatedProducts" :key="product.id" :product="product" />
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

    <!-- Mobile filter drawer -->
    <Teleport to="body">
      <Transition name="overlay">
        <div v-if="isFilterDrawerOpen" class="shop__overlay" @click="isFilterDrawerOpen = false" />
      </Transition>
      <Transition name="drawer-right">
        <aside v-if="isFilterDrawerOpen" class="shop__drawer">
          <div class="shop__drawer-head">
            <span class="at-label">{{ storefrontContent.actions.filters }}</span>
            <button class="shop__drawer-close" @click="isFilterDrawerOpen = false">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="0.85"/>
              </svg>
            </button>
          </div>

          <div class="shop__drawer-body">
            <div class="shop__filter-section">
              <h4 class="shop__filter-title">{{ storefrontContent.shop.categories }}</h4>
              <div class="shop__filter-list">
                <label v-for="cat in filters.categories" :key="cat.id" class="shop__filter-item">
                  <input v-model="selectedCategories" type="checkbox" :value="cat.id" class="shop__checkbox">
                  <span class="shop__filter-label">{{ categoryDisplayTitle(cat) }}</span>
                </label>
              </div>
            </div>

            <div class="shop__filter-section">
              <StorefrontPriceRangeFilter
              v-model:min-price="minPriceInput"
              v-model:max-price="maxPriceInput"
              :min-bound="priceRange.min"
              :max-bound="priceRange.max"
              :step="1"
            />
            </div>
          </div>

          <div class="shop__drawer-footer">
            <button class="at-btn-solid" @click="isFilterDrawerOpen = false">
              {{ storefrontContent.shop.showResults(filteredProducts.length) }}
            </button>
          </div>
        </aside>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.shop { min-height: 100vh; }

.shop__header {
  border-bottom: 1px solid var(--at-border);
  padding: clamp(48px, 8vw, 96px) clamp(20px, 5vw, 80px) clamp(32px, 5vw, 56px);
}
.shop__header-inner { max-width: 1400px; margin: 0 auto; }
.shop__title {
  font-family: var(--at-f-display);
  font-size: clamp(3rem, 6vw, 5.5rem);
  font-weight: 600;
  letter-spacing: -0.03em;
  color: var(--at-cream);
  margin-top: 10px;
  line-height: 1.0;
}

.shop__body {
  max-width: 1400px;
  margin: 0 auto;
  padding: clamp(24px, 4vw, 48px) clamp(20px, 5vw, 80px);
}

.shop__filter-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--at-surface);
  border: 1px solid var(--at-border);
  border-radius: var(--at-r-pill);
  box-shadow: var(--at-shadow-xs);
  color: var(--at-sub);
  font-family: var(--at-f-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 11px 18px;
  cursor: pointer;
  margin-bottom: 24px;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}
.shop__filter-toggle:hover { border-color: var(--at-gold); color: var(--at-gold-700); background: var(--at-surface-2); }
@media (min-width: 1024px) { .shop__filter-toggle { display: none; } }

.shop__filter-count {
  background: var(--at-grad-green);
  color: #FFFBF0;
  font-size: 8px;
  padding: 2px 7px;
  border-radius: var(--at-r-pill);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.shop__layout {
  display: flex;
  gap: 40px;
}

/* Sidebar */
.shop__sidebar {
  display: none;
  width: 200px;
  flex-shrink: 0;
  position: sticky;
  top: 80px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  padding-right: 8px;
}
@media (min-width: 1024px) { .shop__sidebar { display: block; } }

.shop__sidebar::-webkit-scrollbar {
  width: 4px;
}

.shop__sidebar::-webkit-scrollbar-thumb {
  background: var(--at-border-2);
  border-radius: 999px;
}

.shop__sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--at-border);
}
.shop__reset-btn {
  background: none;
  border: none;
  font-family: var(--at-f-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--at-gold-700);
  cursor: pointer;
  padding: 0;
  transition: opacity 0.2s;
}
.shop__reset-btn:hover { opacity: 0.7; }

.shop__filter-section { margin-bottom: 28px; }
.shop__filter-title {
  font-family: var(--at-f-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--at-sub);
  margin-bottom: 14px;
}
.shop__filter-list { display: flex; flex-direction: column; gap: 10px; }
.shop__filter-item {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.shop__checkbox {
  width: 15px;
  height: 15px;
  border: 1px solid var(--at-border-2);
  border-radius: 4px;
  background: var(--at-surface);
  appearance: none;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
  position: relative;
}
.shop__checkbox:hover { border-color: var(--at-gold); }
.shop__checkbox:checked {
  background: var(--at-cream);
  border-color: var(--at-cream);
  box-shadow: var(--at-shadow-xs);
}
.shop__checkbox:checked::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 5px;
  width: 4px;
  height: 7px;
  border: 1.5px solid #FFFBF0;
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}
.shop__filter-label {
  font-family: var(--at-f-mono);
  font-size: 11px;
  color: var(--at-sub);
  transition: color 0.15s;
}
.shop__filter-item:hover .shop__filter-label { color: var(--at-text); }

.shop__price-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}
.shop__price-input { padding: 8px 10px; font-size: 11px; }
.shop__price-sep {
  font-family: var(--at-f-mono);
  font-size: 10px;
  color: var(--at-muted);
  flex-shrink: 0;
}

/* Main */
.shop__main { flex: 1; min-width: 0; }

.shop__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.shop__active-filters { display: flex; flex-wrap: wrap; gap: 8px; }
.shop__active-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border: 1px solid var(--at-border);
  border-radius: var(--at-r-pill);
  background: var(--at-surface-2);
  font-family: var(--at-f-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--at-sub);
}
.shop__active-tag-remove {
  background: none;
  border: none;
  color: var(--at-muted);
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
  display: flex;
}
.shop__active-tag-remove:hover { color: var(--at-skin); }

.shop__toolbar-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.shop__search-wrap { position: relative; }
.shop__search { padding-right: 32px; font-size: 11px; min-width: 180px; }
.shop__search-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--at-muted);
  pointer-events: none;
}
.shop__sort-wrap { position: relative; }
.shop__sort { font-size: 9px; letter-spacing: 0; text-transform: uppercase; min-width: 140px; }
.shop__sort option { text-transform: none; font-size: 12px; }
.shop__sort-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--at-muted);
  pointer-events: none;
}

.shop__count {
  font-family: var(--at-f-mono);
  font-size: 9px;
  letter-spacing: 0;
  text-transform: uppercase;
  color: var(--at-muted);
  margin-bottom: 20px;
}

.shop__empty {
  border: 1px solid var(--at-border);
  border-radius: var(--at-r-lg);
  background: var(--at-grad-paper);
  box-shadow: var(--at-shadow-sm);
  padding: clamp(48px, 8vw, 96px) 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.shop__empty-icon { color: var(--at-muted); margin-bottom: 8px; }
.shop__empty-title {
  font-family: var(--at-f-display);
  font-size: 1.6rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--at-cream);
}
.shop__empty-sub {
  font-family: var(--at-f-mono);
  font-size: 11px;
  color: var(--at-sub);
  margin-bottom: 8px;
}

.shop__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: clamp(12px, 1.6vw, 20px);
}
@media (min-width: 768px) { .shop__grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 1280px) { .shop__grid { grid-template-columns: repeat(4, 1fr); } }

/* Drawer */
.shop__overlay {
  position: fixed;
  inset: 0;
  background: rgba(28,35,24,0.44);
  backdrop-filter: blur(3px);
  z-index: 60;
}
.shop__drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(320px, 90vw);
  background: var(--at-grad-paper);
  border-left: 1px solid var(--at-border);
  box-shadow: var(--at-shadow-lg);
  z-index: 61;
  display: flex;
  flex-direction: column;
}
.shop__drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--at-border);
  background: var(--at-grad-shell);
}
.shop__drawer-close {
  background: none;
  border: none;
  color: var(--at-sub);
  cursor: pointer;
  padding: 4px;
  transition: color 0.2s;
}
.shop__drawer-close:hover { color: var(--at-gold); }
.shop__drawer-body { flex: 1; overflow-y: auto; padding: 24px; }
.shop__drawer-footer { padding: 16px 24px; border-top: 1px solid var(--at-border); }

.overlay-enter-active, .overlay-leave-active { transition: opacity 0.25s; }
.overlay-enter-from, .overlay-leave-to { opacity: 0; }
.drawer-right-enter-active, .drawer-right-leave-active { transition: transform 0.3s cubic-bezier(0.76, 0, 0.24, 1); }
.drawer-right-enter-from, .drawer-right-leave-to { transform: translateX(100%); }
</style>
