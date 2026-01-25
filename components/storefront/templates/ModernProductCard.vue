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

// Mock discounting for visual alignment with screenshot
const discount = 33 // 33% off mock
const oldPrice = computed(() => {
    const p = Number(props.product.price)
    return Math.round(p * 1.33)
})

function handleAddToCart() {
  cartStore.addItem({
    productId: props.product.id,
    title: props.product.title,
    slug: props.product.slug,
    price: Number(props.product.price),
    stock: props.product.stock
  })
}
</script>

<template>
  <div class="group relative flex flex-col items-center">
    
    <!-- Image Card -->
    <div class="relative w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
        <!-- Background Image (or color block fallback) -->
        <img :src="mainImage" :alt="product.title" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        
        <!-- Gradient Overlay -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60"></div>

        <!-- Badges (Top Left) -->
        <div class="absolute top-4 left-4 flex flex-col gap-2 items-start">
            <span class="px-3 py-1 bg-[#d4f5cc] text-[#1e4a1a] text-xs font-bold rounded-full shadow-sm">New</span>
            <span class="px-3 py-1 bg-[#dbeafe] text-[#1e3a8a] text-xs font-bold rounded-full shadow-sm">-{{ discount }}%</span>
        </div>

         <!-- Floating Actions (Right) -->
        <div class="absolute top-4 right-4 flex flex-col gap-3 translate-x-10 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
            <button class="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-700 hover:bg-brand-50 hover:text-brand-600 shadow-md transition-colors" title="Quick View">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </button>
             <button @click="handleAddToCart" class="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-700 hover:bg-brand-50 hover:text-brand-600 shadow-md transition-colors" title="Add to Cart">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            </button>
             <button class="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-700 hover:bg-brand-50 hover:text-brand-600 shadow-md transition-colors" title="Wishlist">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
            </button>
             <button class="w-10 h-10 bg-[#fef3c7] rounded-full flex items-center justify-center text-[#92400e] hover:bg-yellow-200 shadow-md transition-colors" title="Buy Now">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </button>
        </div>

         <!-- Static In Stock Badge (Bottom Right) -->
         <div class="absolute bottom-4 right-4">
            <span class="px-4 py-1.5 bg-[#d4f5cc] text-[#1e4a1a] text-xs font-bold rounded-full shadow-sm">In stock</span>
         </div>
    </div>

    <!-- Details Below -->
    <div class="mt-4 text-center w-full px-2">
        <NuxtLink :to="`/p/${product.slug}`" class="block group-hover:underline decoration-brand-600">
             <h3 class="text-lg font-bold text-slate-900 leading-tight truncate px-1">{{ product.title }}</h3>
        </NuxtLink>
        <div class="flex items-center justify-center gap-3 mt-2">
            <span class="text-2xl font-bold text-slate-900">{{ Number(product.price) }} <span class="text-base font-normal text-slate-500">DZD</span></span>
             <!-- Mock old price line-through -->
            <span class="text-sm text-slate-400 line-through decoration-slate-400">{{ oldPrice }} DZD</span>
        </div>
    </div>

  </div>
</template>
