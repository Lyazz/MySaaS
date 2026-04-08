<script setup lang="ts">
import { useRoute } from 'vue-router'
import { homeTemplates, storeShellTemplates } from '~/components/storefront/templates/registry'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: false,
  middleware: 'auth'
})

const route = useRoute()
const authStore = useAuthStore()

const templateKey = computed(() => (route.query.template as string) || 'classic')

const templatesMeta = [
  { key: 'classic', label: 'Classic Elegance' },
  { key: 'modern', label: 'Modern Edge' },
  { key: 'street', label: 'Streetwear' },
  { key: 'cozy', label: 'Cozy Basics' },
  { key: 'food', label: 'Fresh Food' },
  { key: 'cyber', label: 'Cyber Tech' },
  { key: 'stationnery', label: 'Stationery' },
  { key: 'wellness', label: 'Wellness Space' },
  { key: 'chrono', label: 'Chrono Luxe' },
]

const activeTemplateDef = computed(() => {
  return templatesMeta.find((tpl) => tpl.key === templateKey.value) || templatesMeta[0]
})

// -- Sample product from tenant stock --
const sampleProduct = ref<any>(null)
const sampleProductsList = computed(() => {
  if (!sampleProduct.value) return []
  return [sampleProduct.value, sampleProduct.value, sampleProduct.value, sampleProduct.value]
})

const fetchSampleProduct = async () => {
  try {
    const data = (await $fetch('/api/admin/products', {
      headers: { Authorization: `Bearer ${authStore.token}` },
      query: { limit: 20, isActive: true }
    })) as any
    const products = Array.isArray(data) ? data : (data?.items || data?.products || data?.data || [])
    
    if (products.length > 0) {
      const p = products[Math.floor(Math.random() * products.length)]
      const imgs = p.productImages?.map((i:any) => i.url) || p.images || []
      const mainImg = imgs.length > 0 ? imgs[0] : (p.images?.[0] || '/blank.svg')
      sampleProduct.value = {
        id: p.id || 'sample-id',
        title: p.title || p.name || 'Sample Product',
        slug: p.slug || 'sample-product',
        price: p.price != null ? Number(p.price) : 99,
        stock: p.stock ?? 10,
        isActive: true,
        images: [mainImg],
        description: p.description || 'Sample product description'
      }
    } else {
       sampleProduct.value = {
          id: 'dummy',
          title: 'Sample Sneakers Default',
          slug: 'sample',
          price: 129.99,
          stock: 50,
          isActive: true,
          images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80'],
          description: 'A stylish and comfortable pair of sneakers.'
       }
    }
  } catch {
       sampleProduct.value = {
          id: 'dummy',
          title: 'Premium Sample Item',
          slug: 'sample',
          price: 89,
          stock: 20,
          isActive: true,
          images: ['https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=400&q=80'],
          description: 'High quality sample item for your store.'
       }
  }
}

onMounted(() => {
  fetchSampleProduct()
})

const isPreviewReady = ref(false)

if (import.meta.client) {
  // Override window.fetch to mock storefront API responses safely
  const originalFetch = window.fetch
  window.fetch = async (...args) => {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as any)?.url || ''
    
    // Mock /api/categories
    if (url.includes('/api/categories')) {
      return new Response(JSON.stringify([
        {
          id: 'cat-1',
          title: 'Nouvelle Collection',
          slug: 'nouvelle-collection',
          imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&q=80',
          _count: { products: 24 }
        },
        {
          id: 'cat-2',
          title: 'Essentiels',
          slug: 'essentiels',
          imageUrl: 'https://images.unsplash.com/photo-1531346878377-a5ecafbc8bf8?w=800&q=80',
          _count: { products: 12 }
        },
        {
          id: 'cat-3',
          title: 'Accessoires',
          slug: 'accessoires',
          imageUrl: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800&q=80',
          _count: { products: 18 }
        },
        {
          id: 'cat-4',
          title: 'Promotions',
          slug: 'promotions',
          imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80',
          _count: { products: 5 }
        }
      ]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    return originalFetch(...args)
  }
  
  isPreviewReady.value = true
}

const capturePreviewClicks = (e: MouseEvent) => {
  // Prevent any links clicked inside the preview simulator from actually navigating
  const target = e.target as HTMLElement
  const link = target.closest('a')
  if (link) {
     e.preventDefault()
  }
}
</script>

<template>
  <div class="w-full min-h-screen bg-white" @click="capturePreviewClicks">
    <template v-if="activeTemplateDef && isPreviewReady">
       <component 
         :is="storeShellTemplates[activeTemplateDef.key as keyof typeof storeShellTemplates]" 
         :hideAnnouncementBar="false" 
         :hideNavigation="false"
         :mobileHeaderHidden="false"
       >
         <component 
           :is="homeTemplates[activeTemplateDef.key as keyof typeof homeTemplates]" 
           :tenantName="activeTemplateDef.label"
           :featuredProducts="sampleProductsList"
           :bestSellerProducts="sampleProductsList"
           :pending="false"
         />
       </component>
    </template>
  </div>
</template>
