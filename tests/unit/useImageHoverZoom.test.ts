import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useImageHoverZoom } from '../../composables/useImageHoverZoom'

const createMouseEvent = (x: number, y: number, rect: DOMRect) => {
  const target = document.createElement('div')
  target.getBoundingClientRect = () => rect

  return {
    clientX: x,
    clientY: y,
    currentTarget: target
  } as unknown as MouseEvent
}

describe('useImageHoverZoom', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('computes bounded transform-origin percentages', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)

    const { onPointerMove, zoomStyle, isZoomActive } = useImageHoverZoom({ zoomScale: 2 })
    const rect = { left: 10, top: 20, width: 200, height: 100, right: 210, bottom: 120, x: 10, y: 20, toJSON: () => ({}) } as DOMRect

    onPointerMove(createMouseEvent(110, 70, rect))
    expect(isZoomActive.value).toBe(true)
    expect(zoomStyle.value.transformOrigin).toBe('50% 50%')
    expect(zoomStyle.value.transform).toBe('scale(2)')

    onPointerMove(createMouseEvent(-100, 500, rect))
    expect(zoomStyle.value.transformOrigin).toBe('0% 100%')
  })

  it('resets zoom state on pointer leave', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)

    const { onPointerMove, onPointerLeave, zoomStyle, isZoomActive } = useImageHoverZoom()
    const rect = { left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) } as DOMRect

    onPointerMove(createMouseEvent(75, 25, rect))
    expect(isZoomActive.value).toBe(true)
    expect(zoomStyle.value.transformOrigin).toBe('75% 25%')

    onPointerLeave()
    expect(isZoomActive.value).toBe(false)
    expect(zoomStyle.value.transformOrigin).toBe('50% 50%')
    expect(zoomStyle.value.transform).toBe('scale(1)')
  })

  it('does not activate zoom when disabled', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)

    const { onPointerMove, zoomStyle, isZoomActive } = useImageHoverZoom({ enabled: false })
    const rect = { left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) } as DOMRect

    onPointerMove(createMouseEvent(50, 50, rect))

    expect(isZoomActive.value).toBe(false)
    expect(zoomStyle.value.transformOrigin).toBe('50% 50%')
    expect(zoomStyle.value.transform).toBe('scale(1)')
  })
})
