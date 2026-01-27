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
  product: Product
}>()

const cartStore = useCartStore()

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
  <div class="group relative flex flex-col items-center">
    
    <!-- Image Card -->
    <div class="relative w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 bg-gray-100">
        <!-- Background Image -->
        <NuxtLink :to="`/p/${product.slug}`" class="block w-full h-full">
            <img :src="mainImage" :alt="product.title" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
        </NuxtLink>
        
        <!-- Gradient Overlay -->
        <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

        <!-- Badges (Top Left) -->
        <div class="absolute top-3 left-3 flex flex-col gap-2 items-start z-10">
            <span v-if="isNew" class="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-lg shadow-sm backdrop-blur-md bg-opacity-90">New</span>
            <span v-if="discount > 0" class="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-lg shadow-sm backdrop-blur-md bg-opacity-90">-{{ discount }}%</span>
        </div>

         <!-- Floating Actions (Right) -->
        <div class="absolute top-3 right-3 flex flex-col gap-2 translate-x-0 opacity-100 lg:translate-x-10 lg:opacity-0 lg:group-hover:translate-x-0 lg:group-hover:opacity-100 transition-all duration-300 z-10">
            <!-- Quick View (Future Implementation) -->
            <!--
            <button class="w-9 h-9 bg-white rounded-full flex items-center justify-center text-slate-700 hover:bg-brand-50 hover:text-brand-600 shadow-md transition-colors" title="Quick View">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </button>
            -->
             <button @click.prevent="handleAddToCart" :disabled="product.stock === 0" class="w-9 h-9 bg-white rounded-full flex items-center justify-center text-slate-700 hover:bg-brand-600 hover:text-white shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed" title="Add to Cart">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            </button>
        </div>

         <!-- Static In Stock Badge (Bottom Right) -->
         <div v-if="product.stock > 0" class="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span class="px-2.5 py-1 bg-white/90 backdrop-blur text-slate-700 text-[10px] font-bold rounded-full shadow-sm">In Stock</span>
         </div>
    </div>

    <!-- Details Below -->
    <div class="mt-3 text-center w-full px-1">
        <NuxtLink :to="`/p/${product.slug}`" class="block group-hover:text-brand-600 transition-colors duration-200">
             <h3 class="text-base font-medium text-slate-900 leading-snug truncate">{{ product.title }}</h3>
        </NuxtLink>
        <div class="flex items-center justify-center gap-2 mt-1">
            <span class="text-lg font-bold text-slate-900">{{ Number(product.price).toLocaleString() }} <span class="text-xs font-normal text-slate-500">DZD</span></span>
             <span v-if="oldPrice" class="text-xs text-slate-400 line-through">{{ oldPrice }} DZD</span>
        </div>
    </div>

  </div>
</template>
