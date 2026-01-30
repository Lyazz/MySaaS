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
const currencyCode = computed(() => storeSettings.value?.currencyCode || 'DZD')

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

function handleAddToCart() {
  cartStore.addItem({
    productId: props.product.id,
    title: props.product.title,
    slug: props.product.slug,
    price: Number(props.product.price),
    stock: props.product.stock,
    image: mainImage.value
  })
}
</script>

<template>
  <div 
    class="group relative"
    :class="[
      viewMode === 'list' 
        ? 'flex flex-row items-center gap-6 bg-white p-4 rounded-3xl border border-slate-100 hover:shadow-lg transition-all duration-300' 
        : 'flex flex-col items-center'
    ]"
  >
    <!-- Image Card -->
    <div 
      class="relative overflow-hidden rounded-3xl bg-gray-100 shadow-sm"
      :class="[
        viewMode === 'list' 
          ? 'w-48 h-48 aspect-square flex-shrink-0' 
          : 'w-full aspect-[3/4] shadow-lg hover:shadow-xl transition-all duration-300'
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
        
      <!-- Gradient Overlay (Grid Only) -->
      <div v-if="viewMode !== 'list'" class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <!-- Badges (Top Left) -->
      <div class="absolute top-3 left-3 flex flex-col gap-2 items-start z-10">
        <span
          v-if="isNew"
          class="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-lg shadow-sm backdrop-blur-md bg-opacity-90"
        >New</span>
        <span
          v-if="discount > 0"
          class="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-lg shadow-sm backdrop-blur-md bg-opacity-90"
        >-{{ discount }}%</span>
      </div>

      <!-- Floating Actions (Right) -->
      <!-- In List View, we might want these visible or positioned differently. For now, keep generic behavior or hide in list if preferred. 
           Let's keep them absolute for consistency but adjust visibility. -->
      <div 
        class="absolute top-3 right-3 flex flex-col gap-2 transition-all duration-300 z-10"
        :class="[
           viewMode === 'list' ? 'opacity-0 group-hover:opacity-100' : 'translate-x-0 opacity-100 lg:translate-x-10 lg:opacity-0 lg:group-hover:translate-x-0 lg:group-hover:opacity-100'
        ]"
      >
        <!-- Quick View -->
        <button
           class="w-9 h-9 bg-white rounded-full flex items-center justify-center text-slate-700 hover:bg-brand-50 hover:text-brand-600 shadow-md transition-colors" 
           title="Quick View"
           @click.prevent="$emit('quick-view', product)"
        >
            <Icon name="lucide:eye" class="w-4 h-4" />
        </button>

        <button
          v-if="storeSettings?.cartEnabled !== false"
          :disabled="product.stock === 0"
          class="w-9 h-9 bg-white rounded-full flex items-center justify-center text-slate-700 hover:bg-brand-600 hover:text-white shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Add to Cart"
          @click.prevent="handleAddToCart"
        >
          <Icon name="lucide:shopping-bag" class="w-4 h-4" />
        </button>
      </div>

      <!-- Static In Stock Badge (Grid Only) -->
      <div
        v-if="product.stock > 0 && viewMode !== 'list'"
        class="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      >
        <span class="px-2.5 py-1 bg-white/90 backdrop-blur text-slate-700 text-[10px] font-bold rounded-full shadow-sm">In Stock</span>
      </div>
    </div>

    <!-- Details -->
    <div 
      :class="[
        viewMode === 'list' 
          ? 'flex-1 text-left' 
          : 'mt-3 text-center w-full px-1'
      ]"
    >
      <NuxtLink
        :to="`/p/${product.slug}`"
        class="block group-hover:text-brand-600 transition-colors duration-200"
      >
        <h3 
          class="font-medium text-slate-900 leading-snug"
          :class="[ viewMode === 'list' ? 'text-xl mb-2' : 'text-base truncate' ]"
        >
          {{ product.title }}
        </h3>
      </NuxtLink>

      <p v-if="viewMode === 'list'" class="text-sm text-slate-500 mb-4 line-clamp-2">
        {{ product.description || 'No description available for this product.' }}
      </p>

      <div 
        class="flex items-center gap-2" 
        :class="[ viewMode === 'list' ? '' : 'justify-center mt-1' ]"
      >
        <span class="text-lg font-bold text-slate-900">{{ Number(product.price).toLocaleString() }} <span class="text-xs font-normal text-slate-500">{{ currencyCode }}</span></span>
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
             class="px-5 py-2 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-brand-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
             @click.prevent="handleAddToCart"
          >
             Add to Cart
          </button>
       </div>
    </div>
  </div>
</template>
