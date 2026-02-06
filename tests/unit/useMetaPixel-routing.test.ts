import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useState } from '#imports'

describe('useMetaPixel routing', () => {
  beforeEach(async () => {
    ;(process as any).client = true
    ;(window as any).fbq = vi.fn()
    delete (window as any).__metaPixelInitialized
    delete (window as any).__metaPixelQueue
    if ((window as any).__metaPixelFlushTimer) {
      clearInterval((window as any).__metaPixelFlushTimer)
      ;(window as any).__metaPixelFlushTimer = null
    }

    useState<string | null>('facebookPixelId', () => null).value = '1234'
  })

  it('tracks PageView to the global pixel', async () => {
    const { useMetaPixel } = await import('../../composables/useMetaPixel')
    const metaPixel = useMetaPixel()

    metaPixel.pageView()

    const calls = ((window as any).fbq as any).mock.calls as any[][]
    expect(calls.some((c) => c[0] === 'trackSingle' && c[1] === '1234' && c[2] === 'PageView')).toBe(true)
  })

  it('tracks ViewContent only to product pixels when includeGlobal=false', async () => {
    const { useMetaPixel } = await import('../../composables/useMetaPixel')
    const metaPixel = useMetaPixel()

    metaPixel.viewContent({
      productId: 'p_1',
      value: 100,
      currency: 'DZD',
      contents: [{ id: 'p_1', quantity: 1, item_price: 100 }],
      pixelIds: ['000000'],
      includeGlobal: false
    })

    const calls = ((window as any).fbq as any).mock.calls as any[][]
    expect(calls.some((c) => c[0] === 'init' && c[1] === '000000')).toBe(true)
    expect(calls.some((c) => c[0] === 'trackSingle' && c[1] === '000000' && c[2] === 'ViewContent')).toBe(true)
    expect(calls.some((c) => c.includes('1234'))).toBe(false)
  })
})
