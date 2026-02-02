<template>
  <div class="max-w-7xl mx-auto">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-[calc(100vh-10rem)] lg:overflow-hidden">
      <!-- Catalog -->
      <section class="lg:col-span-7 flex flex-col min-h-0">
        <div class="bg-white rounded-lg shadow p-4 mb-4">
          <div class="flex flex-col md:flex-row md:items-end gap-4">
            <div class="flex-1 min-w-0">
              <label class="block text-sm font-medium text-gray-700 mb-1">Search (name / SKU / barcode)</label>
              <BaseInput v-model="productSearch" placeholder="Search by name, SKU, barcode..." />
            </div>
            <div class="md:w-64">
              <BaseSelect v-model="selectedCategoryId" label="Category">
                <option value="">All Categories</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                  {{ cat.title }}
                </option>
              </BaseSelect>
            </div>
            <div class="flex md:justify-end">
              <div class="flex items-center gap-2">
                <button
                  v-if="productsView === 'grid'"
                  class="h-10 px-3 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium"
                  title="Products per row"
                  @click="cycleProductsPerRow"
                >
                  {{ productsPerRow }}/row
                </button>
                <div class="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white p-1">
                <button
                  class="h-10 w-10 rounded-md grid place-items-center"
                  :class="productsView === 'list' ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50'"
                  title="List view"
                  @click="productsView = 'list'"
                >
                  <Icon name="lucide:list" class="w-4 h-4" />
                </button>
                <button
                  class="h-10 w-10 rounded-md grid place-items-center"
                  :class="productsView === 'grid' ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50'"
                  title="Grid view"
                  @click="productsView = 'grid'"
                >
                  <Icon name="lucide:grid-2x2" class="w-4 h-4" />
                </button>
              </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto pr-1">
          <div v-if="loadingProducts" class="bg-white rounded-lg shadow p-12 text-center">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
            <p class="mt-2 text-gray-600">Loading products...</p>
          </div>

          <div v-else-if="filteredProducts.length === 0" class="bg-white rounded-lg shadow p-12 text-center">
            <Icon name="lucide:package-search" class="mx-auto h-12 w-12 text-gray-400" />
            <h3 class="mt-2 text-sm font-medium text-gray-900">No products found</h3>
            <p class="mt-1 text-sm text-gray-500">Try adjusting your filters.</p>
          </div>

          <div
            v-else-if="productsView === 'grid'"
            class="grid grid-cols-2 sm:grid-cols-3 gap-4"
            :class="productsPerRow === 3 ? 'lg:grid-cols-3' : productsPerRow === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-5'"
          >
            <button
              v-for="product in filteredProducts"
              :key="product.id"
              class="text-left bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-transparent hover:border-teal-200"
              @click="handleAddProduct(product)"
            >
              <div class="p-3">
                <div class="aspect-square w-full bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
                  <img
                    v-if="getProductMainImage(product)"
                    :src="getProductMainImage(product)"
                    :alt="product.title"
                    class="h-full w-full object-cover"
                  >
                  <Icon v-else name="lucide:image" class="w-8 h-8 text-gray-400" />
                </div>
                <div class="mt-3">
                  <div class="text-sm font-semibold text-gray-900 truncate" :title="product.title">
                    {{ product.title }}
                  </div>
                  <div class="mt-2 flex items-center justify-between gap-2">
                    <div class="text-sm font-semibold text-gray-900">
                      {{ formatCurrency(product.price) }}
                    </div>
                    <span
                      class="text-xs px-2 py-0.5 rounded-full"
                      :class="product.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'"
                    >
                      {{ product.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </div>

          <div v-else class="bg-white rounded-lg shadow divide-y divide-gray-100">
            <button
              v-for="product in filteredProducts"
              :key="product.id"
              class="w-full text-left p-3 flex items-center gap-3 hover:bg-gray-50"
              @click="handleAddProduct(product)"
            >
              <div class="h-12 w-12 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center shrink-0">
                <img
                  v-if="getProductMainImage(product)"
                  :src="getProductMainImage(product)"
                  :alt="product.title"
                  class="h-full w-full object-cover"
                >
                <Icon v-else name="lucide:image" class="w-6 h-6 text-gray-400" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-sm font-semibold text-gray-900 truncate" :title="product.title">
                  {{ product.title }}
                </div>
                <div class="text-xs text-gray-600 mt-0.5">
                  {{ formatCurrency(product.price) }}
                </div>
              </div>
            </button>
          </div>
        </div>
      </section>

      <!-- Cart / Checkout -->
      <aside class="lg:col-span-5 flex flex-col min-h-0">
        <div class="bg-white rounded-lg shadow p-3 flex flex-col min-h-0">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-3">
              <h3 class="text-lg font-semibold text-gray-900">Cart</h3>
              <span class="text-sm text-gray-500">{{ cartCount }} items</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white p-1">
                <button
                  class="h-8 w-8 rounded-md grid place-items-center"
                  :class="cartView === 'compact' ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50'"
                  title="Compact"
                  @click="cartView = 'compact'"
                >
                  <Icon name="lucide:align-left" class="w-4 h-4" />
                </button>
                <button
                  class="h-8 w-8 rounded-md grid place-items-center"
                  :class="cartView === 'detailed' ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50'"
                  title="Detailed"
                  @click="cartView = 'detailed'"
                >
                  <Icon name="lucide:layout-template" class="w-4 h-4" />
                </button>
              </div>
              <button
                class="h-9 w-9 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 grid place-items-center"
                :disabled="cartItems.length === 0"
                title="Clear cart"
                @click="clearCart"
              >
                <Icon name="lucide:trash" class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div class="flex-1 min-h-0">
            <div v-if="cartItems.length === 0" class="border border-dashed border-gray-200 rounded-lg p-4 text-center">
              <Icon name="lucide:shopping-basket" class="mx-auto h-10 w-10 text-gray-400" />
              <p class="mt-2 text-sm text-gray-600">Add products to start a sale.</p>
            </div>

            <div v-else class="min-h-0 overflow-auto pr-1">
              <div v-if="cartView === 'compact'" class="space-y-2">
                <div
                  v-for="item in cartItems"
                  :key="item.key"
                  class="border border-gray-100 rounded-lg px-3 py-2"
                >
                  <div class="flex items-center gap-2">
                    <div class="min-w-0 flex-1">
                      <div class="text-sm font-semibold text-gray-900 truncate" :title="item.variantLabel ? `${item.title} — ${item.variantLabel}` : item.title">
                        {{ item.title }}
                      </div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                      <button
                        class="h-7 w-7 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
                        @click="decrementQty(item.key)"
                      >
                        <Icon name="lucide:minus" class="w-4 h-4 mx-auto" />
                      </button>
                      <div class="w-8 text-center text-sm font-medium text-gray-900">
                        {{ item.quantity }}
                      </div>
                      <button
                        class="h-7 w-7 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
                        @click="incrementQty(item.key)"
                      >
                        <Icon name="lucide:plus" class="w-4 h-4 mx-auto" />
                      </button>
                    </div>
                    <div class="text-sm font-semibold text-gray-900 w-20 text-right shrink-0">
                      {{ formatCurrency(item.price * item.quantity) }}
                    </div>
                    <button class="text-gray-400 hover:text-red-600 shrink-0" title="Remove" @click="removeFromCart(item.key)">
                      <Icon name="lucide:trash-2" class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="item in cartItems"
                  :key="item.key"
                  class="border border-gray-100 rounded-lg p-3"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="h-10 w-10 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center shrink-0">
                        <img
                          v-if="item.imageUrl"
                          :src="item.imageUrl"
                          :alt="item.title"
                          class="h-full w-full object-cover"
                        >
                        <Icon v-else name="lucide:image" class="w-6 h-6 text-gray-400" />
                      </div>
                      <div class="min-w-0">
                        <div class="text-sm font-medium text-gray-900 truncate" :title="item.title">{{ item.title }}</div>
                        <div v-if="item.variantLabel" class="text-xs text-gray-500 truncate" :title="item.variantLabel">{{ item.variantLabel }}</div>
                        <div class="text-sm font-semibold text-gray-900 mt-1">{{ formatCurrency(item.price) }}</div>
                      </div>
                    </div>
                    <button class="text-gray-400 hover:text-red-600" title="Remove" @click="removeFromCart(item.key)">
                      <Icon name="lucide:trash-2" class="w-4 h-4" />
                    </button>
                  </div>

                  <div class="mt-3 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <button
                        class="h-8 w-8 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
                        @click="decrementQty(item.key)"
                      >
                        <Icon name="lucide:minus" class="w-4 h-4 mx-auto" />
                      </button>
                      <div class="w-10 text-center text-sm font-medium text-gray-900">
                        {{ item.quantity }}
                      </div>
                      <button
                        class="h-8 w-8 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
                        @click="incrementQty(item.key)"
                      >
                        <Icon name="lucide:plus" class="w-4 h-4 mx-auto" />
                      </button>
                    </div>
                    <div class="text-sm font-semibold text-gray-900">
                      {{ formatCurrency(item.price * item.quantity) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-3 border-t border-gray-100 pt-3">
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-gray-900">Total</span>
              <span class="text-lg font-bold text-gray-900">{{ formatCurrency(cartSubtotal) }}</span>
            </div>
          </div>

          <div class="mt-3 border-t border-gray-100 pt-3 flex items-center gap-2">
            <span class="text-sm font-semibold text-gray-900 shrink-0">Client</span>
            <div class="flex-1 min-w-0">
              <BaseSelect v-model="selectedCustomerId" class="py-1.5 text-sm">
                <option value="">Guest</option>
                <option v-for="c in customers" :key="c.id" :value="c.id">
                  {{ c.name }} — {{ c.phone }}
                </option>
              </BaseSelect>
              <div v-if="loadingCustomers" class="text-xs text-gray-500 mt-1">Loading…</div>
            </div>
          </div>

          <div v-if="errorMessage" class="mt-4 text-sm text-red-600">
            {{ errorMessage }}
          </div>

          <div class="mt-3 flex items-center gap-2">
            <button
              class="flex-1 px-4 py-2.5 rounded-md border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!lastSaleId"
              @click="printLastSale"
            >
              Print last sale
            </button>
            <button
              class="flex-1 px-4 py-2.5 rounded-md text-white font-semibold transition-colors"
              :class="canCreateSale ? 'bg-teal-600 hover:bg-teal-700' : 'bg-gray-300 cursor-not-allowed'"
              :disabled="!canCreateSale || placingSale"
              @click="createSale"
            >
              <span v-if="placingSale">Creating…</span>
              <span v-else>Create sale</span>
            </button>
          </div>
        </div>
      </aside>
    </div>

    <!-- Variant Picker Modal -->
    <div v-if="variantModal.open" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="closeVariantModal"></div>
      <div class="relative bg-white rounded-lg shadow-xl w-full max-w-xl mx-4">
        <div class="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500">Select variant</div>
            <div class="text-base font-semibold text-gray-900">{{ variantModal.productTitle }}</div>
          </div>
          <button class="p-2 rounded-md hover:bg-gray-50" @click="closeVariantModal">
            <Icon name="lucide:x" class="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div class="p-4">
          <div v-if="variantModal.loading" class="p-6 text-center text-sm text-gray-600">
            Loading variants…
          </div>
          <div v-else class="space-y-2 max-h-[60vh] overflow-auto pr-1">
            <button
              v-for="v in variantModal.variants"
              :key="v.id"
              class="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-teal-200 hover:bg-teal-50/30"
              @click="addVariantToCart(variantModal.productId, variantModal.productTitle, v)"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <div class="text-sm font-medium text-gray-900 truncate">{{ v.label }}</div>
                  <div class="text-xs text-gray-500">{{ v.trackInventory ? `Stock: ${v.availableStock}` : 'Inventory not tracked' }}</div>
                </div>
                <div class="text-sm font-semibold text-gray-900">
                  {{ formatCurrency(v.price) }}
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import BaseInput from '~/components/ui/BaseInput.vue'
import BaseSelect from '~/components/ui/BaseSelect.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'POS'
})

const authStore = useAuthStore()
const { format: formatCurrency } = useCurrency()
const router = useRouter()

interface Category {
  id: string
  title: string
}

interface ProductListRow {
  id: string
  title: string
  slug: string
  price: number
  stock: number
  isActive: boolean
  options?: Array<any>
  variants?: Array<{ id: string; sku?: string | null }>
  images?: string[]
  productImages?: Array<{ id: string; url: string; isMain: boolean; position: number }>
  category?: { id: string; title: string }
}

type CustomerSummary = {
  id: string
  name: string
  phone: string
}

type CartItem = {
  key: string
  productId: string
  variantId?: string | null
  title: string
  variantLabel?: string
  imageUrl?: string
  price: number
  quantity: number
}

const categories = ref<Category[]>([])
const products = ref<ProductListRow[]>([])
const loadingProducts = ref(true)

const productSearch = ref('')
const selectedCategoryId = ref('')

const cart = ref<Record<string, CartItem>>({})
const placingSale = ref(false)
const errorMessage = ref<string | null>(null)
const lastSaleId = ref<string | null>(null)
const scanning = ref(false)

const productsView = ref<'list' | 'grid'>('list')
const cartView = ref<'compact' | 'detailed'>('compact')
const productsPerRow = ref<3 | 4 | 5>(4)

const customers = ref<CustomerSummary[]>([])
const loadingCustomers = ref(false)
const selectedCustomerId = ref('')

const variantModal = reactive({
  open: false,
  loading: false,
  productId: '' as string,
  productTitle: '' as string,
  variants: [] as Array<{ id: string; label: string; price: number; trackInventory: boolean; availableStock: number }>,
  productPriceFallback: 0,
  productImageFallback: '' as string
})

const getProductMainImage = (product: ProductListRow): string | undefined => {
  if (product.productImages && product.productImages.length > 0) {
    const main = product.productImages.find(i => i.isMain)
    return main ? main.url : product.productImages[0].url
  }
  if (product.images && product.images.length > 0) return product.images[0]
  return undefined
}

const filteredProducts = computed(() => {
  const q = productSearch.value.trim().toLowerCase()
  return products.value
    .filter(p => p.isActive)
    .filter(p => (selectedCategoryId.value ? p.category?.id === selectedCategoryId.value : true))
    .filter(p => {
      if (!q) return true
      const byName = p.title.toLowerCase().includes(q)
      const bySlug = p.slug.toLowerCase().includes(q)
      const bySku = Array.isArray(p.variants) ? p.variants.some(v => (v?.sku || '').toLowerCase().includes(q)) : false
      return byName || bySlug || bySku
    })
})

const cartItems = computed(() => Object.values(cart.value))
const cartSubtotal = computed(() => cartItems.value.reduce((sum, i) => sum + i.price * i.quantity, 0))
const cartCount = computed(() => cartItems.value.reduce((sum, i) => sum + i.quantity, 0))

const canCreateSale = computed(() => cartItems.value.length > 0)

async function fetchCategories() {
  try {
    categories.value = await $fetch<Category[]>('/api/admin/categories', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
  } catch (e) {
    console.error('Failed to fetch categories', e)
  }
}

async function fetchProducts() {
  loadingProducts.value = true
  try {
    products.value = await $fetch<ProductListRow[]>('/api/admin/products', {
      headers: { Authorization: `Bearer ${authStore.token}` },
      query: { sortBy: 'createdAt', sortOrder: 'desc' }
    })
  } catch (e) {
    console.error('Failed to fetch products', e)
  } finally {
    loadingProducts.value = false
  }
}

async function fetchCustomers() {
  loadingCustomers.value = true
  try {
    customers.value = await $fetch<any[]>('/api/admin/customers', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
  } catch (e) {
    console.error('Failed to fetch customers', e)
    customers.value = []
  } finally {
    loadingCustomers.value = false
  }
}

function cycleProductsPerRow() {
  productsPerRow.value = productsPerRow.value === 3 ? 4 : productsPerRow.value === 4 ? 5 : 3
}

async function lookupAndAddByCode(code: string) {
  const normalized = String(code || '').trim()
  if (!normalized) return
  if (scanning.value) return
  scanning.value = true
  errorMessage.value = null

  try {
    const found = await $fetch<any>('/api/admin/pos/lookup', {
      headers: { Authorization: `Bearer ${authStore.token}` },
      query: { code: normalized }
    })

    const key = `${found.productId}:${found.variantId}`
    upsertCartItem(
      {
        key,
        productId: found.productId,
        variantId: found.variantId,
        title: found.title,
        variantLabel: found.variantLabel || undefined,
        imageUrl: found.imageUrl || undefined,
        price: Number(found.price || 0)
      },
      1
    )
  } catch (e: any) {
    const status = e?.status || e?.response?.status
    if (status === 404) {
      errorMessage.value = `No product found for: ${normalized}`
    } else {
      const msg = e?.data?.statusMessage || e?.data?.message || e?.message || 'Lookup failed'
      errorMessage.value = String(msg)
    }
  } finally {
    scanning.value = false
  }
}

function upsertCartItem(next: Omit<CartItem, 'quantity'>, quantityDelta: number) {
  const existing = cart.value[next.key]
  if (!existing) {
    cart.value[next.key] = { ...next, quantity: Math.max(1, quantityDelta) }
    return
  }
  const nextQty = existing.quantity + quantityDelta
  if (nextQty <= 0) {
    delete cart.value[next.key]
    return
  }
  cart.value[next.key] = { ...existing, quantity: nextQty }
}

function incrementQty(key: string) {
  const item = cart.value[key]
  if (!item) return
  cart.value[key] = { ...item, quantity: item.quantity + 1 }
}

function decrementQty(key: string) {
  const item = cart.value[key]
  if (!item) return
  const nextQty = item.quantity - 1
  if (nextQty <= 0) delete cart.value[key]
  else cart.value[key] = { ...item, quantity: nextQty }
}

function removeFromCart(key: string) {
  delete cart.value[key]
}

function clearCart() {
  cart.value = {}
  errorMessage.value = null
}

async function handleAddProduct(product: ProductListRow) {
  errorMessage.value = null

  if ((product.options?.length ?? 0) > 0) {
    await openVariantModal(product)
    return
  }

  const key = `${product.id}:default`
  upsertCartItem(
    {
      key,
      productId: product.id,
      variantId: null,
      title: product.title,
      variantLabel: undefined,
      imageUrl: getProductMainImage(product),
      price: Number(product.price || 0)
    },
    1
  )
}

function closeVariantModal() {
  variantModal.open = false
  variantModal.loading = false
  variantModal.productId = ''
  variantModal.productTitle = ''
  variantModal.variants = []
  variantModal.productPriceFallback = 0
}

async function openVariantModal(product: ProductListRow) {
  variantModal.open = true
  variantModal.loading = true
  variantModal.productId = product.id
  variantModal.productTitle = product.title
  variantModal.productPriceFallback = Number(product.price || 0)
  variantModal.productImageFallback = getProductMainImage(product) || ''
  variantModal.variants = []

  try {
    const full = await $fetch<any>(`/api/admin/products/${product.id}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })

    const variants = (full?.variants ?? []).filter((v: any) => v?.isActive !== false)
    variantModal.variants = variants.map((v: any) => {
      const labels = Array.isArray(v?.optionValues)
        ? v.optionValues.map((ov: any) => ov?.optionValue?.label).filter(Boolean)
        : []
      const label = labels.length > 0 ? labels.join(' / ') : 'Default'
      const stock = Number(v?.stock ?? 0)
      const reserved = Number(v?.reserved ?? 0)
      const safety = Number(v?.safetyStock ?? 0)
      const trackInventory = v?.trackInventory !== false
      const availableStock = trackInventory ? Math.max(stock - reserved - safety, 0) : Number.POSITIVE_INFINITY
      return {
        id: v.id,
        label,
        price: Number(v?.price ?? variantModal.productPriceFallback),
        trackInventory,
        availableStock
      }
    })
  } catch (e) {
    console.error('Failed to load product variants', e)
    variantModal.variants = []
  } finally {
    variantModal.loading = false
  }
}

function addVariantToCart(productId: string, productTitle: string, variant: { id: string; label: string; price: number }) {
  const key = `${productId}:${variant.id}`
  upsertCartItem(
    {
      key,
      productId,
      variantId: variant.id,
      title: productTitle,
      variantLabel: variant.label,
      imageUrl: variantModal.productImageFallback || undefined,
      price: Number(variant.price || 0)
    },
    1
  )
  closeVariantModal()
}

async function createSale() {
  if (!canCreateSale.value) return
  placingSale.value = true
  errorMessage.value = null

  try {
    const payload: any = {
      items: cartItems.value.map(i => ({
        productId: i.productId,
        variantId: i.variantId ?? null,
        quantity: i.quantity
      })),
      customerId: selectedCustomerId.value || null
    }

    const res = await $fetch<{ saleId: string } & any>('/api/admin/pos/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: payload
    })

    clearCart()
    selectedCustomerId.value = ''

    if (res?.saleId) {
      lastSaleId.value = res.saleId
      if (process.client) {
        try { localStorage.setItem('pos:lastSaleId', res.saleId) } catch {}
      }
      await router.push(`/admin/sales/${res.saleId}`)
    }
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.data?.message || e?.message || 'Failed to create sale'
    errorMessage.value = String(msg)
  } finally {
    placingSale.value = false
  }
}

function printLastSale() {
  const id = lastSaleId.value
  if (!id) return
  if (process.client) {
    window.open(`/admin/sales/${id}?print=1`, '_blank', 'noopener,noreferrer')
  }
}

let barcodeKeydownHandler: ((e: KeyboardEvent) => void) | null = null

onMounted(async () => {
  await Promise.all([fetchCategories(), fetchProducts(), fetchCustomers()])

  if (process.client) {
    try {
      lastSaleId.value = localStorage.getItem('pos:lastSaleId')
    } catch {}
  }

  let buffer = ''
  let lastAt = 0
  let startAt = 0

  barcodeKeydownHandler = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (e.key === 'Shift' || e.key === 'CapsLock' || e.key === 'Tab') return

    const now = Date.now()
    if (!lastAt || now - lastAt > 120) {
      buffer = ''
      startAt = now
    }
    lastAt = now

    if (e.key === 'Enter') {
      const duration = now - startAt
      const code = buffer.trim()
      buffer = ''
      startAt = now

      if (code.length >= 4 && duration <= 1200) {
        e.preventDefault()
        const el = document.activeElement as any
        if (el && typeof el.value === 'string' && el.value === code) {
          el.value = ''
          el.dispatchEvent(new Event('input', { bubbles: true }))
        }
        lookupAndAddByCode(code)
      }
      return
    }

    if (e.key.length === 1) {
      buffer += e.key
    }
  }

  window.addEventListener('keydown', barcodeKeydownHandler)
})

onUnmounted(() => {
  if (!process.client) return
  if (!barcodeKeydownHandler) return
  window.removeEventListener('keydown', barcodeKeydownHandler)
  barcodeKeydownHandler = null
})
</script>
