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
}

const props = defineProps<{
  product: Product,
  viewMode?: 'grid' | 'list'
}>()

defineEmits(['quick-view'])

const cartStore = useCartStore()
const storeSettings = useState<any>('storeSettings')
const { currencyCode } = useCurrency()

const mainImage = computed(() => {
    if (props.product.images && props.product.images.length > 0) {
        return props.product.images[0]
    }
    return 'https://placehold.co/400x550'
})

// TODO: Replace with real discount logic when available in backend
const discount = 0 
const oldPrice = computed(() => {
    return null
    // const p = Number(props.product.price)
    // return Math.round(p * 1.33)
})

const isNew = computed(() => {
    // Logic for "New" badge, e.g. created within last 30 days
    // For now, random or based on ID if we had that info, defaulting to false or passed prop
    return false 
})

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

function handleAddToCart() {
  cartStore.addItem({
    productId: props.product.id,
    title: props.product.title,
    slug: props.product.slug,
    price: Number(props.product.price),
    stock: props.product.stock,
    image: mainImage.value
  })
  triggerSuccessToast('Added to cart', 'Product added to your cart')
}
</script>

<template>
  <div 
    class="group relative"
    :class="[
      viewMode === 'list' 
        ? 'flex flex-row items-center gap-6 bg-white p-4 border border-slate-100 transition-all duration-300' 
        : 'flex flex-col items-center'
    ]"
  >
    <!-- Image Card -->
    <div 
      class="relative overflow-hidden bg-gray-100"
      :class="[
        viewMode === 'list' 
          ? 'w-48 h-48 aspect-square flex-shrink-0' 
          : 'w-full aspect-[3/4] transition-all duration-300'
      ]"
    >
      <!-- Background Image -->
      <NuxtLink
        :to="`/p/${product.slug}`"
        class="block w-full h-full"
      >
        <img
          :src="mainImage"
          :alt="product.title"
          class="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-90"
        >
      </NuxtLink>
        
      <!-- Badges (Top Left) -->
      <div class="absolute top-3 left-3 flex flex-col gap-2 items-start z-10">
        <span
          v-if="isNew"
          class="px-2 py-0.5 bg-white text-slate-900 text-[10px] font-bold uppercase tracking-wider border border-slate-200"
        >New</span>
        <span
          v-if="discount > 0"
          class="px-2 py-0.5 bg-brand-600 text-white text-[10px] font-bold uppercase tracking-wider"
        >-{{ discount }}%</span>
      </div>

      <!-- Floating Actions (Right) -->
      <div 
        class="absolute top-3 right-3 flex flex-col gap-2 transition-all duration-300 z-10"
        :class="[
           viewMode === 'list' ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100'
        ]"
      >
        <!-- Quick View -->
        <button
           class="w-8 h-8 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-900 hover:text-white transition-colors" 
           title="Quick View"
           @click.prevent="$emit('quick-view', product)"
        >
            <Icon name="lucide:eye" class="w-4 h-4" />
        </button>

        <button
          v-if="storeSettings?.cartEnabled !== false"
          :disabled="isOutOfStock || !product.isActive"
          class="w-8 h-8 bg-white flex items-center justify-center text-slate-700 hover:bg-brand-600 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Add to Cart"
          @click.prevent="handleAddToCart"
        >
          <Icon name="lucide:shopping-bag" class="w-4 h-4" />
        </button>
      </div>

      <!-- Static In Stock Badge (Grid Only) -->
      <div
        v-if="product.stock > 0 && viewMode !== 'list'"
        class="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      >
        <span
          v-if="isLowStock"
          class="px-2 py-0.5 bg-amber-50 text-amber-900 text-[10px] font-bold uppercase tracking-wider border border-amber-200"
        >Low Stock</span>
      </div>

      <div
        v-if="isOutOfStock && viewMode !== 'list'"
        class="absolute bottom-0 left-0 w-full bg-white/90 py-2 text-center"
      >
        <span class="text-slate-900 text-xs font-bold uppercase tracking-widest">
          Out of Stock
        </span>
      </div>
    </div>

    <!-- Details -->
    <div 
      :class="[
        viewMode === 'list' 
          ? 'flex-1 text-left' 
          : 'mt-4 text-center w-full px-1'
      ]"
    >
      <NuxtLink
        :to="`/p/${product.slug}`"
        class="block group-hover:text-brand-600 transition-colors duration-200"
      >
        <h3 
          class="text-slate-900 leading-snug font-serif"
          :class="[ viewMode === 'list' ? 'text-xl mb-2' : 'text-lg truncate' ]"
        >
          {{ product.title }}
        </h3>
      </NuxtLink>

      <p v-if="viewMode === 'list'" class="text-sm text-slate-500 mb-4 line-clamp-2">
        {{ product.description || 'No description available for this product.' }}
      </p>

      <div 
        class="flex items-center gap-2" 
        :class="[ viewMode === 'list' ? '' : 'justify-center mt-2' ]"
      >
        <span class="text-base font-medium text-slate-600">{{ Number(product.price).toLocaleString() }} <span class="text-xs font-normal text-slate-500">{{ currencyCode }}</span></span>
        <span
          v-if="oldPrice"
          class="text-xs text-slate-400 line-through"
        >{{ oldPrice }} {{ currencyCode }}</span>
      </div>
      
      <!-- List View Extra Actions -->
       <div v-if="viewMode === 'list'" class="mt-4 flex gap-3">
          <button 
             v-if="storeSettings?.cartEnabled !== false"
             :disabled="product.stock === 0"
             class="px-6 py-2 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
             @click.prevent="handleAddToCart"
          >
             Add to Cart
          </button>
       </div>
    </div>
    
    <!-- Success Toast -->
    <Transition
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showSuccess"
        class="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-6 py-4 shadow-xl flex items-center gap-4 border border-slate-700"
      >
        <div class="w-6 h-6 flex items-center justify-center text-white shrink-0">
          <Icon name="lucide:check" class="w-5 h-5" />
        </div>
        <div>
          <div class="font-bold text-sm uppercase tracking-wider">{{ successTitle }}</div>
          <div class="text-xs text-slate-300">{{ successMessage }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>
