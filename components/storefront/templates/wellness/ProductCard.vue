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
const storefrontContent = useStorefrontContent()

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
    bundleDeals: props.product.bundleDeals || [],
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
        ? 'flex flex-row items-start gap-8 p-4 hover:bg-stone-50 rounded-3xl transition-colors duration-300' 
        : 'flex flex-col gap-4'
    ]"
  >
    <!-- Image Card -->
    <div 
      class="relative overflow-hidden rounded-[2rem] bg-stone-100"
      :class="[
        viewMode === 'list' 
          ? 'w-48 h-60 flex-shrink-0' 
          : 'w-full aspect-[4/5]'
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
          class="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
        >
      </NuxtLink>
        
      <!-- Subtle Overlay on Hover -->
      <div v-if="viewMode !== 'list'" class="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/5 transition-colors duration-500 pointer-events-none" />

      <!-- Badges (Top Left - Minimal Pill) -->
      <div class="absolute top-4 left-4 flex flex-col gap-2 items-start z-10">
        <span
          v-if="isNew"
          class="px-3 py-1 bg-white/90 backdrop-blur text-emerald-800 text-xs font-medium uppercase tracking-wider rounded-full shadow-sm"
        >New</span>
        <span
          v-if="discount > 0"
          class="px-3 py-1 bg-white/90 backdrop-blur text-stone-600 text-xs font-medium uppercase tracking-wider rounded-full shadow-sm"
        >-{{ discount }}%</span>
      </div>

      <!-- Quick Actions (Bottom Center - Fade Up) -->
       <div 
        class="absolute inset-x-0 bottom-4 flex justify-center gap-3 transition-all duration-500 pointer-events-none"
        :class="[ viewMode !== 'list' ? 'translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100' : 'hidden' ]"
      >
         <button
            class="pointer-events-auto h-11 w-11 bg-white rounded-full flex items-center justify-center text-stone-700 hover:text-brand-700 hover:bg-stone-50 shadow-soft transition-colors" 
            title="Quick View"
            @click.prevent="$emit('quick-view', product)"
         >
             <Icon name="lucide:eye" class="w-5 h-5" />
         </button>

         <button
           v-if="storeSettings?.cartEnabled !== false"
           :disabled="isOutOfStock || !product.isActive"
           class="pointer-events-auto h-11 w-11 bg-brand-700 text-white rounded-full flex items-center justify-center hover:bg-brand-800 shadow-soft transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
           :title="storefrontContent.actions.addToCart"
           @click.prevent="handleAddToCart"
         >
           <Icon name="lucide:plus" class="w-5 h-5" />
         </button>
      </div>
    </div>

    <!-- Details -->
    <div 
      :class="[
        viewMode === 'list' 
          ? 'flex-1 py-2' 
          : 'flex flex-col items-center text-center px-1'
      ]"
    >
      <div v-if="viewMode === 'list'" class="mb-2">
         <span class="text-xs font-bold tracking-widest text-stone-400 uppercase">Collection</span>
      </div>

      <NuxtLink
        :to="`/p/${product.slug}`"
        class="block group-hover:text-brand-700 transition-colors duration-300"
      >
        <h3 
          class="font-wellness text-stone-900 leading-snug"
          :class="[ viewMode === 'list' ? 'text-2xl mb-3' : 'text-lg' ]"
        >
          {{ product.title }}
        </h3>
      </NuxtLink>

      <p v-if="viewMode === 'list'" class="text-stone-500 mb-6 max-w-2xl leading-relaxed font-light">
        {{ product.description || 'Experience natural wellness with our curated selection alongside premium ingredients.' }}
      </p>

      <div 
        class="flex items-center gap-3" 
        :class="[ viewMode === 'list' ? '' : 'justify-center mt-2' ]"
      >
        <span class="font-medium text-stone-600" :class="[viewMode === 'list' ? 'text-lg' : 'text-sm']">
            {{ Number(product.price).toLocaleString() }} {{ currencyCode }}
        </span>
        <span
          v-if="oldPrice"
          class="text-xs text-stone-400 line-through decoration-stone-300"
        >{{ oldPrice }} {{ currencyCode }}</span>
      </div>
      
      <!-- List View Extra Actions -->
       <div v-if="viewMode === 'list'" class="mt-6 flex gap-4">
          <button 
             v-if="storeSettings?.cartEnabled !== false"
             :disabled="product.stock === 0"
             class="px-8 py-3 rounded-full bg-brand-700 text-white text-sm font-medium hover:bg-brand-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
             @click.prevent="handleAddToCart"
          >
             {{ storefrontContent.actions.addToCart }}
          </button>
          <button class="px-5 py-3 rounded-full border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors">
              <Icon name="lucide:heart" class="w-4 h-4" />
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
        class="fixed bottom-6 right-6 z-50 bg-stone-900 text-stone-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-stone-800"
      >
        <div class="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <Icon name="lucide:check" class="w-4 h-4" />
        </div>
        <div>
          <div class="font-medium text-sm">{{ successTitle }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>
