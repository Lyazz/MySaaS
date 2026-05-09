<script setup lang="ts">
import {
  homeTemplates,
  productCardTemplates,
  resolveTemplateKey,
  shopTemplates,
  storeShellTemplates,
  themeProviderTemplates,
  type TemplateKey
} from '~/components/storefront/templates/registry'
import type { StorefrontHomeConfig } from '~/shared/storefront/homepage'

type Surface = 'home' | 'shop' | 'cards' | 'shell'
type HeaderStyle = 'full' | 'quiet' | 'minimal'
type ProductView = 'grid' | 'list' | 'promo'
type BackgroundStyle = 'theme' | 'plain' | 'contrast'

definePageMeta({
  layout: false,
  middleware: 'auth'
})

const route = useRoute()

const sampleCategories = [
  {
    id: 'cat-fashion',
    title: 'New Collection',
    slug: 'new-collection',
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=900&auto=format&fit=crop',
    _count: { products: 24 }
  },
  {
    id: 'cat-accessories',
    title: 'Accessories',
    slug: 'accessories',
    imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=900&auto=format&fit=crop',
    _count: { products: 18 }
  },
  {
    id: 'cat-home',
    title: 'Home Edit',
    slug: 'home-edit',
    imageUrl: 'https://images.unsplash.com/photo-1618220179428-22790b461013?q=80&w=900&auto=format&fit=crop',
    _count: { products: 14 }
  },
  {
    id: 'cat-wellness',
    title: 'Daily Rituals',
    slug: 'daily-rituals',
    imageUrl: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?q=80&w=900&auto=format&fit=crop',
    _count: { products: 9 }
  }
]

const baseProducts = [
  {
    id: 'preview-1',
    title: 'Linen wrap blazer',
    slug: 'linen-wrap-blazer',
    price: 12900,
    promotionalPrice: 9900,
    isPromotionActive: true,
    promotionStartDate: '2026-01-01',
    promotionEndDate: '2026-12-31',
    showCountdown: true,
    stock: 12,
    isActive: true,
    categoryId: 'cat-fashion',
    categoryIds: ['cat-fashion'],
    category: { title: 'New Collection' },
    images: ['https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=900&auto=format&fit=crop'],
    productImages: [{ url: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=900&auto=format&fit=crop' }],
    description: 'Structured tailoring with a soft retail-ready finish.'
  },
  {
    id: 'preview-2',
    title: 'Soft leather tote',
    slug: 'soft-leather-tote',
    price: 8400,
    stock: 4,
    isActive: true,
    categoryId: 'cat-accessories',
    categoryIds: ['cat-accessories'],
    category: { title: 'Accessories' },
    images: ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=900&auto=format&fit=crop'],
    productImages: [{ url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=900&auto=format&fit=crop' }],
    description: 'A daily carry piece with premium texture.'
  },
  {
    id: 'preview-3',
    title: 'Ceramic table lamp',
    slug: 'ceramic-table-lamp',
    price: 11800,
    stock: 8,
    isActive: true,
    categoryId: 'cat-home',
    categoryIds: ['cat-home'],
    category: { title: 'Home Edit' },
    images: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=900&auto=format&fit=crop'],
    productImages: [{ url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=900&auto=format&fit=crop' }],
    description: 'Warm ambient lighting for a curated room.'
  },
  {
    id: 'preview-4',
    title: 'Botanical body oil',
    slug: 'botanical-body-oil',
    price: 3900,
    stock: 20,
    isActive: true,
    categoryId: 'cat-wellness',
    categoryIds: ['cat-wellness'],
    category: { title: 'Daily Rituals' },
    images: ['https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=900&auto=format&fit=crop'],
    productImages: [{ url: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=900&auto=format&fit=crop' }],
    description: 'A clean beauty staple with a refined shelf presence.'
  }
]

const templateKey = computed<TemplateKey>(() => resolveTemplateKey(route.query.template as string | undefined))
const surface = computed<Surface>(() => parseChoice(route.query.surface, ['home', 'shop', 'cards', 'shell'], 'home'))
const headerStyle = computed<HeaderStyle>(() => parseChoice(route.query.header, ['full', 'quiet', 'minimal'], 'full'))
const productView = computed<ProductView>(() => parseChoice(route.query.productView, ['grid', 'list', 'promo'], 'grid'))
const backgroundStyle = computed<BackgroundStyle>(() => parseChoice(route.query.background, ['theme', 'plain', 'contrast'], 'theme'))

const primaryColor = computed(() => parseHex(route.query.primary, '#0D9488'))
const accentColor = computed(() => parseHex(route.query.accent, '#99F6E4'))
const buttonRadius = computed(() => `${clampNumber(route.query.buttonRadius, 0, 32, 12)}px`)
const cardRadius = computed(() => `${clampNumber(route.query.cardRadius, 0, 44, 22)}px`)

const fontFamily = computed(() => {
  switch (route.query.font) {
    case 'sans':
      return "'DM Sans', system-ui, sans-serif"
    case 'editorial':
      return "'Playfair Display', Georgia, serif"
    case 'rounded':
      return "'Nunito', system-ui, sans-serif"
    default:
      return ''
  }
})

const brandRgb = computed(() => hexToRgb(primaryColor.value))
const activeShell = computed(() => storeShellTemplates[templateKey.value])
const activeHome = computed(() => homeTemplates[templateKey.value])
const activeShop = computed(() => shopTemplates[templateKey.value])
const activeProductCard = computed(() => productCardTemplates[templateKey.value])
const activeThemeProvider = computed(() => themeProviderTemplates[templateKey.value])

const previewProducts = computed(() => {
  if (productView.value !== 'promo') return baseProducts
  return baseProducts.map((product, index) => ({
    ...product,
    isPromotionActive: index < 3,
    promotionalPrice: Math.round(Number(product.price) * 0.76),
    showCountdown: index === 0,
    promotionStartDate: '2026-01-01',
    promotionEndDate: '2026-12-31'
  }))
})

const homeConfig = computed<StorefrontHomeConfig>(() => ({
  carousel: [
    {
      title: 'Curated storefront, ready to sell',
      subtitle: 'A live preview powered by the selected template family.',
      buttonText: 'Shop now',
      buttonHref: '/products',
      imageUrl: heroImageForTemplate(templateKey.value)
    },
    {
      title: 'Products styled your way',
      subtitle: 'Colors, radius, type, cards, and shell states can be tested here.',
      buttonText: 'Browse collection',
      buttonHref: '/products',
      imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1800&auto=format&fit=crop'
    }
  ],
  sections: {
    browseByCategory: { enabled: true, eyebrow: 'Collections', title: 'Browse by category' },
    newArrivals: { enabled: true, eyebrow: 'New arrivals', title: 'Featured products', limit: 8 },
    bestSellers: { enabled: true, eyebrow: 'Best sellers', title: 'Most requested', limit: 8 }
  }
}))

const previewStyle = computed(() => ({
  '--builder-brand': primaryColor.value,
  '--builder-brand-rgb': brandRgb.value,
  '--builder-accent': accentColor.value,
  '--builder-button-radius': buttonRadius.value,
  '--builder-card-radius': cardRadius.value,
  '--builder-font-family': fontFamily.value || 'inherit'
}))

const shellProps = computed(() => ({
  hideAnnouncementBar: headerStyle.value !== 'full',
  hideNavigation: headerStyle.value === 'minimal',
  mobileHeaderHidden: false
}))

const ready = ref(false)

const tenant = useState<any>('tenant')
const storeSettings = useState<any>('storeSettings')
const contactInfos = useState<any[]>('contactInfos', () => [])

watchEffect(() => {
  tenant.value = {
    id: 'preview-tenant',
    name: 'Sahara Studio',
    slug: 'sahara-studio',
    isOffline: false
  }

  storeSettings.value = {
    id: 'preview-settings',
    name: 'Sahara Studio',
    slug: 'sahara-studio',
    templateKey: templateKey.value,
    primaryColor: primaryColor.value,
    logoUrl: null,
    faviconUrl: null,
    cartEnabled: true,
    description: 'A premium preview store for testing storefront templates.',
    currency: 'DZD'
  }

  contactInfos.value = [
    { id: 'phone', kind: 'phone', value: '+213 555 123 456', isActive: true, position: 1 },
    { id: 'email', kind: 'email', value: 'hello@sahara.test', isActive: true, position: 2 },
    { id: 'instagram', kind: 'instagram', value: 'sahara.studio', isActive: true, position: 3 }
  ]
})

if (import.meta.client) {
  const originalFetch = window.fetch.bind(window)

  window.fetch = async (...args) => {
    const input = args[0]
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

    if (url.includes('/api/categories')) {
      return jsonResponse(sampleCategories)
    }

    if (url.includes('/api/products')) {
      return jsonResponse(previewProducts.value)
    }

    return originalFetch(...args)
  }

  onBeforeUnmount(() => {
    window.fetch = originalFetch
  })

  ready.value = true
}

function parseChoice<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : fallback
}

function parseHex(value: unknown, fallback: string) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(max, Math.max(min, numeric))
}

function hexToRgb(hex: string) {
  const value = hex.replace('#', '')
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(value)
  if (!result) return '13 148 136'
  return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

function heroImageForTemplate(key: TemplateKey) {
  const images: Partial<Record<TemplateKey, string>> = {
    street: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1800&auto=format&fit=crop',
    food: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1800&auto=format&fit=crop',
    cyber: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1800&auto=format&fit=crop',
    wellness: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?q=80&w=1800&auto=format&fit=crop',
    chrono: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=1800&auto=format&fit=crop',
    maison: 'https://images.unsplash.com/photo-1618220179428-22790b461013?q=80&w=1800&auto=format&fit=crop',
    activewear: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1800&auto=format&fit=crop',
    playful: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?q=80&w=1800&auto=format&fit=crop',
    stationnery: 'https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?q=80&w=1800&auto=format&fit=crop'
  }

  return images[key] || 'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1800&auto=format&fit=crop'
}

function capturePreviewClicks(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  const link = target?.closest('a')
  if (link) {
    event.preventDefault()
  }
}
</script>

<template>
  <div
    v-if="ready"
    class="builder-preview-theme"
    :class="[`bg-${backgroundStyle}`, { 'has-font-override': Boolean(fontFamily) }]"
    :style="previewStyle"
    @click.capture="capturePreviewClicks"
  >
    <component
      :is="activeShell"
      v-if="surface === 'home'"
      v-bind="shellProps"
    >
      <component
        :is="activeHome"
        tenant-name="Sahara Studio"
        :featured-products="previewProducts"
        :best-seller-products="previewProducts"
        :home-config="homeConfig"
        :pending="false"
      />
    </component>

    <component
      :is="activeShell"
      v-else-if="surface === 'shop'"
      v-bind="shellProps"
    >
      <component
        :is="activeShop"
        :products="previewProducts"
      />
    </component>

    <component
      :is="activeThemeProvider"
      v-else-if="surface === 'cards'"
    >
      <div class="cards-preview">
        <header>
          <span>Product cards</span>
          <h1>{{ productView === 'list' ? 'List variant' : productView === 'promo' ? 'Promotion variant' : 'Grid variant' }}</h1>
        </header>
        <div
          class="cards-grid"
          :class="{ 'is-list': productView === 'list' }"
        >
          <component
            :is="activeProductCard"
            v-for="product in previewProducts"
            :key="product.id"
            :product="product"
            :view-mode="productView === 'list' ? 'list' : 'grid'"
          />
        </div>
      </div>
    </component>

    <component
      :is="activeShell"
      v-else
      v-bind="shellProps"
    >
      <div class="shell-preview">
        <span>Shell preview</span>
        <h1>Sahara Studio</h1>
        <p>The selected template shell renders the real header, navigation, announcement behavior, and footer around this neutral test content.</p>
      </div>
    </component>
  </div>
</template>

<style scoped>
.builder-preview-theme {
  min-height: 100vh;
  background: #fff;
}

.builder-preview-theme.bg-plain {
  background: #fff;
}

.builder-preview-theme.bg-contrast {
  background:
    radial-gradient(circle at top left, rgba(var(--builder-brand-rgb), 0.22), transparent 32%),
    #09090b;
}

.builder-preview-theme :deep([style*="--brand"]) {
  --brand: var(--builder-brand) !important;
  --brand-rgb: var(--builder-brand-rgb) !important;
}

.builder-preview-theme :deep([class*="bg-brand"]) {
  background-color: var(--builder-brand) !important;
}

.builder-preview-theme :deep([class*="text-brand"]) {
  color: var(--builder-brand) !important;
}

.builder-preview-theme :deep([class*="border-brand"]) {
  border-color: var(--builder-brand) !important;
}

.builder-preview-theme.has-font-override,
.builder-preview-theme.has-font-override :deep(*) {
  font-family: var(--builder-font-family) !important;
}

.builder-preview-theme :deep(a[class*="rounded"]),
.builder-preview-theme :deep(button[class*="rounded"]),
.builder-preview-theme :deep(.at-btn),
.builder-preview-theme :deep(.atelier-cta),
.builder-preview-theme :deep(.pc__hover-btn) {
  border-radius: var(--builder-button-radius) !important;
}

.builder-preview-theme :deep(article),
.builder-preview-theme :deep([class*="rounded-2xl"]),
.builder-preview-theme :deep([class*="rounded-3xl"]),
.builder-preview-theme :deep([class*="rounded-[2rem]"]),
.builder-preview-theme :deep([class*="rounded-[2.5rem]"]),
.builder-preview-theme :deep(.pc),
.builder-preview-theme :deep(.pc__img-wrap),
.builder-preview-theme :deep(.shop__product-card) {
  border-radius: var(--builder-card-radius) !important;
}

.cards-preview {
  min-height: 100vh;
  padding: 56px 28px;
  background:
    radial-gradient(circle at 12% 8%, rgba(var(--builder-brand-rgb), 0.14), transparent 28%),
    color-mix(in srgb, var(--builder-accent) 10%, #ffffff);
}

.bg-contrast .cards-preview {
  background: transparent;
}

.cards-preview header {
  max-width: 1180px;
  margin: 0 auto 28px;
}

.cards-preview header span,
.shell-preview span {
  color: var(--builder-brand);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.cards-preview header h1,
.shell-preview h1 {
  margin-top: 8px;
  color: currentColor;
  font-size: 42px;
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 22px;
  max-width: 1180px;
  margin: 0 auto;
}

.cards-grid.is-list {
  grid-template-columns: 1fr;
  max-width: 880px;
}

.shell-preview {
  min-height: 520px;
  display: grid;
  align-content: center;
  justify-items: center;
  padding: 48px 24px;
  text-align: center;
}

.shell-preview p {
  max-width: 58ch;
  margin-top: 14px;
  color: currentColor;
  opacity: 0.68;
  font-size: 16px;
  line-height: 1.65;
}

@media (max-width: 900px) {
  .cards-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .cards-preview {
    padding: 40px 16px;
  }

  .cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>
