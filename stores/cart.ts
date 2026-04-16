import { defineStore } from 'pinia'
import { computeBestBundleTotal, moneyToCents, centsToMoney } from '~/shared/pricing/bundle-pricing'
import { useMetaPixel } from '~/composables/useMetaPixel'

export type BundleDeal = {
    id?: string
    bundleQty: number
    bundlePrice: number | string
    tag?: string | null
}

export interface CartItem {
    productId: string
    variantId?: string
    title: string
    slug: string
    price: number
    quantity: number
    stock: number
    image?: string
    bundleDeals?: BundleDeal[]
    lineTotal?: number
    pricingBreakdown?: any
    metaPixelIds?: string[]
}

const computeLinePricing = (unitPrice: number, quantity: number, bundleDeals?: BundleDeal[]) => {
    const unitPriceCents = moneyToCents(Number(unitPrice) || 0)
    const deals = (bundleDeals || [])
        .map((d) => ({
            bundleQty: Number(d.bundleQty),
            bundlePriceCents: moneyToCents(Number(d.bundlePrice) || 0)
        }))
        .filter((d) => Number.isFinite(d.bundleQty) && d.bundleQty >= 2 && Number.isFinite(d.bundlePriceCents))

    const pricing = computeBestBundleTotal({
        quantity,
        unitPriceCents,
        bundleDeals: deals
    })

    return {
        lineTotal: centsToMoney(pricing.bestTotalCents),
        pricingBreakdown: pricing
    }
}

export const useCartStore = defineStore('cart', {
    state: () => ({
        items: [] as CartItem[]
    }),

    getters: {
        itemCount: (state) => state.items.reduce((sum, item) => sum + item.quantity, 0),

        total: (state) =>
            state.items.reduce((sum, item) => sum + (item.lineTotal ?? (item.price * item.quantity)), 0),

        hasItems: (state) => state.items.length > 0
    },

    actions: {
        syncCartCountCookie() {
            if (!process.client) return
            const cartItemCount = useCookie<number>('cart_item_count', { default: () => 0, path: '/' })
            cartItemCount.value = this.itemCount
        },

        addItem(product: Omit<CartItem, 'quantity'> & { quantity?: number }) {
            const metaPixel = useMetaPixel()
            const storeSettings = useState<any>('storeSettings')
            const currency = storeSettings.value?.currencyCode || 'DZD'
            const pixelIds = Array.isArray((product as any)?.metaPixelIds) ? ((product as any).metaPixelIds as string[]) : undefined
            const existingItem = this.items.find(item => {
                if (product.variantId) {
                    return item.variantId === product.variantId
                }
                return item.productId === product.productId && !item.variantId
            })

            if (existingItem) {
                const beforeTotal = existingItem.lineTotal ?? (existingItem.price * existingItem.quantity)
                const beforeQty = existingItem.quantity
                // Increase quantity if item exists, but don't exceed stock
                if (existingItem.quantity < product.stock) {
                    if (Array.isArray(product.bundleDeals) && product.bundleDeals.length > 0) {
                        existingItem.bundleDeals = product.bundleDeals
                    }
                    if (pixelIds && pixelIds.length) existingItem.metaPixelIds = pixelIds
                    existingItem.quantity += (product.quantity || 1)
                    // Ensure we don't exceed stock after addition
                    if (existingItem.quantity > product.stock) {
                        existingItem.quantity = product.stock
                    }
                    const pricing = computeLinePricing(existingItem.price, existingItem.quantity, existingItem.bundleDeals)
                    existingItem.lineTotal = pricing.lineTotal
                    existingItem.pricingBreakdown = pricing.pricingBreakdown
                    this.saveToLocalStorage()

                    const afterTotal = existingItem.lineTotal ?? (existingItem.price * existingItem.quantity)
                    const deltaQty = Math.max(0, existingItem.quantity - beforeQty)
                    const deltaValue = Math.max(0, afterTotal - beforeTotal)
                    if (deltaQty > 0) {
                        metaPixel.addToCart({
                            productId: existingItem.productId,
                            quantity: deltaQty,
                            itemPrice: existingItem.price,
                            value: deltaValue,
                            currency,
                            pixelIds: existingItem.metaPixelIds,
                            includeGlobal: !((existingItem.metaPixelIds || []).length)
                        })
                    }
                }
            } else {
                // Add new item with quantity (default 1)
                const next: CartItem = {
                    ...product,
                    quantity: product.quantity || 1,
                    bundleDeals: product.bundleDeals || [],
                    metaPixelIds: pixelIds
                }
                const pricing = computeLinePricing(next.price, next.quantity, next.bundleDeals)
                next.lineTotal = pricing.lineTotal
                next.pricingBreakdown = pricing.pricingBreakdown
                this.items.push(next)
                this.saveToLocalStorage()

                metaPixel.addToCart({
                    productId: next.productId,
                    quantity: next.quantity,
                    itemPrice: next.price,
                    value: next.lineTotal ?? (next.price * next.quantity),
                    currency,
                    pixelIds: next.metaPixelIds,
                    includeGlobal: !((next.metaPixelIds || []).length)
                })
            }
        },

        removeItem(productId: string, variantId?: string) {
            const index = this.items.findIndex(item => {
                if (variantId) return item.variantId === variantId
                return item.productId === productId && !item.variantId
            })
            if (index > -1) {
                this.items.splice(index, 1)
                this.saveToLocalStorage()
            }
        },

        updateQuantity(productId: string, quantity: number, variantId?: string) {
            const item = this.items.find(item => {
                if (variantId) return item.variantId === variantId
                return item.productId === productId && !item.variantId
            })
            if (item) {
                // Ensure quantity is between 1 and stock
                item.quantity = Math.max(1, Math.min(quantity, item.stock))
                const pricing = computeLinePricing(item.price, item.quantity, item.bundleDeals)
                item.lineTotal = pricing.lineTotal
                item.pricingBreakdown = pricing.pricingBreakdown
                this.saveToLocalStorage()
            }
        },

        clearCart() {
            this.items = []
            this.saveToLocalStorage()
        },

        saveToLocalStorage() {
            if (process.client) {
                localStorage.setItem('cart', JSON.stringify(this.items))
                this.syncCartCountCookie()
            }
        },

        loadFromLocalStorage() {
            if (process.client) {
                const savedCart = localStorage.getItem('cart')
                if (savedCart) {
                    try {
                        this.items = JSON.parse(savedCart)
                        // Backfill computed totals
                        this.items.forEach((item) => {
                            const pricing = computeLinePricing(item.price, item.quantity, item.bundleDeals)
                            item.lineTotal = pricing.lineTotal
                            item.pricingBreakdown = pricing.pricingBreakdown
                        })
                    } catch (error) {
                        console.error('Failed to load cart from localStorage:', error)
                        this.items = []
                    }
                }
                this.syncCartCountCookie()
            }
        }
    }
})
