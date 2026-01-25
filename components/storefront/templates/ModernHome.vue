<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import ProductCard from '~/components/storefront/templates/ModernProductCard.vue'

const props = defineProps<{
  tenantName: string
  featuredProducts: any[]
  pending: boolean
}>()

const cartStore = useCartStore()

// Hero Slider Data
const heroSlides = [
    {
        id: 1,
        title: 'New Collection 2026',
        subtitle: 'Discover the latest trends in books and stationery.',
        buttonText: 'Shop Now',
        image: 'https://placehold.co/1920x600/0d9488/ffffff?text=New+Collection+2026'
    },
    {
        id: 2,
        title: 'Best Sellers',
        subtitle: 'Get your hands on the most popular items this week.',
        buttonText: 'Browse',
        image: 'https://placehold.co/1920x600/0f172a/ffffff?text=Best+Sellers'
    },
     {
        id: 3,
        title: 'Special Offers',
        subtitle: 'Up to 50% off on selected items.',
        buttonText: 'View Deals',
        image: 'https://placehold.co/1920x600/f59e0b/ffffff?text=Special+Offers'
    }
]

const currentSlide = ref(0)
const nextSlide = () => { currentSlide.value = (currentSlide.value + 1) % heroSlides.length }
const prevSlide = () => { currentSlide.value = (currentSlide.value - 1 + heroSlides.length) % heroSlides.length }

// Auto-advance slider
let slideInterval: any
onMounted(() => {
    slideInterval = setInterval(nextSlide, 5000)
})
onUnmounted(() => {
    clearInterval(slideInterval)
})

// Mock categories for the "Explore by category" section
const categories = [
  { 
    title: 'Bags', 
    slug: 'bags', 
    className: 'col-span-1 md:col-span-1 bg-white h-64',
    items: [],
  },
  { 
    title: 'Books', 
    slug: 'books', 
    className: 'col-span-1 md:col-span-1 bg-white h-64',
    items: ['English Books', 'Fantasy', 'Horror', 'Mystery', 'Self-Development', 'كتب دينية']
  },
  { 
    title: 'Packs', 
    slug: 'packs', 
    className: 'col-span-1 md:col-span-1 bg-white h-64',
    items: [] 
  },
   { 
    title: 'Series', 
    slug: 'series', 
    className: 'col-span-1 md:col-span-1 bg-white h-48',
    items: [] 
  },
  { 
    title: 'Stationery', 
    slug: 'stationery', 
    className: 'col-span-1 md:col-span-1 bg-white h-48',
    items: ['Notebooks']
  },
  { 
    title: 'Tech', 
    slug: 'tech', 
    className: 'col-span-1 md:col-span-1 bg-white h-48',
    items: []
  },
]

// Dummy Products for when Store is empty (Visual Fallback)
const dummyProducts = [
    { id: 'd1', title: 'The Great Gatsby', price: 1200, slug: 'dummy-1', images: ['https://placehold.co/400x600'], category: 'Books', isActive: true, stock: 10 },
    { id: 'd2', title: 'Luxury Pen Set', price: 4500, slug: 'dummy-2', images: ['https://placehold.co/400x600'], category: 'Stationery', isActive: true, stock: 5 },
    { id: 'd3', title: 'Leather Backpack', price: 8900, slug: 'dummy-3', images: ['https://placehold.co/400x600'], category: 'Bags', isActive: true, stock: 2 },
    { id: 'd4', title: 'Wireless Headphones', price: 15000, slug: 'dummy-4', images: ['https://placehold.co/400x600'], category: 'Tech', isActive: true, stock: 0 },
]

const displayedProducts = computed(() => {
    if (props.featuredProducts && props.featuredProducts.length > 0) {
        return props.featuredProducts
    }
    return dummyProducts // Show dummy if empty
})
</script>

<template>
  <div class="bg-[#f8faf9] min-h-screen pb-24">
    
    <!-- Hero Slider -->
    <div class="relative w-full h-[300px] md:h-[400px] lg:h-[500px] overflow-hidden group">
        <!-- Slides -->
        <div 
            v-for="(slide, index) in heroSlides" 
            :key="slide.id"
            class="absolute inset-0 transition-opacity duration-700 ease-in-out"
            :class="index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'"
         >
            <img :src="slide.image" class="w-full h-full object-cover" :alt="slide.title" />
            <div class="absolute inset-0 bg-black/30 flex items-center justify-center text-center px-4">
                <div class="max-w-2xl text-white transform transition-transform duration-700" :class="index === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'">
                    <h2 class="text-4xl md:text-6xl font-display font-bold mb-4">{{ slide.title }}</h2>
                    <p class="text-lg md:text-xl mb-8 opacity-90">{{ slide.subtitle }}</p>
                    <NuxtLink to="/products" class="inline-block px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-full shadow-lg transition-all transform hover:scale-105">
                        {{ slide.buttonText }}
                    </NuxtLink>
                </div>
            </div>
        </div>

        <!-- Arrows -->
        <button @click="prevSlide" class="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full backdrop-blur-sm transition-opacity opacity-0 group-hover:opacity-100">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
        </button>
        <button @click="nextSlide" class="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full backdrop-blur-sm transition-opacity opacity-0 group-hover:opacity-100">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </button>

        <!-- Dots -->
        <div class="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
            <button 
                v-for="(slide, index) in heroSlides" 
                :key="slide.id" 
                @click="currentSlide = index"
                class="w-2.5 h-2.5 rounded-full transition-all"
                :class="index === currentSlide ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/80'"
            ></button>
        </div>
    </div>

    <!-- Categories Section (Horizontal Scroll) -->
    <section class="py-12 bg-white border-y border-slate-100">
      <div class="mb-6 px-4 max-w-7xl mx-auto flex items-end justify-between">
         <div>
            <p class="text-xs font-bold text-brand-600 tracking-wider uppercase mb-1">CATEGORIES</p>
            <h2 class="text-3xl font-bold text-slate-900">Explore by category</h2>
         </div>
         
         <!-- Scroll Arrows (Desktop) -->
         <div class="hidden md:flex gap-2">
             <button class="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:border-brand-600 hover:text-brand-600 transition-colors" onclick="document.getElementById('cat-scroll').scrollBy({left: -300, behavior: 'smooth'})">
                 <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
             </button>
             <button class="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:border-brand-600 hover:text-brand-600 transition-colors" onclick="document.getElementById('cat-scroll').scrollBy({left: 300, behavior: 'smooth'})">
                 <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
             </button>
         </div>
      </div>

      <div class="relative w-full">
         <div id="cat-scroll" class="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-8 px-4 max-w-7xl mx-auto scrollbar-hide">
            <NuxtLink 
                v-for="(cat, idx) in categories" 
                :key="cat.slug" 
                to="/products"
                class="snap-start flex-shrink-0 w-72 h-48 bg-slate-50 rounded-2xl border border-slate-100 p-6 flex flex-col justify-center items-center hover:bg-white hover:shadow-lg transition-all relative overflow-hidden group"
            >
                <div class="z-10 text-center">
                    <h3 class="text-xl font-bold text-slate-800 group-hover:text-brand-600 transition-colors">{{ cat.title }}</h3>
                    <p class="text-sm text-slate-500 mt-1">{{ cat.items?.length || 0 }} items</p>
                </div>
                    <!-- Decoration -->
                <div class="absolute -bottom-6 -right-6 w-24 h-24 bg-brand-50 rounded-full group-hover:scale-110 transition-transform z-0 opacity-50"></div>
            </NuxtLink>
         </div>
      </div>
    </section>

    <!-- Featured Products -->
    <section class="py-12 bg-white border-y border-slate-100">
         <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between mb-8">
                <h2 class="text-2xl font-bold text-slate-900">New Arrivals</h2>
                 <NuxtLink to="/products" class="text-brand-600 font-medium hover:underline flex items-center gap-1">
                    View all <span aria-hidden="true">&rarr;</span>
                </NuxtLink>
            </div>

            <div v-if="pending" class="grid grid-cols-2 md:grid-cols-4 gap-6">
                <!-- Skeletons -->
                 <div v-for="i in 4" :key="i" class="animate-pulse">
                    <div class="bg-slate-200 rounded-2xl h-64 mb-4"></div>
                    <div class="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                    <div class="h-4 bg-slate-200 rounded w-1/2"></div>
                 </div>
            </div>

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <ProductCard v-for="product in displayedProducts" :key="product.id" :product="product" />
            </div>
         </div>
    </section>

  </div>
</template>
