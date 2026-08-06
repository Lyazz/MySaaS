import { useCartStore } from '~/stores/cart'

export type ClearanceProductLike = {
    isClearance?: boolean
}

export const useClearanceDiscount = () => {
    const storeSettings = useState<any>('storeSettings')
    const cartStore = useCartStore()

    const config = computed(() => {
        const s = storeSettings.value || {}
        return {
            enabled: Boolean(s.clearanceEnabled),
            multiple: Number(s.clearanceMultiple) > 0 ? Number(s.clearanceMultiple) : 6,
            divisor: Number(s.clearanceDivisor) > 0 ? Number(s.clearanceDivisor) : 3,
            appliesToAll: s.clearanceAppliesToAllProducts !== false
        }
    })

    const isProductEligible = (product?: ClearanceProductLike | null): boolean => {
        if (!config.value.enabled) return false
        if (config.value.appliesToAll) return true
        return Boolean(product?.isClearance)
    }

    const isCartItemEligible = (item: { isClearance?: boolean; promotionApplied?: boolean; bundleDeals?: unknown[] }): boolean => {
        if (!config.value.enabled) return false
        const eligibleProduct = config.value.appliesToAll ? true : Boolean(item.isClearance)
        const hasBundle = Array.isArray(item.bundleDeals) && item.bundleDeals.length > 0
        return eligibleProduct && !item.promotionApplied && !hasBundle
    }

    const eligibleQuantityInCart = computed(() =>
        cartStore.items
            .filter((item) => isCartItemEligible(item))
            .reduce((sum, item) => sum + item.quantity, 0)
    )

    const remainingForNextThreshold = computed(() => {
        if (!config.value.enabled) return 0
        const mod = eligibleQuantityInCart.value % config.value.multiple
        if (eligibleQuantityInCart.value > 0 && mod === 0) return 0
        return config.value.multiple - mod
    })

    const discountAmount = computed(() => cartStore.clearanceDiscount)

    return {
        config,
        isProductEligible,
        isCartItemEligible,
        eligibleQuantityInCart,
        remainingForNextThreshold,
        discountAmount
    }
}
