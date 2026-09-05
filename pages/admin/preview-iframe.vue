<script setup lang="ts">
import { useRoute } from 'vue-router'
import { homeTemplates, resolveTemplateKey, storeShellTemplates } from '~/components/storefront/templates/registry'
import { useAuthStore } from '~/stores/auth'
import { getPromotionalPrice } from '~/shared/pricing/product-pricing'

definePageMeta({
  layout: false,
  middleware: 'auth'
})

const route = useRoute()
const authStore = useAuthStore()

/**
 * Draft state pushed in live by the onboarding wizard over postMessage. It wins
 * over the saved settings so the merchant sees unsaved edits as they type; with
 * no wizard driving it the page falls back to the ?template= query and the
 * tenant's real settings, which is how the appearance previewer uses it.
 */
const draft = ref<Record<string, any> | null>(null)

const templateKey = computed(() =>
  resolveTemplateKey(draft.value?.templateKey ?? (route.query.template as string))
)

// The template list lives in the registry. This page used to carry its own copy,
// which had fallen six themes behind -- picking playful, activewear, interior,
// minimal, nour or embellir silently previewed Classic instead.
const activeTemplateKey = templateKey

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
      const mainImg = imgs.length > 0 ? imgs[0] : (p.images?.[0] || '/blank.svg?v=2')
      const promotionalPrice = getPromotionalPrice(p)
      sampleProduct.value = {
        id: p.id || 'sample-id',
        title: p.title || p.name || 'Sample Product',
        slug: p.slug || 'sample-product',
        price: p.price != null ? Number(p.price) : 99,
        promotionalPrice,
        isPromotionActive: promotionalPrice !== null,
        promotionStartDate: null,
        promotionEndDate: null,
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

/*
 * Every storefront template reads useState('tenant') and useState('storeSettings'),
 * so seeding those two is enough to drive the real shell -- no per-template
 * plumbing, and nothing to keep in sync when a theme changes what it reads.
 */
const previewTenant = useState<any>('tenant')
const previewStoreSettings = useState<any>('storeSettings')

const applyDraft = (payload: Record<string, any>) => {
  draft.value = { ...(draft.value ?? {}), ...payload }

  previewTenant.value = {
    ...(previewTenant.value ?? {}),
    name: payload.name ?? previewTenant.value?.name ?? 'My Store',
    slug: payload.slug ?? previewTenant.value?.slug ?? 'preview'
  }

  previewStoreSettings.value = {
    ...(previewStoreSettings.value ?? {}),
    templateKey: resolveTemplateKey(payload.templateKey ?? previewStoreSettings.value?.templateKey),
    primaryColor: payload.primaryColor ?? previewStoreSettings.value?.primaryColor ?? '#0D9488',
    useBrandColor: true,
    logoUrl: payload.logoUrl !== undefined ? payload.logoUrl : previewStoreSettings.value?.logoUrl,
    description: payload.description ?? previewStoreSettings.value?.description,
    cartEnabled: previewStoreSettings.value?.cartEnabled ?? true
  }

  if (payload.product && (payload.product.name || payload.product.imageUrl)) {
    sampleProduct.value = {
      id: 'onboarding-draft',
      title: payload.product.name || 'Your first product',
      slug: 'preview',
      price: Number(payload.product.price) || 0,
      promotionalPrice: null,
      isPromotionActive: false,
      promotionStartDate: null,
      promotionEndDate: null,
      stock: 10,
      isActive: true,
      images: [payload.product.imageUrl || '/blank.svg?v=2'],
      description: ''
    }
  }
}

const onDraftMessage = (event: MessageEvent) => {
  // Same-origin only: this page renders whatever it is handed, so a cross-origin
  // frame must never be able to hand it anything.
  if (event.origin !== window.location.origin) return
  const data = event.data
  if (!data || data.type !== 'swekly:onboarding-draft' || typeof data.payload !== 'object') return
  applyDraft(data.payload)
}

onMounted(() => {
  fetchSampleProduct()
  if (window.parent !== window) {
    window.addEventListener('message', onDraftMessage)
    // The wizard cannot know when this frame finished booting, so the frame says so.
    window.parent.postMessage({ type: 'swekly:preview-ready' }, window.location.origin)
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) window.removeEventListener('message', onDraftMessage)
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
  <div class="w-full min-h-screen surface-1" @click="capturePreviewClicks">
    <template v-if="isPreviewReady">
       <component
         :is="storeShellTemplates[activeTemplateKey]"
         :key="activeTemplateKey"
         :hideAnnouncementBar="false"
         :hideNavigation="false"
         :mobileHeaderHidden="false"
       >
         <component
           :is="homeTemplates[activeTemplateKey]"
           :tenantName="previewTenant?.name || 'My Store'"
           :featuredProducts="sampleProductsList"
           :bestSellerProducts="sampleProductsList"
           :pending="false"
         />
       </component>
    </template>
  </div>
</template>
