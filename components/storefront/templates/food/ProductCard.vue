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
        ? 'flex flex-row items-center gap-6 bg-white p-4 rounded-[2.5rem] border border-stone-100 hover:shadow-xl transition-all duration-500' 
        : 'flex flex-col'
    ]"
  >
    <!-- Image Container (Organic Shape) -->
    <div 
      class="relative overflow-hidden bg-stone-100 transition-all duration-500 ease-out"
      :class="[
        viewMode === 'list' 
          ? 'w-48 h-48 aspect-square flex-shrink-0 rounded-[2rem]' 
          : 'w-full aspect-[3/4] rounded-[2.5rem] shadow-sm group-hover:shadow-md group-hover:rounded-[2rem]'
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
          class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        >
      </NuxtLink>
        
      <!-- Gradient Overlay -->
      <div v-if="viewMode !== 'list'" class="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <!-- Badges (Floating) -->
      <div class="absolute top-4 left-4 flex flex-col gap-2 items-start z-10">
        <span
          v-if="isNew"
          class="px-3 py-1 bg-white/90 backdrop-blur text-emerald-700 text-xs font-bold rounded-full shadow-sm"
        >New</span>
        <span
          v-if="discount > 0"
          class="px-3 py-1 bg-white/90 backdrop-blur text-orange-600 text-xs font-bold rounded-full shadow-sm"
        >-{{ discount }}%</span>
      </div>

      <!-- Quick Action Buttons (Floating on Hover for Grid) -->
      <div 
        class="absolute bottom-4 right-4 flex gap-2 transition-all duration-300 z-10"
        :class="[
           viewMode === 'list' ? 'hidden' : 'translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'
        ]"
      >
        <button
           class="w-10 h-10 bg-white rounded-full flex items-center justify-center text-stone-700 hover:bg-brand-500 hover:text-white shadow-lg transition-all transform hover:scale-110" 
           title="Quick View"
           @click.prevent="$emit('quick-view', product)"
        >
            <Icon name="lucide:eye" class="w-5 h-5" />
        </button>

        <button
          v-if="storeSettings?.cartEnabled !== false"
          :disabled="isOutOfStock || !product.isActive"
          class="w-10 h-10 bg-stone-900 rounded-full flex items-center justify-center text-white hover:bg-brand-600 shadow-lg transition-all transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Add to Cart"
          @click.prevent="handleAddToCart"
        >
          <Icon name="lucide:shopping-basket" class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Details -->
    <div 
      :class="[
        viewMode === 'list' 
          ? 'flex-1 text-left' 
          : 'mt-4 px-2'
      ]"
    >
      <div class="flex justify-between items-start gap-2">
        <NuxtLink
            :to="`/p/${product.slug}`"
            class="group-hover:text-brand-600 transition-colors duration-200"
        >
            <h3 
            class="font-bold text-stone-900 leading-tight"
            :class="[ viewMode === 'list' ? 'text-2xl mb-2' : 'text-lg' ]"
            >
            {{ product.title }}
            </h3>
        </NuxtLink>
        
        <!-- Price (Top aligned in grid) -->
        <div v-if="viewMode !== 'list'" class="flex flex-col items-end flex-shrink-0">
             <span class="text-sm font-bold text-stone-900 bg-brand-50 px-2 py-0.5 rounded-full text-brand-700 border border-brand-100 whitespace-nowrap">
                {{ Number(product.price).toLocaleString() }} <span class="text-[10px]">{{ currencyCode }}</span>
            </span>
             <span
                v-if="oldPrice"
                class="text-[10px] text-stone-400 line-through mt-0.5"
                >{{ oldPrice }}</span
            >
        </div>
      </div>

      <p v-if="viewMode === 'list'" class="text-sm text-stone-500 mb-4 line-clamp-2 mt-2">
        {{ product.description || 'No description available for this product.' }}
      </p>

      <!-- Grid View: Description/Meta (Optional, keep minimal) -->
      <div v-if="viewMode !== 'list'" class="mt-1 flex items-center gap-2">
         <span v-if="isOutOfStock" class="text-xs font-bold text-red-500 flex items-center gap-1">
             <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span> Out of Stock
         </span>
         <span v-else class="text-xs font-medium text-stone-400">
            {{ product.stock <= 5 ? `Only ${product.stock} left` : 'In Stock' }}
         </span>
      </div>

       <!-- List View Price & Actions -->
       <div v-if="viewMode === 'list'" class="mt-4 flex items-center justify-between">
           <div class="flex items-center gap-2">
                <span class="text-2xl font-bold text-stone-900">{{ Number(product.price).toLocaleString() }} <span class="text-sm font-normal text-stone-500">{{ currencyCode }}</span></span>
                <span
                v-if="oldPrice"
                class="text-sm text-stone-400 line-through"
                >{{ oldPrice }} {{ currencyCode }}</span>
           </div>

          <button 
             v-if="storeSettings?.cartEnabled !== false"
             :disabled="product.stock === 0"
             class="px-6 py-3 rounded-full bg-stone-900 text-white text-sm font-bold hover:bg-brand-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
             @click.prevent="handleAddToCart"
          >
             <Icon name="lucide:shopping-basket" class="w-4 h-4" />
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
        class="fixed bottom-4 right-4 z-50 bg-stone-900 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-4 border border-stone-700/50 backdrop-blur-md bg-stone-900/95"
      >
        <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shrink-0">
          <Icon name="lucide:check" class="w-5 h-5" />
        </div>
        <div>
          <div class="font-bold">{{ successTitle }}</div>
          <div class="text-xs text-stone-300">{{ successMessage }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>
