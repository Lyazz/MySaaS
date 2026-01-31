<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import ProductCard from './ProductCard.vue'

const props = defineProps<{
  tenantName: string
  featuredProducts: any[]
  pending: boolean
}>()

const cartStore = useCartStore()

// Hero Slider Data - Same as Modern/Classic
const heroSlides = [
    {
        id: 1,
        title: 'New Collection 2026',
        subtitle: 'Discover the latest trends in books and stationery.',
        buttonText: 'Shop Now',
        image: 'https://placehold.co/1920x800/0f172a/ffffff?text=New+Collection+2026'
    },
    {
        id: 2,
        title: 'Best Sellers',
        subtitle: 'Get your hands on the most popular items this week.',
        buttonText: 'Browse',
        image: 'https://placehold.co/1920x800/334155/ffffff?text=Best+Sellers'
    },
     {
        id: 3,
        title: 'Special Offers',
        subtitle: 'Up to 50% off on selected items.',
        buttonText: 'View Deals',
        image: 'https://placehold.co/1920x800/475569/ffffff?text=Special+Offers'
    }
]

const currentSlide = ref(0)
const nextSlide = () => { currentSlide.value = (currentSlide.value + 1) % heroSlides.length }
const prevSlide = () => { currentSlide.value = (currentSlide.value - 1 + heroSlides.length) % heroSlides.length }

// Auto-advance slider
let slideInterval: any
onMounted(() => {
    slideInterval = setInterval(nextSlide, 6000)
})
onUnmounted(() => {
    clearInterval(slideInterval)
})

// Fetch Categories
const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: categoriesData } = await useFetch<any[]>(categoriesUrl, {
    headers: useTenantApiHeaders()
})

// Map categories to view model with visual properties
const categories = computed(() => {
    if (!categoriesData.value) return []
    
    return categoriesData.value.map((cat, index) => {
        return {
            ...cat,
            itemCount: cat._count?.products || 0
        }
    })
})

// Check if we have any displayed products
const displayedProducts = computed(() => {
    if (props.featuredProducts && props.featuredProducts.length > 0) {
        return props.featuredProducts
    }
    return [] 
})
</script>

<template>
  <div class="bg-white min-h-screen pb-24">
    <!-- Hero Slider - Street Style -->
    <div class="relative w-full h-[500px] md:h-[600px] lg:h-[700px] overflow-hidden group border-b-4 border-black">
      <!-- Slides -->
      <div 
        v-for="(slide, index) in heroSlides" 
        :key="slide.id"
        class="absolute inset-0 transition-opacity duration-1000 ease-in-out"
        :class="index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'"
      >
        <img
          :src="slide.image"
          class="w-full h-full object-cover grayscale contrast-125"
          :alt="slide.title"
        >
        <!-- Overlay -->
        <div class="absolute inset-0 bg-black/60 flex items-center justify-center text-center">
          <div class="max-w-4xl mx-auto px-6 w-full">
            <div
              class="transform transition-all duration-1000 delay-300" 
              :class="index === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'"
            >
              <span class="inline-block px-4 py-2 bg-brand text-black font-street text-sm uppercase tracking-widest mb-6 border-2 border-black shadow-[4px_4px_0_0_#000]">
                {{ tenantName }}
              </span>
              <h2 class="text-5xl md:text-7xl lg:text-9xl font-street text-white mb-6 leading-none uppercase tracking-tighter drop-shadow-[6px_6px_0_var(--brand)]">
                {{ slide.title }}
              </h2>
              <p class="text-lg md:text-xl lg:text-2xl mb-10 text-white/90 max-w-2xl mx-auto font-mono uppercase">
                {{ slide.subtitle }}
              </p>
              <NuxtLink
                to="/products"
                class="inline-block px-10 py-4 bg-brand text-black font-street text-2xl uppercase border-4 border-black shadow-[8px_8px_0_0_#000] hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all"
              >
                {{ slide.buttonText }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Dots -->
      <div class="absolute bottom-10 left-0 right-0 z-20 flex justify-center space-x-4">
        <button 
          v-for="(slide, index) in heroSlides" 
          :key="slide.id" 
          class="w-4 h-4 border-2 border-white transition-all"
          :class="index === currentSlide ? 'bg-brand border-brand scale-125' : 'bg-transparent hover:bg-white/50'"
          @click="currentSlide = index"
        />
      </div>
      
      <!-- Arrows -->
      <button 
        class="absolute left-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/10 border-2 border-white text-white hover:bg-brand hover:border-brand hover:text-black transition-all hidden md:flex items-center justify-center"
        @click="prevSlide"
      >
         <Icon name="lucide:arrow-left" class="w-6 h-6" />
      </button>
      <button 
        class="absolute right-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/10 border-2 border-white text-white hover:bg-brand hover:border-brand hover:text-black transition-all hidden md:flex items-center justify-center"
        @click="nextSlide"
      >
         <Icon name="lucide:arrow-right" class="w-6 h-6" />
      </button>
    </div>

    <!-- Categories Section -->
    <section class="py-16 md:py-24 bg-white border-b-4 border-black">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center mb-16">
          <span class="font-mono text-sm uppercase tracking-widest text-gray-500 mb-3 block">Collections</span>
          <h2 class="text-4xl md:text-5xl font-street text-black uppercase">
            Browse by Category
          </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <NuxtLink 
            v-for="(cat, idx) in categories" 
            :key="cat.slug" 
            :to="`/c/${cat.slug}`"
            class="group relative aspect-[3/4] md:aspect-[4/5] overflow-hidden bg-gray-100 block border-4 border-black shadow-[8px_8px_0_0_#000] hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all"
          >
            <!-- Background Image -->
            <img
              v-if="cat.imageUrl"
              :src="cat.imageUrl"
              :alt="cat.title"
              class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 grayscale group-hover:grayscale-0"
            >
            <div v-else class="w-full h-full bg-gray-200 flex items-center justify-center">
                <span class="text-6xl font-street text-gray-300 uppercase">{{ cat.title[0] }}</span>
            </div>
            
            <!-- Overlay Content -->
            <div class="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-500" />
            
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
               <div class="bg-brand px-6 py-3 border-4 border-black shadow-[4px_4px_0_0_#000]">
                  <h3 class="text-2xl md:text-3xl font-street text-black uppercase">
                    {{ cat.title }}
                  </h3>
                  <p class="font-mono text-xs text-black uppercase">
                    {{ cat.itemCount }} Products
                  </p>
               </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Featured Products -->
    <section class="py-16 md:py-24 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <span class="font-mono text-sm uppercase tracking-widest text-gray-500 mb-3 block">New Arrivals</span>
          <h2 class="text-4xl md:text-5xl font-street text-black uppercase">
            Trending Now
          </h2>
        </div>

        <div
          v-if="pending"
          class="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-y-12"
        >
          <!-- Skeletons -->
          <div
            v-for="i in 4"
            :key="i"
            class="animate-pulse"
          >
            <div class="bg-gray-200 h-[350px] mb-4 w-full border-4 border-black" />
            <div class="h-4 bg-gray-200 w-3/4 mx-auto mb-3" />
            <div class="h-4 bg-gray-200 w-1/4 mx-auto" />
          </div>
        </div>

        <div
          v-else
          class="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-y-12"
        >
          <ProductCard
            v-for="product in displayedProducts"
            :key="product.id"
            :product="product"
          />
        </div>
            
        <div class="mt-16 text-center">
          <NuxtLink
            to="/products"
            class="inline-block bg-black text-brand font-street text-2xl uppercase px-10 py-4 border-4 border-black shadow-[8px_8px_0_0_var(--brand)] hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all"
          >
            View all products
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
