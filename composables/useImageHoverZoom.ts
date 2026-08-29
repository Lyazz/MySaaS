import { computed, ref, unref, type CSSProperties, type Ref } from 'vue'

type HoverZoomOptions = {
  zoomScale?: number
  enabled?: boolean | Ref<boolean>
}

const clampPercent = (value: number) => Math.min(100, Math.max(0, value))

const supportsDesktopHover = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

export function useImageHoverZoom(options: HoverZoomOptions = {}) {
  const zoomScale = options.zoomScale ?? 1.8
  const isZoomActive = ref(false)
  const originX = ref(50)
  const originY = ref(50)

  const isEnabled = computed(() => {
    const requested = options.enabled === undefined ? true : unref(options.enabled)
    return requested && supportsDesktopHover()
  })

  const zoomStyle = computed<CSSProperties>(() => ({
    transformOrigin: `${originX.value}% ${originY.value}%`,
    transform: isZoomActive.value && isEnabled.value ? `scale(${zoomScale})` : 'scale(1)',
    // Ease the scale briefly on the way in and out, but let the focal point
    // glide to the pointer rather than lurching in instant steps. Set inline
    // so it overrides any `transition-transform duration-*` class on the image.
    transition: 'transform 250ms ease-out, transform-origin 120ms ease-out',
    willChange: 'transform'
  }))

  const onPointerMove = (event: MouseEvent | PointerEvent) => {
    if (!isEnabled.value) return

    const target = event.currentTarget
    if (!(target instanceof HTMLElement)) return

    const rect = target.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return

    const x = clampPercent(((event.clientX - rect.left) / rect.width) * 100)
    const y = clampPercent(((event.clientY - rect.top) / rect.height) * 100)

    originX.value = x
    originY.value = y
    isZoomActive.value = true
  }

  const onPointerLeave = () => {
    isZoomActive.value = false
    originX.value = 50
    originY.value = 50
  }

  return {
    onPointerMove,
    onPointerLeave,
    zoomStyle,
    isZoomActive
  }
}
