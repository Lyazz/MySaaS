const IOS_TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel', 'password', 'number'])

const isIOSDevice = () => {
  const userAgent = navigator.userAgent || ''
  return /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && navigator.maxTouchPoints > 1)
}

const isTextEntryField = (target: EventTarget | Element | null): target is HTMLInputElement | HTMLTextAreaElement => {
  if (!target) return false
  if (target instanceof HTMLTextAreaElement) return true
  if (!(target instanceof HTMLInputElement)) return false
  const type = (target.getAttribute('type') || 'text').toLowerCase()
  return IOS_TEXT_INPUT_TYPES.has(type)
}

const withMaximumScale = (viewportContent: string, maxScale = '1') => {
  const parts = viewportContent
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !/^maximum-scale\s*=/.test(part))
    .filter((part) => !/^user-scalable\s*=/.test(part))
  parts.push(`maximum-scale=${maxScale}`)
  parts.push('user-scalable=no')
  return parts.join(', ')
}

export default defineNuxtPlugin(() => {
  if (!isIOSDevice()) return

  const viewportMeta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
  if (!viewportMeta) return

  let previousViewportContent: string | null = null

  const applyFocusViewport = () => {
    if (previousViewportContent !== null) return
    previousViewportContent = viewportMeta.getAttribute('content') || ''
    viewportMeta.setAttribute('content', withMaximumScale(previousViewportContent))
  }

  const restoreViewport = () => {
    if (previousViewportContent === null) return
    viewportMeta.setAttribute('content', previousViewportContent)
    previousViewportContent = null
  }

  const onFocusIn = (event: FocusEvent) => {
    if (!isTextEntryField(event.target)) return
    applyFocusViewport()
  }

  const onPointerDown = (event: PointerEvent | TouchEvent | MouseEvent) => {
    if (!isTextEntryField(event.target)) return
    applyFocusViewport()
  }

  const onFocusOut = () => {
    window.setTimeout(() => {
      if (isTextEntryField(document.activeElement)) return
      restoreViewport()
    }, 0)
  }

  document.addEventListener('pointerdown', onPointerDown, true)
  document.addEventListener('touchstart', onPointerDown, true)
  document.addEventListener('mousedown', onPointerDown, true)
  document.addEventListener('focusin', onFocusIn, true)
  document.addEventListener('focusout', onFocusOut, true)
})
