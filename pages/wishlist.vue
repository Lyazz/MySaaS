<script setup lang="ts">
import { productCardTemplates, wishlistTemplates, resolveTemplateKey } from '~/components/storefront/templates/registry'
import type { TemplateKey } from '~/components/storefront/templates/registry'

type Product = {
  id: string
  title: string
  slug: string
  description?: string | null
  price: string | number
  stock: number
  isActive: boolean
  images?: string[]
  productImages?: { url: string; isMain?: boolean; position?: number }[]
  categoryId?: string | null
  categoryIds?: string[]
  categories?: Array<{ id: string; title: string; slug: string }>
}

const storefrontContent = useStorefrontContent()
const storeSettings = useState<any>('storeSettings')
const route = useRoute()
// Mirror the store layout, which also honours preview_template. Without this,
// previewing a theme renders that theme's chrome around another theme's page.
const templateKey = computed<TemplateKey>(() => {
  if (route.query.preview_template) {
    return resolveTemplateKey(route.query.preview_template as string)
  }
  return resolveTemplateKey(storeSettings.value?.templateKey)
})
const favorites = useFavorites()

const productsUrl = useTenantApiUrl('/api/products')
const { data: products } = await useFetch<Product[]>(productsUrl, {
  headers: useTenantApiHeaders(),
  key: 'products-list-wishlist',
  default: () => []
})

const favoriteProducts = computed(() => {
  const ids = new Set(favorites.favoriteIds.value)
  return (products.value || []).filter((p) => ids.has(p.id) && p.isActive)
})

useTenantSeo({
  title: storefrontContent.value.wishlist.title,
  description: storefrontContent.value.wishlist.emptySubtitle
})

definePageMeta({
  middleware: 'tenant-only',
  layout: 'store'
})

const ProductCard = computed(() => productCardTemplates[templateKey.value])
// Presentation lives with the template so each theme can own this page.
// The card is passed down rather than imported by the wishlist components,
// which would import the registry back and make the cycle circular.
const Wishlist = computed(() => wishlistTemplates[templateKey.value])
</script>

<template>
  <component
    :is="Wishlist"
    :products="favoriteProducts"
    :card="ProductCard"
  />
</template>
