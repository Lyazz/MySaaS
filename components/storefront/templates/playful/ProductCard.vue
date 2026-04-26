<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

interface Product {
  id: string
  title: string
  slug: string
  price: number | string
  stock: number
  isActive: boolean
  images?: string[]
  description?: string
  isPromotionActive?: boolean
  promotionalPrice?: number | string | null
  promotionStartDate?: string | Date | null
  promotionEndDate?: string | Date | null
  showCountdown?: boolean
  bundleDeals?: any[]
}

const props = defineProps<{
  product: Product
  viewMode?: 'grid' | 'list'
}>()

defineEmits(['quick-view'])

const cartStore = useCartStore()
const requireVariantSelectionBeforeQuickAdd = useProductCardVariantGuard()
const storeSettings = useState<any>('storeSettings')
const { currencyCode } = useCurrency()
const storefrontContent = useStorefrontContent()

const mainImage = computed(() => {
    if (props.product.images && props.product.images.length > 0) return props.product.images[0]
    return '/blank.svg?v=2'
})

const isPromoValid = computed(() => {
    if (!props.product?.isPromotionActive) return false
    const now = new Date().getTime()
    if (props.product.promotionStartDate && new Date(props.product.promotionStartDate).getTime() > now) return false
    if (props.product.promotionEndDate && new Date(props.product.promotionEndDate).getTime() < now) return false
    return true
})

const displayPrice = computed(() =>
    (isPromoValid.value && props.product.promotionalPrice) ? Number(props.product.promotionalPrice) : Number(props.product.price)
)
const originalPrice = computed(() =>
    (isPromoValid.value && props.product.promotionalPrice) ? Number(props.product.price) : null
)

const LOW_STOCK_THRESHOLD = 5
const isOutOfStock = computed(() => Number(props.product.stock ?? 0) <= 0)
const isLowStock = computed(() => !isOutOfStock.value && Number(props.product.stock ?? 0) <= LOW_STOCK_THRESHOLD)

const showSuccess = ref(false)
const successTitle = ref('')
const successMessage = ref('')

const triggerSuccessToast = (title: string, message: string) => {
    successTitle.value = title
    successMessage.value = message
    showSuccess.value = true
    setTimeout(() => { showSuccess.value = false }, 3000)
}

async function handleAddToCart() {
  if (await requireVariantSelectionBeforeQuickAdd(props.product)) return
    cartStore.addItem({
        productId: props.product.id,
        title: props.product.title,
        slug: props.product.slug,
        price: displayPrice.value,
        bundleDeals: props.product.bundleDeals || [],
        stock: props.product.stock,
        image: mainImage.value,
        metaPixelIds: (props.product as any)?.metaPixelIds
    })
    triggerSuccessToast('Added to cart', 'Product added to your cart')
}
</script>

<template>
  <!-- List View -->
  <div
    v-if="viewMode === 'list'"
    class="group flex flex-row items-center gap-5 bg-white p-4 rounded-3xl border-3 border-violet-100 hover:border-violet-300 hover:shadow-[0_6px_0_0_#ddd6fe] transition-all duration-300"
  >
    <div class="relative w-28 h-28 flex-shrink-0 rounded-2xl overflow-hidden border-2 border-violet-100">
      <NuxtLink :to="`/product/${product.slug}`" class="block w-full h-full">
        <img :src="mainImage" :alt="product.title" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
      </NuxtLink>
      <div v-if="isPromoValid" class="absolute top-2 left-2 bg-pink-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full rotate-[-2deg]">
        -{{ Math.round(((Number(product.price) - Number(product.promotionalPrice)) / Number(product.price)) * 100) }}%
      </div>
    </div>

    <div class="flex-1 min-w-0">
      <NuxtLink :to="`/product/${product.slug}`">
        <h3 class="font-black text-stone-900 text-base leading-tight mb-1 group-hover:text-violet-700 transition-colors" style="font-family: 'Fredoka', sans-serif">{{ product.title }}</h3>
      </NuxtLink>
      <p class="text-sm text-stone-500 mb-3 line-clamp-1">{{ product.description || '' }}</p>
      <div class="flex items-center gap-3">
        <span class="text-lg font-black text-violet-700">{{ displayPrice.toLocaleString() }} <span class="text-xs font-bold text-stone-400">{{ currencyCode }}</span></span>
        <span v-if="originalPrice" class="text-xs text-stone-400 line-through">{{ originalPrice.toLocaleString() }} {{ currencyCode }}</span>
      </div>
    </div>

    <div class="flex flex-col gap-2 flex-shrink-0">
      <StorefrontSharedFavoriteButton
        :product-id="product.id"
        button-class="w-9 h-9 bg-violet-50 rounded-full flex items-center justify-center hover:bg-pink-50 hover:text-pink-500 border-2 border-violet-100 transition-colors"
        icon-class="w-4 h-4"
      />
      <button
        v-if="storeSettings?.cartEnabled !== false"
        :disabled="isOutOfStock || !product.isActive"
        class="w-9 h-9 bg-amber-400 rounded-full flex items-center justify-center text-amber-900 border-2 border-amber-300 shadow-[0_3px_0_0_#d97706] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        :title="storefrontContent.actions.addToCart"
        @click.prevent="handleAddToCart"
      >
        <Icon name="lucide:shopping-bag" class="w-4 h-4 stroke-[2.5]" />
      </button>
    </div>
  </div>

  <!-- Grid View -->
  <div v-else class="group relative flex flex-col w-full">
    <!-- Image area -->
    <div class="relative w-full aspect-[4/5] rounded-3xl overflow-hidden border-3 border-violet-100 bg-violet-50 shadow-[0_4px_0_0_#ddd6fe] group-hover:-translate-y-1 group-hover:shadow-[0_8px_0_0_#ddd6fe] transition-all duration-300">
      <NuxtLink :to="`/product/${product.slug}`" class="block w-full h-full">
        <img :src="mainImage" :alt="product.title" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108">
      </NuxtLink>

      <!-- Badges top-left -->
      <div class="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
        <span
          v-if="isPromoValid"
          class="px-2.5 py-1 bg-pink-500 text-white text-xs font-black rounded-xl shadow-sm rotate-[-2deg] border border-pink-400"
        >-{{ Math.round(((Number(product.price) - Number(product.promotionalPrice)) / Number(product.price)) * 100) }}%</span>
        <span
          v-if="isLowStock"
          class="px-2.5 py-1 bg-amber-400 text-amber-900 text-[10px] font-black rounded-xl shadow-sm rotate-[1deg] border border-amber-300"
        >Low stock</span>
        <span
          v-if="isOutOfStock"
          class="px-2.5 py-1 bg-stone-200 text-stone-600 text-[10px] font-black rounded-xl shadow-sm border border-stone-300"
        >Out of stock</span>
      </div>

      <!-- Action buttons top-right -->
      <div class="absolute top-3 right-3 flex flex-col gap-1.5 z-10 translate-x-10 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
        <StorefrontSharedFavoriteButton
          :product-id="product.id"
          button-class="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-pink-50 hover:text-pink-500 shadow-md border-2 border-violet-100 transition-colors"
          icon-class="w-3.5 h-3.5"
        />
        <button
          class="w-8 h-8 bg-white rounded-full flex items-center justify-center text-stone-600 hover:bg-violet-50 hover:text-violet-600 shadow-md border-2 border-violet-100 transition-colors"
          title="Quick View"
          @click.prevent="$emit('quick-view', product)"
        >
          <Icon name="lucide:eye" class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Countdown (inside image container — fixes DOM placement) -->
      <div v-if="product.showCountdown && product.promotionEndDate && isPromoValid" class="absolute bottom-0 inset-x-0 z-20 flex justify-center bg-gradient-to-t from-black/60 via-black/20 to-transparent pt-8 pb-3 pointer-events-none">
        <div class="scale-[0.85] origin-bottom">
          <StorefrontSharedCountdownTimer :end-date="product.promotionEndDate" theme="danger" :show-icon="true" />
        </div>
      </div>
    </div>

    <!-- Details card — overlaps image bottom -->
    <div class="-mt-6 mx-2 bg-white rounded-3xl border-3 border-violet-100 px-4 pt-4 pb-4 shadow-sm z-10 flex flex-col gap-3">
      <NuxtLink :to="`/product/${product.slug}`">
        <h3 class="font-black text-stone-900 text-sm leading-snug line-clamp-2 group-hover:text-violet-700 transition-colors" style="font-family: 'Fredoka', sans-serif">{{ product.title }}</h3>
      </NuxtLink>

      <div class="flex items-center justify-between">
        <div class="flex flex-col">
          <span class="text-base font-black text-violet-700">{{ displayPrice.toLocaleString() }} <span class="text-xs font-bold text-stone-400">{{ currencyCode }}</span></span>
          <span v-if="originalPrice" class="text-xs text-stone-400 line-through">{{ originalPrice.toLocaleString() }} {{ currencyCode }}</span>
        </div>

        <!-- Add to cart stamp button -->
        <button
          v-if="storeSettings?.cartEnabled !== false"
          :disabled="isOutOfStock || !product.isActive"
          class="w-11 h-11 bg-amber-400 rounded-full flex items-center justify-center text-amber-900 border-2 border-amber-300 shadow-[0_4px_0_0_#d97706] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0"
          :title="storefrontContent.actions.addToCart"
          @click.prevent="handleAddToCart"
        >
          <Icon name="lucide:shopping-bag" class="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>

    <!-- Success Toast -->
    <Transition
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showSuccess"
        class="fixed bottom-4 right-4 z-50 bg-stone-900 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border border-stone-700/50"
      >
        <div class="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
          <Icon name="lucide:check" class="w-4 h-4" />
        </div>
        <div>
          <div class="font-black text-sm">{{ successTitle }}</div>
          <div class="text-xs text-stone-400">{{ successMessage }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>
