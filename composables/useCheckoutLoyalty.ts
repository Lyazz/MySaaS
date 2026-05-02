export const useCheckoutLoyalty = () => {
  const phone = useState<string>('checkout-loyalty-phone', () => '')
  const redeemPointsRequested = useState<number>('checkout-loyalty-redeem-points', () => 0)
  const availablePoints = useState<number>('checkout-loyalty-available-points', () => 0)
  const pendingRedeemPoints = useState<number>('checkout-loyalty-pending-points', () => 0)
  const basePointsToEarn = useState<number>('checkout-loyalty-base-points', () => 0)
  const productPointsToEarn = useState<number>('checkout-loyalty-product-points', () => 0)
  const totalPointsToEarn = useState<number>('checkout-loyalty-total-points', () => 0)
  const redeemedAmount = useState<number>('checkout-loyalty-redeemed-amount', () => 0)
  const summaryLoading = useState<boolean>('checkout-loyalty-summary-loading', () => false)
  const summaryError = useState<string>('checkout-loyalty-summary-error', () => '')

  const applySummary = (summary?: Partial<{
    availablePoints: number
    pendingRedeemPoints: number
    basePointsToEarn: number
    productPointsToEarn: number
    totalPointsToEarn: number
    redeemedAmount: number
  }> | null) => {
    availablePoints.value = Math.max(0, Number(summary?.availablePoints || 0))
    pendingRedeemPoints.value = Math.max(0, Number(summary?.pendingRedeemPoints || 0))
    basePointsToEarn.value = Number(summary?.basePointsToEarn || 0)
    productPointsToEarn.value = Number(summary?.productPointsToEarn || 0)
    totalPointsToEarn.value = Number(summary?.totalPointsToEarn || 0)
    redeemedAmount.value = Math.max(0, Number(summary?.redeemedAmount || 0))
  }

  const setRedeemPointsRequested = (value: unknown) => {
    const parsed = Math.trunc(Number(value || 0))
    redeemPointsRequested.value = Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  }

  const refreshSummary = async () => {
    const cartStore = useCartStore()
    if (!process.client || !cartStore.hasItems) {
      applySummary(null)
      summaryError.value = ''
      return
    }

    summaryLoading.value = true
    summaryError.value = ''

    try {
      const url = useTenantApiUrl('/api/orders/loyalty/summary')
      const rawPhone = phone.value.trim()
      const lookupPhone = rawPhone.replace(/\D+/g, '').length >= 9 ? rawPhone : ''
      const response = await $fetch<{
        availablePoints: number
        pendingRedeemPoints: number
        basePointsToEarn: number
        productPointsToEarn: number
        totalPointsToEarn: number
        redeemedAmount: number
        redeemError?: string | null
      }>(url, {
        method: 'POST',
        body: {
          customerPhone: lookupPhone || undefined,
          redeemPointsRequested: redeemPointsRequested.value || undefined,
          items: cartStore.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity
          }))
        },
        headers: {
          ...(useTenantApiHeaders() || {})
        }
      })

      applySummary(response)
      summaryError.value = response.redeemError || ''
    } catch (error: any) {
      applySummary(null)
      summaryError.value = error?.data?.statusMessage || error?.data?.message || 'Impossible de charger les points'
    } finally {
      summaryLoading.value = false
    }
  }

  const reset = () => {
    phone.value = ''
    redeemPointsRequested.value = 0
    applySummary(null)
    summaryError.value = ''
    summaryLoading.value = false
  }

  return {
    phone,
    redeemPointsRequested,
    availablePoints,
    pendingRedeemPoints,
    basePointsToEarn,
    productPointsToEarn,
    totalPointsToEarn,
    redeemedAmount,
    summaryLoading,
    summaryError,
    setRedeemPointsRequested,
    refreshSummary,
    reset
  }
}
