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
  isClearance?: boolean
}

const props = defineProps<{
  product: Product,
  viewMode?: 'grid' | 'list'
}>()

defineEmits(['quick-view'])

const cartStore = useCartStore()
const requireVariantSelectionBeforeQuickAdd = useProductCardVariantGuard()
const storeSettings = useState<any>('storeSettings')
const { currencyCode, formatAmount } = useCurrency()
const storefrontContent = useStorefrontContent()

const mainImage = computed(() => {
    if (props.product.images && props.product.images.length > 0) {
        return props.product.images[0]
    }
    return '/blank.svg?v=2'
})

const isPromoValid = computed(() => {
    if (!props.product?.isPromotionActive) return false
    const now = new Date().getTime()
    if (props.product.promotionStartDate && new Date(props.product.promotionStartDate).getTime() > now) return false
    if (props.product.promotionEndDate && new Date(props.product.promotionEndDate).getTime() < now) return false
    return true
})

const displayPrice = computed(() => {
    return (isPromoValid.value && props.product.promotionalPrice) ? Number(props.product.promotionalPrice) : Number(props.product.price)
})

const originalPrice = computed(() => {
    return (isPromoValid.value && props.product.promotionalPrice) ? Number(props.product.price) : null
})

const LOW_STOCK_THRESHOLD = 5
const isOutOfStock = computed(() => Number(props.product.stock ?? 0) <= 0)
const isLowStock = computed(() => !isOutOfStock.value && Number(props.product.stock ?? 0) <= LOW_STOCK_THRESHOLD)
const discountPercent = computed(() => {
  if (!isPromoValid.value || !props.product.promotionalPrice) return null
  const price = Number(props.product.price)
  const promotionalPrice = Number(props.product.promotionalPrice)
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(promotionalPrice)) return null
  return Math.max(0, Math.round(((price - promotionalPrice) / price) * 100))
})

const { t } = useI18n({ useScope: 'global' })
const clearance = useClearanceDiscount()
const isClearanceEligible = computed(() => clearance.isProductEligible(props.product))

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
    isClearance: Boolean(props.product?.isClearance),
    stock: props.product.stock,
    image: mainImage.value,
    metaPixelIds: (props.product as any)?.metaPixelIds
  })
  triggerSuccessToast('Added to cart', 'Product added to your cart')
}
</script>

<template>
  <div
    class="group relative"
    :class="[
      viewMode === 'list'
        ? 'flex flex-row items-stretch gap-5 bg-[#0b0f14] border border-white/[0.06] p-3 hover:border-brand-500/40 transition-colors'
        : 'flex flex-col bg-[#0b0f14] border border-white/[0.06] hover:border-brand-500/50 transition-all duration-300 hover:shadow-[0_0_40px_rgba(0,184,252,0.12)]'
    ]"
  >
    <!-- Cyan corner brackets (HUD) -->
    <span v-if="viewMode !== 'list'" class="pointer-events-none absolute top-0 start-0 w-3 h-3 border-t-2 border-s-2 border-brand-500 opacity-0 group-hover:opacity-100 transition-opacity" />
    <span v-if="viewMode !== 'list'" class="pointer-events-none absolute top-0 end-0 w-3 h-3 border-t-2 border-e-2 border-brand-500 opacity-0 group-hover:opacity-100 transition-opacity" />
    <span v-if="viewMode !== 'list'" class="pointer-events-none absolute bottom-0 start-0 w-3 h-3 border-b-2 border-s-2 border-brand-500 opacity-0 group-hover:opacity-100 transition-opacity" />
    <span v-if="viewMode !== 'list'" class="pointer-events-none absolute bottom-0 end-0 w-3 h-3 border-b-2 border-e-2 border-brand-500 opacity-0 group-hover:opacity-100 transition-opacity" />

    <!-- Image area -->
    <div
      class="relative overflow-hidden bg-[#04060a]"
      :class="[viewMode === 'list' ? 'w-44 flex-shrink-0' : 'aspect-square']"
    >
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(0,184,252,0.10),transparent_50%)]" />

      <NuxtLink :to="`/product/${product.slug}`" class="relative z-10 block h-full w-full">
        <img
          :src="mainImage"
          :alt="product.title"
          class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </NuxtLink>

      <!-- Stock / discount pills -->
      <div class="absolute top-3 start-3 z-20 flex flex-col gap-1.5">
        <span
          v-if="discountPercent"
          class="bg-brand-500 text-[#02060a] text-[9px] font-black uppercase tracking-[0.22em] px-2 py-1 [clip-path:polygon(8%_0,100%_0,92%_100%,0_100%)]"
        >-{{ discountPercent }}%</span>
        <span
          v-if="isClearanceEligible"
          class="bg-amber-600 text-white text-[9px] font-black uppercase tracking-[0.22em] px-2 py-1 [clip-path:polygon(8%_0,100%_0,92%_100%,0_100%)]"
        >{{ t('storefront.clearance.badge') }}</span>
        <span
          v-if="isOutOfStock"
          class="bg-rose-500 text-white text-[9px] font-black uppercase tracking-[0.22em] px-2 py-1"
        >Out of Stock</span>
        <span
          v-else-if="isLowStock"
          class="bg-amber-400 text-black text-[9px] font-black uppercase tracking-[0.22em] px-2 py-1"
        >Low Stock</span>
      </div>

      <!-- Hover action stack (desktop reveal) -->
      <div class="absolute end-3 top-3 z-20 flex flex-col gap-2 lg:opacity-0 lg:translate-x-2 lg:group-hover:opacity-100 lg:group-hover:translate-x-0 transition-all duration-300">
        <StorefrontSharedFavoriteButton
          :product-id="product.id"
          button-class="h-9 w-9 flex items-center justify-center bg-black/70 border border-white/15 text-white hover:border-brand-500 hover:text-brand-500 backdrop-blur transition-colors"
          icon-class="w-4 h-4"
        />
        <button
          class="h-9 w-9 flex items-center justify-center bg-black/70 border border-white/15 text-white hover:border-brand-500 hover:text-brand-500 backdrop-blur transition-colors"
          title="Quick View"
          @click.prevent="$emit('quick-view', product)"
        >
          <Icon name="lucide:eye" class="w-4 h-4" />
        </button>
      </div>

      <!-- Countdown -->
      <div v-if="product.showCountdown && product.promotionEndDate && isPromoValid" class="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/70 to-transparent pt-8 pb-3 flex justify-center">
        <StorefrontSharedCountdownTimer :end-date="product.promotionEndDate" theme="danger" :show-icon="true" />
      </div>

      <!-- Cyan bottom hairline on hover -->
      <div class="absolute inset-x-0 bottom-0 h-[2px] bg-brand-500 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500 z-20" />
    </div>

    <!-- Info area -->
    <div :class="[viewMode === 'list' ? 'flex-1 flex flex-col justify-center py-2 pe-3' : 'p-5']">
      <NuxtLink :to="`/product/${product.slug}`" class="block group/title">
        <h3
          class="font-black uppercase text-white tracking-[-0.01em] leading-tight group-hover/title:text-brand-500 transition-colors"
          :class="[viewMode === 'list' ? 'text-2xl mb-3' : 'text-base line-clamp-2 min-h-[2.5rem]']"
        >
          {{ product.title }}
        </h3>
      </NuxtLink>

      <p v-if="viewMode === 'list'" class="text-sm text-slate-400 mb-4 line-clamp-2 leading-relaxed">
        {{ product.description || storefrontContent.product.descriptionFallback }}
      </p>

      <div class="mt-3 flex flex-wrap items-end justify-between gap-3 pt-3 border-t border-white/[0.06]">
        <div>
          <div class="flex items-baseline gap-2">
            <span class="text-xl font-black text-white tracking-[-0.02em]">{{ formatAmount(displayPrice) }}</span>
            <span class="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-500">{{ currencyCode }}</span>
          </div>
          <span v-if="originalPrice" class="text-xs font-medium text-slate-600 line-through">{{ formatAmount(originalPrice) }}</span>
        </div>

        <button
          v-if="storeSettings?.cartEnabled !== false"
          :disabled="isOutOfStock || !product.isActive"
          class="inline-flex h-9 flex-shrink-0 whitespace-nowrap items-center gap-1.5 bg-brand-500 text-[#02060a] px-3 text-[10px] font-black uppercase tracking-[0.18em] hover:bg-white transition-colors disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed [clip-path:polygon(10%_0,100%_0,90%_100%,0_100%)]"
          @click.prevent="handleAddToCart"
        >
          <Icon name="lucide:plus" class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">{{ storefrontContent.actions.addToCart }}</span>
        </button>
      </div>
    </div>

    <!-- Toast -->
    <Transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showSuccess"
        class="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#0b0f14] border border-brand-500/40 px-5 py-3 text-white shadow-[0_0_40px_rgba(0,184,252,0.25)]"
      >
        <span class="flex items-center justify-center h-7 w-7 bg-brand-500 text-[#02060a]">
          <Icon name="lucide:check" class="w-4 h-4" />
        </span>
        <div>
          <div class="text-xs font-black uppercase tracking-[0.18em]">{{ successTitle }}</div>
          <div class="text-[11px] text-slate-400">{{ successMessage }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>
