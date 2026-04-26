import { useTenantApiHeaders, useTenantApiUrl } from '~/composables/useTenantApi'

type TemplateKey =
  | 'classic'
  | 'modern'
  | 'interior'
  | 'minimal'
  | 'street'
  | 'cozy'
  | 'cyber'
  | 'stationnery'
  | 'food'
  | 'wellness'
  | 'playful'
  | 'activewear'
  | 'chrono'
  | 'maison'

const TEMPLATE_KEYS: TemplateKey[] = [
  'classic',
  'modern',
  'interior',
  'minimal',
  'street',
  'cozy',
  'cyber',
  'stationnery',
  'food',
  'wellness',
  'playful',
  'activewear',
  'chrono',
  'maison'
]

const resolveTemplateKey = (value?: string | null): TemplateKey => {
  if (typeof value === 'string' && TEMPLATE_KEYS.includes(value as TemplateKey)) {
    return value as TemplateKey
  }
  return 'modern'
}

type ProductLike = {
  id?: string
  title?: string | null
  slug?: string | null
  price?: number | string | null
  hasVariants?: boolean | null
  variants?: any[] | null
  images?: string[] | null
  productImages?: Array<{ url?: string; isMain?: boolean }> | null
  bundleDeals?: any[] | null
  metaPixelIds?: string[] | null
  isPromotionActive?: boolean | null
  promotionalPrice?: number | string | null
  promotionStartDate?: string | Date | null
  promotionEndDate?: string | Date | null
}

export type ProductCardVariantModalItem = {
  id: string
  label: string
  price: number
  stock: number
  trackInventory: boolean
  inStock: boolean
  imageUrl?: string
}

type VariantGuardDeps = {
  fetchProductBySlug?: (slug: string) => Promise<any>
}

const hasSelectableVariants = (variants: unknown): boolean => {
  if (!Array.isArray(variants)) return false
  return variants.some((variant: any) => {
    const values = Array.isArray(variant?.optionValues) ? variant.optionValues : []
    return values.length > 0
  })
}

const defaultFetchProductBySlug = async (slug: string) => {
  return await $fetch<any>(useTenantApiUrl(`/api/products/${encodeURIComponent(slug)}`), {
    headers: {
      ...(useTenantApiHeaders() || {})
    }
  })
}

const resolveFallbackImage = (product: ProductLike | null | undefined): string | undefined => {
  const productImages = Array.isArray(product?.productImages) ? product?.productImages : []
  if (productImages.length > 0) {
    const main = productImages.find((img) => img?.isMain)
    const url = main?.url || productImages[0]?.url
    if (typeof url === 'string' && url.trim().length > 0) return url
  }

  const images = Array.isArray(product?.images) ? product.images : []
  if (images.length > 0 && typeof images[0] === 'string' && images[0].trim().length > 0) {
    return images[0]
  }

  return undefined
}

const buildVariantLabel = (variant: any, optionPosition: Map<string, number>): string => {
  const values = Array.isArray(variant?.optionValues) ? [...variant.optionValues] : []
  values.sort((a: any, b: any) => {
    const posA = optionPosition.get(String(a?.optionValue?.optionId || '')) ?? 999
    const posB = optionPosition.get(String(b?.optionValue?.optionId || '')) ?? 999
    return posA - posB
  })

  return values
    .map((entry: any) => entry?.optionValue?.label)
    .filter((label: unknown): label is string => typeof label === 'string' && label.trim().length > 0)
    .join(' / ')
}

const normalizeVariants = (detail: any): ProductCardVariantModalItem[] => {
  const options = Array.isArray(detail?.options) ? detail.options : []
  const optionPosition = new Map(
    options.map((opt: any) => [String(opt?.id || ''), Number(opt?.position ?? 0)])
  )

  const variants = Array.isArray(detail?.variants) ? detail.variants : []
  return variants
    .map((variant: any) => {
      const label = buildVariantLabel(variant, optionPosition)
      const trackInventory = variant?.trackInventory !== false
      const rawStock = Number(variant?.stock ?? 0)
      const inStock = !trackInventory || rawStock > 0
      const variantImage = Array.isArray(variant?.images) ? variant.images[0]?.image?.url : undefined

      return {
        id: String(variant?.id || ''),
        label,
        price: Number(variant?.price ?? detail?.price ?? 0),
        stock: trackInventory ? Math.max(0, rawStock) : 9999,
        trackInventory,
        inStock,
        imageUrl: typeof variantImage === 'string' ? variantImage : undefined
      } satisfies ProductCardVariantModalItem
    })
    .filter((variant) => variant.id.length > 0 && variant.label.length > 0)
}

export const useProductCardVariantModalState = () => {
  const open = useState<boolean>('productCardVariantModal:open', () => false)
  const loading = useState<boolean>('productCardVariantModal:loading', () => false)
  const error = useState<string>('productCardVariantModal:error', () => '')
  const productId = useState<string>('productCardVariantModal:productId', () => '')
  const productTitle = useState<string>('productCardVariantModal:productTitle', () => '')
  const productSlug = useState<string>('productCardVariantModal:productSlug', () => '')
  const fallbackImage = useState<string>('productCardVariantModal:fallbackImage', () => '')
  const bundleDeals = useState<any[]>('productCardVariantModal:bundleDeals', () => [])
  const metaPixelIds = useState<string[]>('productCardVariantModal:metaPixelIds', () => [])
  const templateKey = useState<TemplateKey>('productCardVariantModal:templateKey', () => 'modern')
  const variants = useState<ProductCardVariantModalItem[]>('productCardVariantModal:variants', () => [])
  const pricingContext = useState<any>('productCardVariantModal:pricingContext', () => null)

  const close = () => {
    open.value = false
    loading.value = false
    error.value = ''
    variants.value = []
    pricingContext.value = null
  }

  return {
    open,
    loading,
    error,
    productId,
    productTitle,
    productSlug,
    fallbackImage,
    bundleDeals,
    metaPixelIds,
    templateKey,
    variants,
    pricingContext,
    close
  }
}

export function useProductCardVariantGuard(deps: VariantGuardDeps = {}) {
  const fetchProductBySlug = deps.fetchProductBySlug || defaultFetchProductBySlug
  const modal = useProductCardVariantModalState()
  const storeSettings = useState<any>('storeSettings')

  return async (product: ProductLike | null | undefined): Promise<boolean> => {
    if (!process.client) return false

    const slug = typeof product?.slug === 'string' ? product.slug.trim() : ''
    if (!slug) return false

    if (product?.hasVariants === false) {
      return false
    }

    const expectsVariants = product?.hasVariants === true || hasSelectableVariants(product?.variants)

    modal.open.value = false
    modal.error.value = ''
    modal.loading.value = true
    modal.productId.value = typeof product?.id === 'string' ? product.id : ''
    modal.productTitle.value = typeof product?.title === 'string' ? product.title : ''
    modal.productSlug.value = slug
    modal.fallbackImage.value = resolveFallbackImage(product) || ''
    modal.bundleDeals.value = Array.isArray(product?.bundleDeals) ? product.bundleDeals : []
    modal.metaPixelIds.value = Array.isArray(product?.metaPixelIds) ? product.metaPixelIds.filter((id): id is string => typeof id === 'string') : []
    modal.pricingContext.value = {
      isPromotionActive: product?.isPromotionActive === true,
      promotionalPrice: product?.promotionalPrice ?? null,
      promotionStartDate: product?.promotionStartDate ?? null,
      promotionEndDate: product?.promotionEndDate ?? null
    }
    modal.templateKey.value = resolveTemplateKey(storeSettings.value?.templateKey)

    try {
      const detail = await fetchProductBySlug(slug)
      const modalItems = normalizeVariants(detail)

      if (modalItems.length === 0) {
        modal.close()
        return false
      }

      modal.productId.value = typeof detail?.id === 'string' ? detail.id : modal.productId.value
      modal.productTitle.value = typeof detail?.title === 'string' ? detail.title : modal.productTitle.value
      modal.productSlug.value = typeof detail?.slug === 'string' ? detail.slug : modal.productSlug.value
      modal.fallbackImage.value = resolveFallbackImage(detail) || modal.fallbackImage.value
      if (Array.isArray(detail?.bundleDeals)) modal.bundleDeals.value = detail.bundleDeals
      if (Array.isArray(detail?.metaPixelIds)) {
        modal.metaPixelIds.value = detail.metaPixelIds.filter((id: unknown): id is string => typeof id === 'string')
      }
      modal.pricingContext.value = {
        isPromotionActive: detail?.isPromotionActive === true,
        promotionalPrice: detail?.promotionalPrice ?? null,
        promotionStartDate: detail?.promotionStartDate ?? null,
        promotionEndDate: detail?.promotionEndDate ?? null
      }
      modal.variants.value = modalItems
      modal.error.value = ''
      modal.open.value = true
      return true
    } catch {
      if (!expectsVariants) {
        modal.close()
        return false
      }

      modal.variants.value = []
      modal.error.value = 'Impossible de charger les variantes.'
      modal.open.value = true
      return true
    } finally {
      modal.loading.value = false
    }
  }
}
