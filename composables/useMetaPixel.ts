type MetaPixelEventName = 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase'

type MetaPixelContent = {
  id: string
  quantity?: number
  item_price?: number
}

type MetaPixelTrackParams = Record<string, unknown>

type QueuedCall = { kind: 'fbq'; args: any[] }

const MAX_QUEUE = 50
const FLUSH_INTERVAL_MS = 250
const MAX_FLUSH_ATTEMPTS = 120

const getQueue = (): QueuedCall[] => {
  const w = window as any
  if (!Array.isArray(w.__metaPixelQueue)) w.__metaPixelQueue = []
  return w.__metaPixelQueue as QueuedCall[]
}

const scheduleFlush = () => {
  const w = window as any
  if (w.__metaPixelFlushTimer) return

  let attempts = 0
  w.__metaPixelFlushTimer = window.setInterval(() => {
    attempts += 1
    const fbq = (window as any).fbq
    if (typeof fbq === 'function') {
      const queue = getQueue()
      while (queue.length) {
        const next = queue.shift()!
        fbq(...next.args)
      }
      clearInterval(w.__metaPixelFlushTimer)
      w.__metaPixelFlushTimer = null
      return
    }

    if (attempts >= MAX_FLUSH_ATTEMPTS) {
      clearInterval(w.__metaPixelFlushTimer)
      w.__metaPixelFlushTimer = null
    }
  }, FLUSH_INTERVAL_MS)
}

const enqueue = (call: QueuedCall) => {
  const queue = getQueue()
  queue.push(call)
  if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE)
  scheduleFlush()
}

export const useMetaPixel = () => {
  const getGlobalPixelId = () => {
    const id = useState<string | null>('facebookPixelId').value
    return typeof id === 'string' && /^[0-9]+$/.test(id) ? id : null
  }

  const normalizePixelIds = (pixelIds?: string[]) =>
    Array.from(new Set((Array.isArray(pixelIds) ? pixelIds : []).filter((id) => typeof id === 'string' && /^[0-9]+$/.test(id))))

  const getInitializedSet = (): Set<string> => {
    const w = window as any
    if (!w.__metaPixelInitialized) w.__metaPixelInitialized = new Set()
    return w.__metaPixelInitialized as Set<string>
  }

  const fbqCall = (...args: any[]) => {
    if (!process.client) return
    const fbq = (window as any).fbq
    if (typeof fbq === 'function') return fbq(...args)
    enqueue({ kind: 'fbq', args })
  }

  const ensureInit = (pixelIds: string[]) => {
    if (!process.client) return
    const set = getInitializedSet()
    pixelIds.forEach((id) => {
      if (!id || !/^[0-9]+$/.test(id)) return
      if (set.has(id)) return
      set.add(id)
      fbqCall('init', id)
    })
  }

  const trackPixels = (pixelIds: string[], event: MetaPixelEventName, params?: MetaPixelTrackParams) => {
    const ids = normalizePixelIds(pixelIds)
    if (!ids.length) return
    ensureInit(ids)
    ids.forEach((id) => fbqCall('trackSingle', id, event, params))
  }

  const resolveRoutedPixelIds = (pixelIds?: string[], includeGlobal?: boolean) => {
    const global = getGlobalPixelId()
    const extras = normalizePixelIds(pixelIds).filter((id) => id !== global)
    const shouldIncludeGlobal = includeGlobal ?? extras.length === 0
    return shouldIncludeGlobal && global ? [global, ...extras] : extras
  }

  const pageView = (input?: { pixelIds?: string[]; includeGlobal?: boolean }) => {
    trackPixels(resolveRoutedPixelIds(input?.pixelIds, input?.includeGlobal), 'PageView')
  }

  const viewContent = (input: {
    productId: string
    value?: number
    currency?: string
    contents?: MetaPixelContent[]
    pixelIds?: string[]
    includeGlobal?: boolean
  }) => {
    const params = {
      content_type: 'product',
      content_ids: [input.productId],
      contents: input.contents,
      value: input.value,
      currency: input.currency
    }
    trackPixels(resolveRoutedPixelIds(input.pixelIds, input.includeGlobal), 'ViewContent', params)
  }

  const addToCart = (input: {
    productId: string
    value?: number
    currency?: string
    quantity?: number
    itemPrice?: number
    pixelIds?: string[]
    includeGlobal?: boolean
  }) => {
    const qty = Number(input.quantity || 1)
    const itemPrice = input.itemPrice != null ? Number(input.itemPrice) : undefined
    const contents: MetaPixelContent[] = [{ id: input.productId, quantity: qty, item_price: itemPrice }]
    const params = {
      content_type: 'product',
      content_ids: [input.productId],
      contents,
      value: input.value,
      currency: input.currency
    }
    trackPixels(resolveRoutedPixelIds(input.pixelIds, input.includeGlobal), 'AddToCart', params)
  }

  const initiateCheckout = (input: {
    contents: MetaPixelContent[]
    value?: number
    currency?: string
    numItems?: number
    pixelIds?: string[]
    includeGlobal?: boolean
  }) => {
    const params = {
      contents: input.contents,
      content_type: 'product',
      num_items: input.numItems,
      value: input.value,
      currency: input.currency
    }
    trackPixels(resolveRoutedPixelIds(input.pixelIds, input.includeGlobal), 'InitiateCheckout', params)
  }

  const purchase = (input: {
    orderId?: string
    contents: MetaPixelContent[]
    value?: number
    currency?: string
    pixelIds?: string[]
    includeGlobal?: boolean
  }) => {
    const params = {
      contents: input.contents,
      content_type: 'product',
      value: input.value,
      currency: input.currency,
      order_id: input.orderId
    }
    trackPixels(resolveRoutedPixelIds(input.pixelIds, input.includeGlobal), 'Purchase', params)
  }

  return {
    pageView,
    viewContent,
    addToCart,
    initiateCheckout,
    purchase
  }
}
