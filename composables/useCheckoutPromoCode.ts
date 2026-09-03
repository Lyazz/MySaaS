/**
 * Promo code ("code promo") state for the storefront checkout.
 *
 * The server owns the maths: this only carries what the shopper typed, asks
 * `/api/orders/promo-code/preview` what it is worth, and holds the answer so
 * the totals and the order payload agree. The code is re-checked whenever the
 * cart changes, so a discount can never outlive the cart it was priced against.
 */
export const useCheckoutPromoCode = () => {
  const codeInput = useState<string>('checkout-promo-code-input', () => '')
  const appliedCode = useState<string>('checkout-promo-code-applied', () => '')
  const discountAmount = useState<number>('checkout-promo-code-discount', () => 0)
  const discountType = useState<string>('checkout-promo-code-type', () => '')
  const checking = useState<boolean>('checkout-promo-code-checking', () => false)
  const errorMessage = useState<string>('checkout-promo-code-error', () => '')
  const phone = useState<string>('checkout-promo-code-phone', () => '')

  const applied = computed(() => Boolean(appliedCode.value))
  const freeShipping = computed(() => discountType.value === 'FREE_SHIPPING')

  const clear = () => {
    appliedCode.value = ''
    discountAmount.value = 0
    discountType.value = ''
    errorMessage.value = ''
  }

  const reset = () => {
    clear()
    codeInput.value = ''
    checking.value = false
  }

  // Resolved here, in setup, rather than inside the async handlers that read them.
  const content = useStorefrontContent()
  const { currencyCode } = useCurrency()

  /**
   * The server refuses in English — that wording is what logs, the admin and API
   * clients see. The shopper gets the storefront's own sentence for the same
   * reason, falling back to the server text for a reason this build predates.
   *
   * Never throws: a missing translation must not turn a refusal into a crash.
   */
  const localizeRefusal = (reason?: string | null, serverMessage?: string | null, meta?: any) => {
    try {
      const copy = content.value?.checkout?.coupon
      const messages = copy?.errors as Record<string, any> | undefined
      const entry = reason ? messages?.[reason] : undefined

      if (typeof entry === 'function') {
        return entry(Number(meta?.minOrderAmount ?? 0), currencyCode.value)
      }
      if (typeof entry === 'string') return entry

      return serverMessage || copy?.invalid || 'This promo code is not valid'
    } catch {
      return serverMessage || 'This promo code is not valid'
    }
  }

  const request = async (code: string) => {
    const cartStore = useCartStore()
    const url = useTenantApiUrl('/api/orders/promo-code/preview')

    return $fetch<{
      valid: boolean
      code: string
      discountType?: string
      discountAmount: number
      shippingDiscount: number
      message?: string | null
      reason?: string | null
      meta?: Record<string, unknown> | null
    }>(url, {
      method: 'POST',
      body: {
        code,
        customerPhone: phone.value.trim() || undefined,
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
  }

  /** Applies whatever is in the input. Returns true when a discount was granted. */
  const apply = async (fallbackError?: string) => {
    const code = codeInput.value.trim()
    if (!code) {
      clear()
      return false
    }

    const cartStore = useCartStore()
    if (!cartStore.hasItems) {
      clear()
      return false
    }

    checking.value = true
    errorMessage.value = ''

    try {
      const response = await request(code)

      if (!response?.valid) {
        clear()
        errorMessage.value =
          localizeRefusal(response?.reason, response?.message, response?.meta) ||
          fallbackError ||
          'This promo code is not valid'
        return false
      }

      appliedCode.value = response.code
      discountType.value = response.discountType || ''
      discountAmount.value = Math.max(0, Number(response.discountAmount || 0))
      errorMessage.value = ''
      return true
    } catch (error: any) {
      clear()
      errorMessage.value =
        error?.data?.statusMessage ||
        error?.data?.message ||
        fallbackError ||
        'This promo code is not valid'
      return false
    } finally {
      checking.value = false
    }
  }

  /** Re-prices the applied code — silent, and drops it when it no longer holds. */
  const refresh = async () => {
    if (!appliedCode.value) return

    const cartStore = useCartStore()
    if (!cartStore.hasItems) {
      clear()
      return
    }

    try {
      const response = await request(appliedCode.value)
      if (!response?.valid) {
        const message = localizeRefusal(response?.reason, response?.message, response?.meta)
        clear()
        errorMessage.value = message
        return
      }
      discountType.value = response.discountType || ''
      discountAmount.value = Math.max(0, Number(response.discountAmount || 0))
    } catch {
      // A failed re-check must not silently keep a discount the server may refuse.
      clear()
    }
  }

  /**
   * Keeps the applied code honest while the shopper edits the cart. Call once,
   * from the checkout screen — every caller adds its own watcher.
   */
  const watchCart = () => {
    if (!process.client) return

    const cartStore = useCartStore()
    let timer: ReturnType<typeof setTimeout> | null = null

    watch(
      () => cartStore.items.map((item) => `${item.productId}:${item.variantId || ''}:${item.quantity}`).join('|'),
      () => {
        if (!appliedCode.value) return
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => { refresh() }, 250)
      }
    )

    onUnmounted(() => {
      if (timer) clearTimeout(timer)
    })
  }

  return {
    codeInput,
    appliedCode,
    discountAmount,
    discountType,
    checking,
    errorMessage,
    phone,
    applied,
    freeShipping,
    apply,
    refresh,
    watchCart,
    clear,
    reset
  }
}
